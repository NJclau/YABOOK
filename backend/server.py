from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import uuid
import aiofiles
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="YABOOK SaaS API", description="Yearbook Creation Platform API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"  # user, admin, school_admin

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    school_name: Optional[str] = None
    academic_year: Optional[str] = None
    theme_color: str = "#E50914"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    collaborators: List[str] = []
    created_at: datetime
    updated_at: datetime
    status: str = "active"  # active, archived, published

class PhotoBase(BaseModel):
    filename: str
    original_name: str
    project_id: str
    tags: List[str] = []
    consent_status: str = "pending"  # pending, approved, rejected

class PhotoResponse(PhotoBase):
    id: str
    owner_id: str
    file_path: str
    file_size: int
    uploaded_at: datetime

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return UserResponse(**user)

# Authentication Endpoints
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user_dict)
    return UserResponse(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login_user(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Project Management Endpoints
@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    project_dict = {
        "id": str(uuid.uuid4()),
        "title": project.title,
        "description": project.description,
        "school_name": project.school_name,
        "academic_year": project.academic_year,
        "theme_color": project.theme_color,
        "owner_id": current_user.id,
        "collaborators": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "status": "active"
    }
    
    await db.projects.insert_one(project_dict)
    return ProjectResponse(**project_dict)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_user_projects(current_user: UserResponse = Depends(get_current_user)):
    projects = await db.projects.find({
        "$or": [
            {"owner_id": current_user.id},
            {"collaborators": current_user.id}
        ]
    }).to_list(100)
    
    return [ProjectResponse(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user has access to this project
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return ProjectResponse(**project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user is owner
    if project["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only project owner can update")
    
    update_dict = project_update.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_dict})
    updated_project = await db.projects.find_one({"id": project_id})
    return ProjectResponse(**updated_project)

# Photo Upload Endpoints
@api_router.post("/projects/{project_id}/photos", response_model=PhotoResponse)
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    # Verify project access
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / project_id / unique_filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Save photo metadata to database
    photo_dict = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "project_id": project_id,
        "owner_id": current_user.id,
        "file_path": str(file_path),
        "file_size": len(content),
        "tags": [],
        "consent_status": "pending",
        "uploaded_at": datetime.utcnow()
    }
    
    await db.photos.insert_one(photo_dict)
    return PhotoResponse(**photo_dict)

@api_router.get("/projects/{project_id}/photos", response_model=List[PhotoResponse])
async def get_project_photos(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    # Verify project access
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    photos = await db.photos.find({"project_id": project_id}).to_list(1000)
    return [PhotoResponse(**photo) for photo in photos]

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)