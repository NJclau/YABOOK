from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums
class PhotoPrismInstanceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"

class SyncEventType(str, Enum):
    UPLOAD = "upload"
    UPDATE = "update"
    DELETE = "delete"
    RECONCILE = "reconcile"

class SyncEventStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"

class PhotoStatus(str, Enum):
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"

# Core Models
class School(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    settings: Dict[str, Any] = Field(default_factory=dict)

class SchoolCreate(BaseModel):
    name: str
    slug: str
    settings: Optional[Dict[str, Any]] = None

class PhotoPrismInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    instance_name: str
    base_url: str
    admin_username: str
    admin_password_hash: str
    api_token: Optional[str] = None
    status: PhotoPrismInstanceStatus = PhotoPrismInstanceStatus.ACTIVE
    health_check_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    sync_errors: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoPrismInstanceCreate(BaseModel):
    school_id: str
    instance_name: str
    base_url: str
    admin_username: str
    admin_password: str  # This will be hashed before storing
    metadata: Optional[Dict[str, Any]] = None

class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    filename: str
    original_path: str
    file_size: int
    mime_type: str
    photoprism_uuid: Optional[str] = None
    photoprism_filename: Optional[str] = None
    status: PhotoStatus = PhotoStatus.PENDING
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    faces: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoCreate(BaseModel):
    school_id: str
    filename: str
    original_path: str
    file_size: int
    mime_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    uploaded_by: Optional[str] = None

class PhotoPrismSyncEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    photo_id: str
    instance_id: str
    event_type: SyncEventType
    event_status: SyncEventStatus = SyncEventStatus.PENDING
    processing_time_ms: Optional[int] = None
    error_details: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoPrismSyncEventCreate(BaseModel):
    photo_id: str
    instance_id: str
    event_type: SyncEventType
    payload: Optional[Dict[str, Any]] = None

# Response Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class PhotoResponse(BaseModel):
    id: str
    school_id: str
    filename: str
    file_size: int
    mime_type: str
    status: PhotoStatus
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: List[str]
    faces: List[Dict[str, Any]]
    photoprism_uuid: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class PhotoSearchResponse(BaseModel):
    photos: List[PhotoResponse]
    total: int
    page: int
    per_page: int

class InstanceHealthResponse(BaseModel):
    instance_id: str
    status: PhotoPrismInstanceStatus
    last_health_check: Optional[datetime]
    last_sync: Optional[datetime]
    sync_errors: Optional[Dict[str, Any]]
    is_healthy: bool

class SyncStatusResponse(BaseModel):
    total_photos: int
    synced_photos: int
    pending_photos: int
    failed_photos: int
    last_sync: Optional[datetime]
    active_sync_jobs: int