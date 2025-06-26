from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
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
import asyncio
import httpx
from urllib.parse import urljoin

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
app = FastAPI(title="YABOOK API", version="2.0.0", description="Enterprise Yearbook SaaS Platform")
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
    SUPER_ADMIN = "super_admin"
    SCHOOL_ADMIN = "school_admin"
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

class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED = "failed"
    ORPHANED = "orphaned"

class PhotoPrismInstanceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROVISIONING = "provisioning"
    ERROR = "error"

# Enhanced Pydantic Models

class SchoolBase(BaseModel):
    name: str
    district: Optional[str] = None
    address: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    subscription_tier: str = "basic"
    max_users: int = 100
    max_storage_gb: int = 10

class SchoolCreate(SchoolBase):
    admin_email: EmailStr
    admin_name: str
    admin_password: str

class School(SchoolBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoPrismInstanceBase(BaseModel):
    instance_name: str
    base_url: str
    api_token: Optional[str] = None
    status: PhotoPrismInstanceStatus = PhotoPrismInstanceStatus.PROVISIONING
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    resource_limits: Optional[Dict[str, Any]] = Field(default_factory=dict)

class PhotoPrismInstance(PhotoPrismInstanceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    last_health_check: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserBase(BaseModel):
    email: EmailStr
    name: str
    school_id: Optional[str] = None  # None for super admins

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: UserRole = UserRole.VIEWER
    is_active: bool = True
    last_login: Optional[datetime] = None
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
    academic_year: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoMetadata(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    taken_at: Optional[datetime] = None

class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_path: str
    thumbnail_path: Optional[str] = None
    
    # PhotoPrism Integration
    photoprism_uuid: Optional[str] = None
    photoprism_instance_id: Optional[str] = None
    sync_status: SyncStatus = SyncStatus.PENDING
    sync_version: int = 1
    last_sync_attempt: Optional[datetime] = None
    sync_errors: List[str] = Field(default_factory=list)
    
    # Metadata and AI
    metadata: PhotoMetadata = Field(default_factory=PhotoMetadata)
    ai_tags: List[str] = Field(default_factory=list)
    faces: List[Dict[str, Any]] = Field(default_factory=list)
    
    # YABOOK Data
    uploaded_by: str
    school_id: str
    project_id: str
    consent_status: ConsentStatus = ConsentStatus.PENDING
    usage_permissions: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SyncEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    photo_id: str
    instance_id: str
    event_type: str  # upload, update, delete, sync_check
    event_status: str  # success, failed, retrying
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error_details: Optional[str] = None
    processing_time: Optional[int] = None  # milliseconds
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
    school_id: str
    name: str
    layout_data: PageLayout = Field(default_factory=PageLayout)
    template_id: Optional[str] = None
    version_number: int = 1
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
    is_public: bool = True
    school_id: Optional[str] = None  # None for global templates
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

# PhotoPrism Integration Models
class PhotoPrismAdapter:
    def __init__(self):
        self.instances_cache = {}
    
    async def get_instance_for_school(self, school_id: str) -> Optional[PhotoPrismInstance]:
        """Get PhotoPrism instance for a school"""
        if school_id in self.instances_cache:
            return self.instances_cache[school_id]
        
        instance_doc = await db.photoprism_instances.find_one({"school_id": school_id})
        if instance_doc:
            instance = PhotoPrismInstance(**instance_doc)
            self.instances_cache[school_id] = instance
            return instance
        return None
    
    async def ensure_instance_active(self, instance_id: str) -> bool:
        """Check if PhotoPrism instance is healthy"""
        try:
            instance_doc = await db.photoprism_instances.find_one({"id": instance_id})
            if not instance_doc:
                return False
            
            instance = PhotoPrismInstance(**instance_doc)
            
            # Health check with timeout
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{instance.base_url}/api/v1/status")
                
            if response.status_code == 200:
                # Update last health check
                await db.photoprism_instances.update_one(
                    {"id": instance_id},
                    {"$set": {"last_health_check": datetime.utcnow()}}
                )
                return True
            return False
        except Exception as e:
            logging.error(f"Health check failed for instance {instance_id}: {e}")
            return False
    
    async def queue_photo_sync(self, photo_id: str, instance_id: str):
        """Queue photo for sync to PhotoPrism"""
        # Create sync event
        sync_event = SyncEvent(
            photo_id=photo_id,
            instance_id=instance_id,
            event_type="upload",
            event_status="queued"
        )
        await db.sync_events.insert_one(sync_event.dict())
        
        # Update photo sync status
        await db.photos.update_one(
            {"id": photo_id},
            {"$set": {"sync_status": SyncStatus.PENDING}}
        )

# Global PhotoPrism adapter instance
photoprism_adapter = PhotoPrismAdapter()

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

async def get_user_school(current_user: User = Depends(get_current_user)) -> Optional[School]:
    """Get the school associated with the current user"""
    if not current_user.school_id:
        return None
    school_doc = await db.schools.find_one({"id": current_user.school_id})
    return School(**school_doc) if school_doc else None

async def require_school_access(current_user: User = Depends(get_current_user)) -> School:
    """Require user to have school access"""
    school = await get_user_school(current_user)
    if not school:
        raise HTTPException(status_code=403, detail="School access required")
    return school

async def get_project_with_permission(project_id: str, user: User, required_role: UserRole = UserRole.VIEWER):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check school access first
    if project["school_id"] != user.school_id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if user is owner
    if project["owner_id"] == user.id:
        return Project(**project)
    
    # Check team membership
    team_member = await db.team_members.find_one({
        "project_id": project_id,
        "user_id": user.id,
        "status": TeamStatus.ACTIVE
    })
    
    if not team_member and user.role not in [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Project(**project)

# Background tasks for PhotoPrism sync
async def sync_photo_to_photoprism(photo_id: str):
    """Background task to sync photo to PhotoPrism"""
    try:
        photo_doc = await db.photos.find_one({"id": photo_id})
        if not photo_doc:
            return
        
        photo = Photo(**photo_doc)
        instance = await photoprism_adapter.get_instance_for_school(photo.school_id)
        
        if not instance:
            logging.error(f"No PhotoPrism instance found for school {photo.school_id}")
            return
        
        # Update sync status to syncing
        await db.photos.update_one(
            {"id": photo_id},
            {"$set": {
                "sync_status": SyncStatus.SYNCING,
                "last_sync_attempt": datetime.utcnow()
            }}
        )
        
        # Simulate PhotoPrism upload (replace with actual PhotoPrism API call)
        await asyncio.sleep(2)  # Simulate processing time
        
        # Update to synced status
        await db.photos.update_one(
            {"id": photo_id},
            {"$set": {
                "sync_status": SyncStatus.SYNCED,
                "photoprism_uuid": str(uuid.uuid4()),
                "photoprism_instance_id": instance.id,
                "sync_version": photo.sync_version + 1
            }}
        )
        
        # Log successful sync
        sync_event = SyncEvent(
            photo_id=photo_id,
            instance_id=instance.id,
            event_type="upload",
            event_status="success",
            processing_time=2000
        )
        await db.sync_events.insert_one(sync_event.dict())
        
    except Exception as e:
        logging.error(f"Photo sync failed for {photo_id}: {e}")
        
        # Update to failed status
        await db.photos.update_one(
            {"id": photo_id},
            {"$set": {
                "sync_status": SyncStatus.FAILED,
                "sync_errors": [str(e)]
            }}
        )

# School Management endpoints
@api_router.post("/schools", response_model=School)
async def create_school(school_create: SchoolCreate, current_user: User = Depends(get_current_user)):
    # Only super admins can create schools
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if school name already exists
    existing_school = await db.schools.find_one({"name": school_create.name})
    if existing_school:
        raise HTTPException(status_code=400, detail="School name already exists")
    
    # Create school
    school_dict = school_create.dict()
    admin_email = school_dict.pop("admin_email")
    admin_name = school_dict.pop("admin_name") 
    admin_password = school_dict.pop("admin_password")
    
    school = School(**school_dict)
    await db.schools.insert_one(school.dict())
    
    # Create school admin user
    admin_user = User(
        email=admin_email,
        name=admin_name,
        school_id=school.id,
        role=UserRole.SCHOOL_ADMIN
    )
    
    user_dict = admin_user.dict()
    user_dict["password_hash"] = hash_password(admin_password)
    await db.users.insert_one(user_dict)
    
    return school

@api_router.get("/schools", response_model=List[School])
async def get_schools(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.SUPER_ADMIN:
        schools = await db.schools.find().to_list(100)
        return [School(**school) for school in schools]
    elif current_user.school_id:
        school = await db.schools.find_one({"id": current_user.school_id})
        return [School(**school)] if school else []
    else:
        return []

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_create: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # If no school_id provided, this might be a super admin (in development)
    # In production, all users should be associated with a school
    
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
    if not user or not verify_password(user_login.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.utcnow()}}
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
async def create_project(
    project_create: ProjectCreate, 
    current_user: User = Depends(get_current_user),
    school: School = Depends(require_school_access)
):
    project_dict = project_create.dict()
    project_dict["owner_id"] = current_user.id
    project_dict["school_id"] = school.id
    project = Project(**project_dict)
    await db.projects.insert_one(project.dict())
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_user_projects(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin can see all projects
        projects = await db.projects.find().to_list(100)
    else:
        # Get owned projects
        query = {"$or": [{"owner_id": current_user.id}]}
        
        # Add school projects if user has school access
        if current_user.school_id:
            query["$or"].append({"school_id": current_user.school_id})
        
        # Get team projects
        team_memberships = await db.team_members.find({
            "user_id": current_user.id,
            "status": TeamStatus.ACTIVE
        }).to_list(100)
        
        if team_memberships:
            team_project_ids = [tm["project_id"] for tm in team_memberships]
            query["$or"].append({"id": {"$in": team_project_ids}})
        
        projects = await db.projects.find(query).to_list(100)
    
    return [Project(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    return await get_project_with_permission(project_id, current_user)

# Photo endpoints
@api_router.post("/projects/{project_id}/photos", response_model=Photo)
async def upload_photo(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tags: str = Form(""),
    current_user: User = Depends(get_current_user)
):
    project = await get_project_with_permission(project_id, current_user, UserRole.EDITOR)
    
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
        school_id=project.school_id,
        project_id=project_id,
        metadata=PhotoMetadata(
            file_size=len(content),
            mime_type=file.content_type
        )
    )
    
    await db.photos.insert_one(photo.dict())
    
    # Queue background sync to PhotoPrism
    background_tasks.add_task(sync_photo_to_photoprism, photo.id)
    
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
    sync_status: Optional[SyncStatus] = None,
    current_user: User = Depends(get_current_user)
):
    await get_project_with_permission(project_id, current_user)
    
    query = {"project_id": project_id}
    
    if search:
        query["$or"] = [
            {"original_name": {"$regex": search, "$options": "i"}},
            {"ai_tags": {"$regex": search, "$options": "i"}}
        ]
    
    if tags:
        tag_list = tags.split(",")
        query["ai_tags"] = {"$in": tag_list}
    
    if uploader:
        query["uploaded_by"] = uploader
    
    if consent_status:
        query["consent_status"] = consent_status
        
    if sync_status:
        query["sync_status"] = sync_status
    
    photos = await db.photos.find(query).skip(skip).limit(limit).to_list(100)
    return [Photo(**photo) for photo in photos]

# PhotoPrism Integration endpoints
@api_router.get("/photoprism/instances/{school_id}", response_model=Optional[PhotoPrismInstance])
async def get_photoprism_instance(
    school_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check access
    if current_user.school_id != school_id and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return await photoprism_adapter.get_instance_for_school(school_id)

@api_router.post("/photoprism/instances")
async def create_photoprism_instance(
    instance_data: PhotoPrismInstanceBase,
    school_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Only super admins can create PhotoPrism instances
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if instance already exists for school
    existing = await db.photoprism_instances.find_one({"school_id": school_id})
    if existing:
        raise HTTPException(status_code=400, detail="PhotoPrism instance already exists for this school")
    
    instance_dict = instance_data.dict()
    instance_dict["school_id"] = school_id
    instance = PhotoPrismInstance(**instance_dict)
    
    await db.photoprism_instances.insert_one(instance.dict())
    return instance

@api_router.get("/sync/status/{school_id}")
async def get_sync_status(
    school_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check access
    if current_user.school_id != school_id and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get sync statistics
    total_photos = await db.photos.count_documents({"school_id": school_id})
    synced_photos = await db.photos.count_documents({"school_id": school_id, "sync_status": SyncStatus.SYNCED})
    failed_photos = await db.photos.count_documents({"school_id": school_id, "sync_status": SyncStatus.FAILED})
    pending_photos = await db.photos.count_documents({"school_id": school_id, "sync_status": SyncStatus.PENDING})
    
    return {
        "school_id": school_id,
        "total_photos": total_photos,
        "synced_photos": synced_photos,
        "failed_photos": failed_photos,
        "pending_photos": pending_photos,
        "sync_percentage": (synced_photos / total_photos * 100) if total_photos > 0 else 0
    }

# Page endpoints (existing)
@api_router.post("/projects/{project_id}/pages", response_model=Page)
async def create_page(
    project_id: str,
    name: str = Form(...),
    template_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    project = await get_project_with_permission(project_id, current_user, UserRole.EDITOR)
    
    page_data = {
        "project_id": project_id,
        "school_id": project.school_id,
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
        "version_number": page["version_number"] + 1,
        "updated_at": datetime.utcnow()
    }
    
    await db.pages.update_one({"id": page_id}, {"$set": update_data})
    
    updated_page = await db.pages.find_one({"id": page_id})
    return Page(**updated_page)

# Template endpoints
@api_router.get("/templates", response_model=List[Template])
async def get_templates(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"$or": [{"is_public": True}]}
    
    # Add school-specific templates
    if current_user.school_id:
        query["$or"].append({"school_id": current_user.school_id})
    
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
    
    # Check if user exists and is in the same school
    invited_user = await db.users.find_one({
        "email": invite.user_email,
        "school_id": project.school_id
    })
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found in this school")
    
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

# Health and monitoring endpoints
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "YABOOK API", 
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "multi_tenancy": True,
            "photoprism_integration": True,
            "real_time_collaboration": False,  # TODO: Implement
            "advanced_monitoring": False       # TODO: Implement
        }
    }

@api_router.get("/health/photoprism/{school_id}")
async def check_photoprism_health(
    school_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check access
    if current_user.school_id != school_id and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    instance = await photoprism_adapter.get_instance_for_school(school_id)
    if not instance:
        return {"status": "no_instance", "healthy": False}
    
    is_healthy = await photoprism_adapter.ensure_instance_active(instance.id)
    return {
        "status": "active" if is_healthy else "unhealthy",
        "healthy": is_healthy,
        "instance_id": instance.id,
        "last_check": instance.last_health_check
    }

# Include router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("YABOOK API starting up...")
    # TODO: Initialize PhotoPrism monitoring
    # TODO: Start background sync jobs

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("YABOOK API shutting down...")