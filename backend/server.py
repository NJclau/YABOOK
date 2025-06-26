from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime
import aiofiles
import magic
from PIL import Image

# Import our models and services
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import (
    School, SchoolCreate, Photo, PhotoCreate, PhotoResponse, PhotoSearchResponse,
    PhotoPrismInstance, PhotoPrismInstanceCreate, PhotoPrismSyncEvent, PhotoPrismSyncEventCreate,
    SyncStatusResponse, InstanceHealthResponse, StatusCheck, StatusCheckCreate
)
from services.photoprism_adapter import instance_manager
from services.sync_coordinator import SyncCoordinator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'yabook_db')]

# Initialize sync coordinator
sync_coordinator = SyncCoordinator(db, instance_manager)

# Create the main app
app = FastAPI(title="YABOOK PhotoPrism Integration API", version="1.0.0")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure file upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Legacy endpoints for backward compatibility
@api_router.get("/")
async def root():
    return {"message": "YABOOK PhotoPrism Integration API", "version": "1.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# School Management Endpoints
@api_router.post("/schools", response_model=School)
async def create_school(school_data: SchoolCreate):
    """Create a new school"""
    try:
        # Check if school with same slug exists
        existing = await db.schools.find_one({"slug": school_data.slug})
        if existing:
            raise HTTPException(status_code=400, detail="School with this slug already exists")
        
        school = School(**school_data.dict())
        await db.schools.insert_one(school.dict())
        return school
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools", response_model=List[School])
async def list_schools():
    """List all schools"""
    try:
        schools = await db.schools.find({"is_active": True}).to_list(100)
        return [School(**school) for school in schools]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str):
    """Get a specific school"""
    try:
        school_data = await db.schools.find_one({"id": school_id})
        if not school_data:
            raise HTTPException(status_code=404, detail="School not found")
        return School(**school_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PhotoPrism Instance Management
@api_router.post("/schools/{school_id}/photoprism-instance", response_model=PhotoPrismInstance)
async def create_photoprism_instance(school_id: str, instance_data: PhotoPrismInstanceCreate):
    """Create PhotoPrism instance for a school"""
    try:
        # Verify school exists
        school = await db.schools.find_one({"id": school_id})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Check if instance already exists for this school
        existing = await db.photoprism_instances.find_one({"school_id": school_id})
        if existing:
            raise HTTPException(status_code=400, detail="PhotoPrism instance already exists for this school")
        
        # In production, hash the password properly
        instance_dict = instance_data.dict()
        instance_dict["admin_password_hash"] = instance_dict.pop("admin_password")  # Should be hashed
        
        instance = PhotoPrismInstance(**instance_dict)
        await db.photoprism_instances.insert_one(instance.dict())
        
        # Test the connection
        adapter = instance_manager.get_instance_for_school(school_id, {
            "base_url": instance.base_url,
            "admin_username": instance.admin_username,
            "admin_password": instance.admin_password_hash
        })
        
        is_healthy = await adapter.health_check()
        if is_healthy:
            await db.photoprism_instances.update_one(
                {"id": instance.id},
                {"$set": {"health_check_at": datetime.utcnow()}}
            )
        
        return instance
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools/{school_id}/photoprism-instance", response_model=PhotoPrismInstance)
async def get_photoprism_instance(school_id: str):
    """Get PhotoPrism instance for a school"""
    try:
        instance_data = await db.photoprism_instances.find_one({"school_id": school_id})
        if not instance_data:
            raise HTTPException(status_code=404, detail="PhotoPrism instance not found for this school")
        return PhotoPrismInstance(**instance_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools/{school_id}/photoprism-instance/health", response_model=InstanceHealthResponse)
async def check_instance_health(school_id: str):
    """Check health of PhotoPrism instance"""
    try:
        instance_data = await db.photoprism_instances.find_one({"school_id": school_id})
        if not instance_data:
            raise HTTPException(status_code=404, detail="PhotoPrism instance not found")
        
        instance = PhotoPrismInstance(**instance_data)
        
        adapter = instance_manager.get_instance_for_school(school_id, {
            "base_url": instance.base_url,
            "admin_username": instance.admin_username,
            "admin_password": instance.admin_password_hash
        })
        
        is_healthy = await adapter.health_check()
        
        # Update health check timestamp
        health_check_time = datetime.utcnow()
        await db.photoprism_instances.update_one(
            {"id": instance.id},
            {"$set": {"health_check_at": health_check_time}}
        )
        
        return InstanceHealthResponse(
            instance_id=instance.id,
            status=instance.status,
            last_health_check=health_check_time,
            last_sync=instance.last_sync_at,
            sync_errors=instance.sync_errors,
            is_healthy=is_healthy
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Photo Management Endpoints
@api_router.post("/schools/{school_id}/photos/upload", response_model=PhotoResponse)
async def upload_photo(
    school_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None)
):
    """Upload a photo for a school"""
    try:
        # Verify school exists
        school = await db.schools.find_one({"id": school_id})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Create unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / school_id / unique_filename
        
        # Create school directory if it doesn't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Get file info
        file_size = len(content)
        mime_type = magic.from_buffer(content[:1024], mime=True)
        
        # Create photo record
        photo_data = PhotoCreate(
            school_id=school_id,
            filename=file.filename,
            original_path=str(file_path),
            file_size=file_size,
            mime_type=mime_type,
            title=title,
            description=description,
            uploaded_by=uploaded_by
        )
        
        photo = Photo(**photo_data.dict())
        await db.photos.insert_one(photo.dict())
        
        # Queue for sync to PhotoPrism
        background_tasks.add_task(sync_coordinator.sync_photo_to_photoprism, photo.id)
        
        return PhotoResponse(**photo.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools/{school_id}/photos", response_model=PhotoSearchResponse)
async def list_photos(
    school_id: str,
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None
):
    """List photos for a school"""
    try:
        # Build query
        query = {"school_id": school_id}
        if status:
            query["status"] = status
        
        # Calculate pagination
        skip = (page - 1) * per_page
        
        # Get photos
        photos = await db.photos.find(query).skip(skip).limit(per_page).to_list(None)
        total = await db.photos.count_documents(query)
        
        photo_responses = [PhotoResponse(**photo) for photo in photos]
        
        return PhotoSearchResponse(
            photos=photo_responses,
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/schools/{school_id}/photos/search")
async def search_photos(
    school_id: str,
    q: str,
    count: int = 20,
    offset: int = 0
):
    """Search photos using PhotoPrism AI"""
    try:
        # Get PhotoPrism instance
        instance_data = await db.photoprism_instances.find_one({"school_id": school_id})
        if not instance_data:
            raise HTTPException(status_code=404, detail="PhotoPrism instance not found")
        
        instance = PhotoPrismInstance(**instance_data)
        adapter = instance_manager.get_instance_for_school(school_id, {
            "base_url": instance.base_url,
            "admin_username": instance.admin_username,
            "admin_password": instance.admin_password_hash
        })
        
        # Search in PhotoPrism
        results = await adapter.search_photos(q, count, offset)
        if results is None:
            # Return empty results instead of error if PhotoPrism search fails
            results = []
        
        return {"results": results, "query": q, "count": len(results)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Sync Management Endpoints
@api_router.get("/schools/{school_id}/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(school_id: str):
    """Get sync status for a school"""
    try:
        status = await sync_coordinator.get_sync_status(school_id)
        return SyncStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/schools/{school_id}/sync/retry")
async def retry_failed_syncs(school_id: str, limit: int = 10):
    """Retry failed sync operations"""
    try:
        photo_ids = await sync_coordinator.retry_failed_syncs(school_id, limit)
        return {"message": f"Retrying sync for {len(photo_ids)} photos", "photo_ids": photo_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/schools/{school_id}/reconcile")
async def reconcile_photos(school_id: str, dry_run: bool = True):
    """Reconcile photos between YABOOK and PhotoPrism"""
    try:
        report = await sync_coordinator.reconcile_school_photos(school_id, dry_run)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/schools/{school_id}/sync/batch")
async def batch_sync_photos(school_id: str, photo_ids: List[str]):
    """Batch sync specific photos"""
    try:
        results = await sync_coordinator.batch_sync_photos(photo_ids)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("YABOOK PhotoPrism Integration API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("YABOOK PhotoPrism Integration API shutdown")