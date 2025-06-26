from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
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
import json
from pathlib import Path
from dotenv import load_dotenv
import asyncio
from enum import Enum

# Configuration
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="YABOOK API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Add CORS middleware
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
    TEACHER = "teacher"
    STUDENT = "student"

class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"
    ORPHANED = "orphaned"

class PhotoPrismInstanceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROVISIONING = "provisioning"
    ERROR = "error"

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    school_id: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SchoolBase(BaseModel):
    name: str
    domain: str
    address: str
    contact_email: EmailStr
    contact_phone: str

class SchoolCreate(SchoolBase):
    pass

class SchoolResponse(SchoolBase):
    id: str
    created_at: datetime
    is_active: bool
    total_users: int = 0
    total_photos: int = 0

class PhotoPrismInstanceBase(BaseModel):
    instance_name: str
    base_url: str
    status: PhotoPrismInstanceStatus
    config: Dict[str, Any] = {}
    resource_limits: Dict[str, Any] = {}

class PhotoPrismInstanceCreate(PhotoPrismInstanceBase):
    school_id: str

class PhotoPrismInstanceResponse(PhotoPrismInstanceBase):
    id: str
    school_id: str
    created_at: datetime
    last_health_check: Optional[datetime] = None

class PhotoBase(BaseModel):
    filename: str
    original_path: str
    thumbnail_path: Optional[str] = None
    metadata: Dict[str, Any] = {}
    ai_tags: List[str] = []
    usage_permissions: Dict[str, Any] = {}

class PhotoCreate(PhotoBase):
    pass

class PhotoResponse(PhotoBase):
    id: str
    photoprism_uuid: Optional[str] = None
    photoprism_instance_id: Optional[str] = None
    sync_status: SyncStatus
    sync_version: int = 1
    last_sync_attempt: Optional[datetime] = None
    sync_errors: List[str] = []
    uploaded_by: str
    school_id: str
    created_at: datetime
    updated_at: datetime

class SyncEventBase(BaseModel):
    event_type: str
    event_status: str
    payload: Dict[str, Any] = {}
    error_details: Optional[str] = None
    processing_time: Optional[int] = None

class SyncEventCreate(SyncEventBase):
    photo_id: str
    instance_id: str

class SyncEventResponse(SyncEventBase):
    id: str
    photo_id: str
    instance_id: str
    created_at: datetime

# Utility Functions
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
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_school(current_user: dict = Depends(get_current_user)):
    school = await db.schools.find_one({"id": current_user["school_id"]})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# PhotoPrism Simulation Service
class PhotoPrismSimulator:
    """Simulates PhotoPrism integration for development"""
    
    @staticmethod
    async def simulate_upload(photo_data: dict) -> dict:
        """Simulate PhotoPrism photo upload"""
        await asyncio.sleep(0.5)  # Simulate processing time
        return {
            "uuid": str(uuid.uuid4()),
            "status": "uploaded",
            "keywords": ["photo", "yearbook", "school"],
            "faces": [],
            "metadata": {
                "width": 1920,
                "height": 1080,
                "format": "JPEG",
                "camera": "Canon EOS 5D"
            }
        }
    
    @staticmethod
    async def simulate_health_check(instance_id: str) -> dict:
        """Simulate PhotoPrism instance health check"""
        return {
            "status": "healthy",
            "version": "220901-e1280b40",
            "database": "healthy",
            "storage": {"usage_percent": 45, "available_gb": 500}
        }
    
    @staticmethod
    async def simulate_search(query: str, school_id: str) -> List[dict]:
        """Simulate PhotoPrism search functionality"""
        await asyncio.sleep(0.3)
        return [
            {
                "uuid": str(uuid.uuid4()),
                "filename": f"search_result_{i}.jpg",
                "keywords": ["yearbook", query],
                "score": 0.95 - (i * 0.1)
            }
            for i in range(3)
        ]

