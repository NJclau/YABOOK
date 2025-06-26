from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
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
from PIL import Image
import mimetypes

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

class PhotoMetadata(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    mode: Optional[str] = None
    has_transparency: Optional[bool] = None

class PhotoBase(BaseModel):
    filename: str
    original_name: str
    project_id: str
    tags: List[str] = []
    consent_status: str = "pending"  # pending, approved, rejected
    description: Optional[str] = None
    taken_date: Optional[datetime] = None
    location: Optional[str] = None
    people: List[str] = []  # List of people in the photo

class PhotoCreate(PhotoBase):
    pass

class PhotoUpdate(BaseModel):
    tags: Optional[List[str]] = None
    consent_status: Optional[str] = None
    description: Optional[str] = None
    taken_date: Optional[datetime] = None
    location: Optional[str] = None
    people: Optional[List[str]] = None

class PhotoResponse(PhotoBase):
    id: str
    owner_id: str
    file_path: str
    file_size: int
    mime_type: str
    metadata: Optional[PhotoMetadata] = None
    uploaded_at: datetime
    updated_at: datetime

class PhotoSearchResponse(BaseModel):
    photos: List[PhotoResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class BulkPhotoOperation(BaseModel):
    photo_ids: List[str]
    operation: str  # "delete", "update_tags", "update_consent"
    data: Optional[Dict[str, Any]] = None

class PhotoStats(BaseModel):
    total_photos: int
    by_consent_status: Dict[str, int]
    by_file_type: Dict[str, int]
    total_size: int
    recent_uploads: int  # Last 7 days

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

def extract_image_metadata(file_path: Path) -> Optional[PhotoMetadata]:
    """Extract metadata from image file"""
    try:
        with Image.open(file_path) as img:
            return PhotoMetadata(
                width=img.width,
                height=img.height,
                format=img.format,
                mode=img.mode,
                has_transparency=img.mode in ('RGBA', 'LA') or 'transparency' in img.info
            )
    except Exception as e:
        logger.warning(f"Could not extract metadata from {file_path}: {e}")
        return None

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

# Enhanced Photo Management Endpoints
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
    content = await file.read()
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Extract image metadata
    metadata = extract_image_metadata(file_path)
    
    # Save photo metadata to database
    photo_dict = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "project_id": project_id,
        "owner_id": current_user.id,
        "file_path": str(file_path),
        "file_size": len(content),
        "mime_type": file.content_type,
        "metadata": metadata.dict() if metadata else None,
        "tags": [],
        "consent_status": "pending",
        "description": None,
        "taken_date": None,
        "location": None,
        "people": [],
        "uploaded_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.photos.insert_one(photo_dict)
    return PhotoResponse(**photo_dict)

@api_router.get("/projects/{project_id}/photos", response_model=PhotoSearchResponse)
async def get_project_photos(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search in filename, tags, description"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    consent_status: Optional[str] = Query(None, description="Filter by consent status"),
    date_from: Optional[datetime] = Query(None, description="Filter photos from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter photos until this date"),
    sort_by: str = Query("uploaded_at", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    # Verify project access
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build search query
    query = {"project_id": project_id}
    
    # Text search
    if search:
        query["$or"] = [
            {"original_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
            {"people": {"$regex": search, "$options": "i"}}
        ]
    
    # Tag filter
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    # Consent status filter
    if consent_status:
        query["consent_status"] = consent_status
    
    # Date range filter
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["uploaded_at"] = date_filter
    
    # Sort configuration
    sort_direction = 1 if sort_order == "asc" else -1
    sort_config = [(sort_by, sort_direction)]
    
    # Calculate pagination
    skip = (page - 1) * per_page
    
    # Execute queries
    photos_cursor = db.photos.find(query).sort(sort_config).skip(skip).limit(per_page)
    photos = await photos_cursor.to_list(per_page)
    total = await db.photos.count_documents(query)
    
    total_pages = (total + per_page - 1) // per_page
    
    return PhotoSearchResponse(
        photos=[PhotoResponse(**photo) for photo in photos],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@api_router.get("/projects/{project_id}/photos/stats", response_model=PhotoStats)
async def get_photo_stats(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    # Verify project access
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get stats
    total_photos = await db.photos.count_documents({"project_id": project_id})
    
    # Consent status breakdown
    consent_pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$consent_status", "count": {"$sum": 1}}}
    ]
    consent_stats = {}
    async for result in db.photos.aggregate(consent_pipeline):
        consent_stats[result["_id"]] = result["count"]
    
    # File type breakdown
    type_pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": "$mime_type", "count": {"$sum": 1}}}
    ]
    type_stats = {}
    async for result in db.photos.aggregate(type_pipeline):
        type_stats[result["_id"]] = result["count"]
    
    # Total size
    size_pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}
    ]
    total_size = 0
    async for result in db.photos.aggregate(size_pipeline):
        total_size = result["total_size"]
    
    # Recent uploads (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_uploads = await db.photos.count_documents({
        "project_id": project_id,
        "uploaded_at": {"$gte": seven_days_ago}
    })
    
    return PhotoStats(
        total_photos=total_photos,
        by_consent_status=consent_stats,
        by_file_type=type_stats,
        total_size=total_size,
        recent_uploads=recent_uploads
    )

@api_router.get("/photos/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    photo = await db.photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Verify project access
    project = await db.projects.find_one({"id": photo["project_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return PhotoResponse(**photo)

@api_router.put("/photos/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: str,
    photo_update: PhotoUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    photo = await db.photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Verify project access
    project = await db.projects.find_one({"id": photo["project_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update photo
    update_dict = photo_update.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.photos.update_one({"id": photo_id}, {"$set": update_dict})
    updated_photo = await db.photos.find_one({"id": photo_id})
    return PhotoResponse(**updated_photo)

@api_router.post("/projects/{project_id}/photos/bulk")
async def bulk_photo_operation(
    project_id: str,
    operation: BulkPhotoOperation,
    current_user: UserResponse = Depends(get_current_user)
):
    # Verify project access
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify all photos belong to this project
    photos = await db.photos.find({
        "id": {"$in": operation.photo_ids},
        "project_id": project_id
    }).to_list(len(operation.photo_ids))
    
    if len(photos) != len(operation.photo_ids):
        raise HTTPException(status_code=400, detail="Some photos not found or don't belong to this project")
    
    # Execute operation
    if operation.operation == "delete":
        # Delete files from disk
        for photo in photos:
            file_path = Path(photo["file_path"])
            if file_path.exists():
                file_path.unlink()
        
        # Delete from database
        result = await db.photos.delete_many({"id": {"$in": operation.photo_ids}})
        return {"message": f"Deleted {result.deleted_count} photos"}
    
    elif operation.operation == "update_tags":
        if not operation.data or "tags" not in operation.data:
            raise HTTPException(status_code=400, detail="Tags data required")
        
        update_dict = {
            "tags": operation.data["tags"],
            "updated_at": datetime.utcnow()
        }
        result = await db.photos.update_many(
            {"id": {"$in": operation.photo_ids}},
            {"$set": update_dict}
        )
        return {"message": f"Updated tags for {result.modified_count} photos"}
    
    elif operation.operation == "update_consent":
        if not operation.data or "consent_status" not in operation.data:
            raise HTTPException(status_code=400, detail="Consent status data required")
        
        update_dict = {
            "consent_status": operation.data["consent_status"],
            "updated_at": datetime.utcnow()
        }
        result = await db.photos.update_many(
            {"id": {"$in": operation.photo_ids}},
            {"$set": update_dict}
        )
        return {"message": f"Updated consent status for {result.modified_count} photos"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid operation")

@api_router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    photo = await db.photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Verify project access
    project = await db.projects.find_one({"id": photo["project_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id and current_user.id not in project["collaborators"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete file from disk
    file_path = Path(photo["file_path"])
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.photos.delete_one({"id": photo_id})
    return {"message": "Photo deleted successfully"}

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