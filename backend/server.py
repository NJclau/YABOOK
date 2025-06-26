from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import logging
from pathlib import Path
from dotenv import load_dotenv
import aiofiles
from enum import Enum

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

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create FastAPI app
app = FastAPI(title="YABOOK API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class ConsentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class TeamStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoMetadata(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_path: str
    metadata: PhotoMetadata = Field(default_factory=PhotoMetadata)
    tags: List[str] = Field(default_factory=list)
    uploaded_by: str
    project_id: str
    consent_status: ConsentStatus = ConsentStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PageLayoutElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "photo", "text", "shape"
    x: float
    y: float
    width: float
    height: float
    content: Optional[Dict[str, Any]] = Field(default_factory=dict)
    styles: Optional[Dict[str, Any]] = Field(default_factory=dict)

class PageLayout(BaseModel):
    elements: List[PageLayoutElement] = Field(default_factory=list)
    background: Optional[Dict[str, Any]] = Field(default_factory=dict)
    dimensions: Dict[str, float] = Field(default_factory=lambda: {"width": 1920, "height": 1080})

class Page(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str
    layout_data: PageLayout = Field(default_factory=PageLayout)
    template_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Template(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    layout_schema: PageLayout
    preview_image: Optional[str] = None
    category: str = "general"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    user_email: str
    role: UserRole
    invited_by: str
    joined_at: Optional[datetime] = None
    status: TeamStatus = TeamStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeamInvite(BaseModel):
    user_email: EmailStr
    role: UserRole = UserRole.VIEWER

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
    return User(**user)

async def get_project_with_permission(project_id: str, user: User, required_role: UserRole = UserRole.VIEWER):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user is owner
    if project["owner_id"] == user.id:
        return Project(**project)
    
    # Check team membership
    team_member = await db.team_members.find_one({
        "project_id": project_id,
        "user_id": user.id,
        "status": TeamStatus.ACTIVE
    })
    
    if not team_member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check role permissions
    role_hierarchy = {UserRole.VIEWER: 1, UserRole.EDITOR: 2, UserRole.ADMIN: 3}
    if role_hierarchy[UserRole(team_member["role"])] < role_hierarchy[required_role]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return Project(**project)

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_create: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_create.dict()
    user_dict["password_hash"] = hash_password(user_create.password)
    del user_dict["password"]
    
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Project endpoints
@api_router.post("/projects", response_model=Project)
async def create_project(project_create: ProjectCreate, current_user: User = Depends(get_current_user)):
    project_dict = project_create.dict()
    project_dict["owner_id"] = current_user.id
    project = Project(**project_dict)
    await db.projects.insert_one(project.dict())
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_user_projects(current_user: User = Depends(get_current_user)):
    # Get owned projects
    owned_projects = await db.projects.find({"owner_id": current_user.id}).to_list(100)
    
    # Get team projects
    team_memberships = await db.team_members.find({
        "user_id": current_user.id,
        "status": TeamStatus.ACTIVE
    }).to_list(100)
    
    team_project_ids = [tm["project_id"] for tm in team_memberships]
    team_projects = []
    if team_project_ids:
        team_projects = await db.projects.find({"id": {"$in": team_project_ids}}).to_list(100)
    
    all_projects = owned_projects + team_projects
    return [Project(**project) for project in all_projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    return await get_project_with_permission(project_id, current_user)

# Photo endpoints
@api_router.post("/projects/{project_id}/photos", response_model=Photo)
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    tags: str = Form(""),
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user, UserRole.EDITOR)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create photo record
    photo = Photo(
        filename=unique_filename,
        original_name=file.filename,
        file_path=str(file_path),
        tags=tags.split(",") if tags else [],
        uploaded_by=current_user.id,
        project_id=project_id,
        metadata=PhotoMetadata(
            file_size=len(content),
            mime_type=file.content_type
        )
    )
    
    await db.photos.insert_one(photo.dict())
    return photo

@api_router.get("/projects/{project_id}/photos", response_model=List[Photo])
async def get_project_photos(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    uploader: Optional[str] = None,
    consent_status: Optional[ConsentStatus] = None,
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user)
    
    query = {"project_id": project_id}
    
    if search:
        query["$or"] = [
            {"original_name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    if tags:
        tag_list = tags.split(",")
        query["tags"] = {"$in": tag_list}
    
    if uploader:
        query["uploaded_by"] = uploader
    
    if consent_status:
        query["consent_status"] = consent_status
    
    photos = await db.photos.find(query).skip(skip).limit(limit).to_list(100)
    return [Photo(**photo) for photo in photos]

# Page endpoints
@api_router.post("/projects/{project_id}/pages", response_model=Page)
async def create_page(
    project_id: str,
    name: str = Form(...),
    template_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user, UserRole.EDITOR)
    
    page_data = {
        "project_id": project_id,
        "name": name,
        "created_by": current_user.id
    }
    
    if template_id:
        template = await db.templates.find_one({"id": template_id})
        if template:
            page_data["template_id"] = template_id
            page_data["layout_data"] = template["layout_schema"]
    
    page = Page(**page_data)
    await db.pages.insert_one(page.dict())
    return page

@api_router.get("/projects/{project_id}/pages", response_model=List[Page])
async def get_project_pages(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user)
    
    pages = await db.pages.find({"project_id": project_id}).to_list(100)
    return [Page(**page) for page in pages]

@api_router.put("/pages/{page_id}", response_model=Page)
async def update_page_layout(
    page_id: str,
    layout_data: PageLayout,
    current_user: User = Depends(get_current_user)
):
    page = await db.pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    await get_project_with_permission(page["project_id"], current_user, UserRole.EDITOR)
    
    update_data = {
        "layout_data": layout_data.dict(),
        "updated_at": datetime.utcnow()
    }
    
    await db.pages.update_one({"id": page_id}, {"$set": update_data})
    
    updated_page = await db.pages.find_one({"id": page_id})
    return Page(**updated_page)

# Template endpoints
@api_router.get("/templates", response_model=List[Template])
async def get_templates(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    
    templates = await db.templates.find(query).to_list(100)
    return [Template(**template) for template in templates]

# Team management endpoints
@api_router.post("/projects/{project_id}/team/invite")
async def invite_team_member(
    project_id: str,
    invite: TeamInvite,
    current_user: User = Depends(get_current_user)
):
    project = await get_project_with_permission(project_id, current_user, UserRole.ADMIN)
    
    # Check if user exists
    invited_user = await db.users.find_one({"email": invite.user_email})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a team member
    existing_member = await db.team_members.find_one({
        "project_id": project_id,
        "user_id": invited_user["id"]
    })
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a team member")
    
    team_member = TeamMember(
        project_id=project_id,
        user_id=invited_user["id"],
        user_email=invite.user_email,
        role=invite.role,
        invited_by=current_user.id
    )
    
    await db.team_members.insert_one(team_member.dict())
    return {"message": "Invitation sent successfully"}

@api_router.get("/projects/{project_id}/team", response_model=List[TeamMember])
async def get_team_members(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user)
    
    team_members = await db.team_members.find({"project_id": project_id}).to_list(100)
    return [TeamMember(**member) for member in team_members]

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "YABOOK API", "version": "2.0.0"}

# Include router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()