# Authentication Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Check if user already exists
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Check if school exists
    school = await db.schools.find_one({"id": user.school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_dict.update({
        "id": str(uuid.uuid4()),
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    })
    
    await db.users.insert_one(user_dict)
    return UserResponse(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# School Management Routes
@api_router.post("/schools", response_model=SchoolResponse)
async def create_school(school: SchoolCreate):
    # Check if school domain already exists
    if await db.schools.find_one({"domain": school.domain}):
        raise HTTPException(
            status_code=400,
            detail="School domain already exists"
        )
    
    school_dict = school.dict()
    school_dict.update({
        "id": str(uuid.uuid4()),
        "created_at": datetime.utcnow(),
        "is_active": True
    })
    
    await db.schools.insert_one(school_dict)
    
    # Create PhotoPrism instance for school
    await create_photoprism_instance(school_dict["id"])
    
    return SchoolResponse(**school_dict)

@api_router.get("/schools", response_model=List[SchoolResponse])
async def get_schools(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        # Non-admin users can only see their own school
        schools = await db.schools.find({"id": current_user["school_id"]}).to_list(1)
    else:
        schools = await db.schools.find().to_list(100)
    
    # Add stats for each school
    for school in schools:
        school["total_users"] = await db.users.count_documents({"school_id": school["id"]})
        school["total_photos"] = await db.photos.count_documents({"school_id": school["id"]})
    
    return [SchoolResponse(**school) for school in schools]

@api_router.get("/schools/{school_id}", response_model=SchoolResponse)
async def get_school(school_id: str, current_user: dict = Depends(get_current_user)):
    # Check permissions
    if current_user["role"] != UserRole.ADMIN and current_user["school_id"] != school_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this school")
    
    school = await db.schools.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school["total_users"] = await db.users.count_documents({"school_id": school_id})
    school["total_photos"] = await db.photos.count_documents({"school_id": school_id})
    
    return SchoolResponse(**school)

# Photo Management Routes
@api_router.post("/photos/upload", response_model=PhotoResponse)
async def upload_photo(
    file: UploadFile = File(...),
    metadata: str = Form("{}"),
    current_user: dict = Depends(get_current_user)
):
    try:
        metadata_dict = json.loads(metadata)
    except json.JSONDecodeError:
        metadata_dict = {}
    
    # Simulate file storage (in production, save to S3/cloud storage)
    file_path = f"uploads/{current_user['school_id']}/{str(uuid.uuid4())}_{file.filename}"
    
    # Create photo record
    photo_dict = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "original_path": file_path,
        "thumbnail_path": f"thumbnails/{file_path}",
        "metadata": metadata_dict,
        "ai_tags": [],
        "usage_permissions": {},
        "sync_status": SyncStatus.PENDING,
        "sync_version": 1,
        "sync_errors": [],
        "uploaded_by": current_user["id"],
        "school_id": current_user["school_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.photos.insert_one(photo_dict)
    
    # Simulate PhotoPrism sync
    await simulate_photoprism_sync(photo_dict)
    
    return PhotoResponse(**photo_dict)

@api_router.get("/photos", response_model=List[PhotoResponse])
async def get_photos(
    sync_status: Optional[SyncStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"school_id": current_user["school_id"]}
    if sync_status:
        query["sync_status"] = sync_status
    
    photos = await db.photos.find(query).to_list(100)
    return [PhotoResponse(**photo) for photo in photos]

@api_router.get("/photos/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    photo = await db.photos.find_one({"_id": photo_id, "school_id": current_user["school_id"]})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return PhotoResponse(**photo)

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    photo = await db.photos.find_one({"_id": photo_id, "school_id": current_user["school_id"]})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Check permissions (only uploader or admin can delete)
    if photo["uploaded_by"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
    
    await db.photos.delete_one({"_id": photo_id})
    return {"message": "Photo deleted successfully"}

# PhotoPrism Integration Routes
@api_router.get("/photoprism/instances", response_model=List[PhotoPrismInstanceResponse])
async def get_photoprism_instances(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        instances = await db.photoprism_instances.find({"school_id": current_user["school_id"]}).to_list(10)
    else:
        instances = await db.photoprism_instances.find().to_list(100)
    
    return [PhotoPrismInstanceResponse(**instance) for instance in instances]

@api_router.get("/photoprism/instances/{instance_id}/health")
async def check_photoprism_health(instance_id: str, current_user: dict = Depends(get_current_user)):
    instance = await db.photoprism_instances.find_one({"_id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="PhotoPrism instance not found")
    
    # Check permissions
    if current_user["role"] != UserRole.ADMIN and instance["school_id"] != current_user["school_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    health_data = await PhotoPrismSimulator.simulate_health_check(instance_id)
    
    # Update last health check
    await db.photoprism_instances.update_one(
        {"_id": instance_id},
        {"$set": {"last_health_check": datetime.utcnow()}}
    )
    
    return health_data

@api_router.post("/photoprism/instances/{instance_id}/reconcile")
async def reconcile_photoprism_data(instance_id: str, current_user: dict = Depends(get_current_user)):
    instance = await db.photoprism_instances.find_one({"_id": instance_id})
    if not instance:
        raise HTTPException(status_code=404, detail="PhotoPrism instance not found")
    
    # Check permissions
    if current_user["role"] != UserRole.ADMIN and instance["school_id"] != current_user["school_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Simulate reconciliation process
    school_photos = await db.photos.find({"school_id": instance["school_id"]}).to_list(1000)
    
    report = {
        "total_photos": len(school_photos),
        "synced_photos": len([p for p in school_photos if p["sync_status"] == "synced"]),
        "pending_photos": len([p for p in school_photos if p["sync_status"] == "pending"]),
        "failed_photos": len([p for p in school_photos if p["sync_status"] == "failed"]),
        "orphaned_photos": len([p for p in school_photos if p["sync_status"] == "orphaned"]),
        "actions_needed": []
    }
    
    return report

# Search Routes
@api_router.get("/search/photos")
async def search_photos(
    query: str,
    include_ai_tags: bool = True,
    current_user: dict = Depends(get_current_user)
):
    # Simulate PhotoPrism AI search
    results = await PhotoPrismSimulator.simulate_search(query, current_user["school_id"])
    
    # Also search local database
    db_query = {
        "school_id": current_user["school_id"],
        "$or": [
            {"filename": {"$regex": query, "$options": "i"}},
            {"ai_tags": {"$in": [query]}},
            {"metadata.description": {"$regex": query, "$options": "i"}}
        ]
    }
    
    local_photos = await db.photos.find(db_query).to_list(20)
    
    return {
        "query": query,
        "photoprism_results": results,
        "local_results": [PhotoResponse(**photo) for photo in local_photos],
        "total_results": len(results) + len(local_photos)
    }

# Helper Functions
async def create_photoprism_instance(school_id: str):
    """Create a PhotoPrism instance for a school"""
    instance_dict = {
        "id": str(uuid.uuid4()),
        "school_id": school_id,
        "instance_name": f"photoprism-{school_id[:8]}",
        "base_url": f"http://photoprism-{school_id[:8]}.internal:2342",
        "status": PhotoPrismInstanceStatus.PROVISIONING,
        "config": {
            "originals_limit": 5000,
            "readonly": False,
            "experimental": False
        },
        "resource_limits": {
            "cpu": "2000m",
            "memory": "4Gi",
            "storage": "100Gi"
        },
        "created_at": datetime.utcnow()
    }
    
    await db.photoprism_instances.insert_one(instance_dict)
    
    # Simulate provisioning delay
    await asyncio.sleep(1)
    
    # Update status to active
    await db.photoprism_instances.update_one(
        {"_id": instance_dict["id"]},
        {"$set": {"status": PhotoPrismInstanceStatus.ACTIVE}}
    )

async def simulate_photoprism_sync(photo_dict: dict):
    """Simulate PhotoPrism synchronization"""
    try:
        # Simulate PhotoPrism upload
        photoprism_response = await PhotoPrismSimulator.simulate_upload(photo_dict)
        
        # Update photo with PhotoPrism data
        await db.photos.update_one(
            {"_id": photo_dict["id"]},
            {
                "$set": {
                    "photoprism_uuid": photoprism_response["uuid"],
                    "sync_status": SyncStatus.SYNCED,
                    "ai_tags": photoprism_response["keywords"],
                    "last_sync_attempt": datetime.utcnow(),
                    "sync_version": 2
                }
            }
        )
        
        # Log sync event
        await db.sync_events.insert_one({
            "id": str(uuid.uuid4()),
            "photo_id": photo_dict["id"],
            "instance_id": "simulated",
            "event_type": "upload",
            "event_status": "success",
            "payload": photoprism_response,
            "processing_time": 500,
            "created_at": datetime.utcnow()
        })
        
    except Exception as e:
        # Handle sync failure
        await db.photos.update_one(
            {"_id": photo_dict["id"]},
            {
                "$set": {
                    "sync_status": SyncStatus.FAILED,
                    "sync_errors": [str(e)],
                    "last_sync_attempt": datetime.utcnow()
                }
            }
        )

# Include router and configure logging
app.include_router(api_router)

# Add root endpoint for basic testing
@app.get("/")
async def root():
    return {"message": "YABOOK API - Enterprise Yearbook Management System", "status": "running"}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@api_router.get("/")
async def api_root():
    return {"message": "YABOOK API - Enterprise Yearbook Management System"}