import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection
from .models import (
    Photo, PhotoPrismSyncEvent, PhotoPrismInstance, 
    SyncEventType, SyncEventStatus, PhotoStatus
)
from .photoprism_adapter import PhotoPrismInstanceManager
import json

logger = logging.getLogger(__name__)

class SyncCoordinator:
    """
    Manages data consistency between YABOOK and PhotoPrism
    Handles sync operations, error recovery, and reconciliation
    """
    
    def __init__(self, db, instance_manager: PhotoPrismInstanceManager):
        self.db = db
        self.instance_manager = instance_manager
        self.max_retry_attempts = 3
        self.retry_delays = [5, 15, 60]  # seconds
        
    async def sync_photo_to_photoprism(self, photo_id: str) -> bool:
        """
        Sync a single photo to PhotoPrism with retry logic
        """
        try:
            # Get photo details
            photo_data = await self.db.photos.find_one({"id": photo_id})
            if not photo_data:
                logger.error(f"Photo not found: {photo_id}")
                return False
            
            photo = Photo(**photo_data)
            
            # Get PhotoPrism instance for the school
            instance_data = await self.db.photoprism_instances.find_one({
                "school_id": photo.school_id,
                "status": "active"
            })
            
            if not instance_data:
                logger.error(f"No active PhotoPrism instance for school: {photo.school_id}")
                return False
            
            instance = PhotoPrismInstance(**instance_data)
            
            # Create sync event
            sync_event = PhotoPrismSyncEvent(
                photo_id=photo_id,
                instance_id=instance.id,
                event_type=SyncEventType.UPLOAD,
                payload={"filename": photo.filename, "file_path": photo.original_path}
            )
            
            await self.db.photoprism_sync_events.insert_one(sync_event.dict())
            
            # Get PhotoPrism adapter
            adapter = self.instance_manager.get_instance_for_school(
                photo.school_id,
                {
                    "base_url": instance.base_url,
                    "admin_username": instance.admin_username,
                    "admin_password": instance.admin_password_hash  # In real app, decrypt this
                }
            )
            
            # Attempt sync with retry logic
            for attempt in range(self.max_retry_attempts):
                try:
                    start_time = datetime.utcnow()
                    
                    # Update sync event status
                    await self.db.photoprism_sync_events.update_one(
                        {"id": sync_event.id},
                        {"$set": {"event_status": SyncEventStatus.PROCESSING, "updated_at": start_time}}
                    )
                    
                    # Upload to PhotoPrism
                    result = await adapter.upload_photo(photo.original_path, photo.filename)
                    
                    processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                    
                    if result:
                        # Success - update photo and sync event
                        await self.db.photos.update_one(
                            {"id": photo_id},
                            {
                                "$set": {
                                    "status": PhotoStatus.SYNCED,
                                    "photoprism_uuid": result.get("uuid"),
                                    "photoprism_filename": result.get("filename"),
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        await self.db.photoprism_sync_events.update_one(
                            {"id": sync_event.id},
                            {
                                "$set": {
                                    "event_status": SyncEventStatus.SUCCESS,
                                    "processing_time_ms": processing_time,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        logger.info(f"Photo synced successfully: {photo_id}")
                        return True
                    else:
                        # Failed - check if we should retry
                        if attempt < self.max_retry_attempts - 1:
                            delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                            logger.warning(f"Sync attempt {attempt + 1} failed for photo {photo_id}, retrying in {delay}s")
                            await asyncio.sleep(delay)
                        else:
                            # Final failure
                            await self.db.photos.update_one(
                                {"id": photo_id},
                                {"$set": {"status": PhotoStatus.FAILED, "updated_at": datetime.utcnow()}}
                            )
                            
                            await self.db.photoprism_sync_events.update_one(
                                {"id": sync_event.id},
                                {
                                    "$set": {
                                        "event_status": SyncEventStatus.FAILED,
                                        "processing_time_ms": processing_time,
                                        "error_details": "Upload failed after all retry attempts",
                                        "updated_at": datetime.utcnow()
                                    }
                                }
                            )
                            
                            logger.error(f"Photo sync failed after all attempts: {photo_id}")
                            return False
                            
                except Exception as e:
                    error_msg = str(e)
                    processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                    
                    if attempt < self.max_retry_attempts - 1:
                        delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                        logger.warning(f"Sync attempt {attempt + 1} error for photo {photo_id}: {error_msg}, retrying in {delay}s")
                        await asyncio.sleep(delay)
                    else:
                        # Final failure
                        await self.db.photos.update_one(
                            {"id": photo_id},
                            {"$set": {"status": PhotoStatus.FAILED, "updated_at": datetime.utcnow()}}
                        )
                        
                        await self.db.photoprism_sync_events.update_one(
                            {"id": sync_event.id},
                            {
                                "$set": {
                                    "event_status": SyncEventStatus.FAILED,
                                    "processing_time_ms": processing_time,
                                    "error_details": error_msg,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        logger.error(f"Photo sync error after all attempts: {photo_id} - {error_msg}")
                        return False
                        
        except Exception as e:
            logger.error(f"Critical sync error for photo {photo_id}: {str(e)}")
            return False
            
        return False
    
    async def batch_sync_photos(self, photo_ids: List[str], max_concurrent: int = 5) -> Dict[str, bool]:
        """
        Sync multiple photos concurrently with rate limiting
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def sync_with_semaphore(photo_id: str) -> tuple[str, bool]:
            async with semaphore:
                result = await self.sync_photo_to_photoprism(photo_id)
                return photo_id, result
        
        tasks = [sync_with_semaphore(photo_id) for photo_id in photo_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        sync_results = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch sync error: {str(result)}")
            else:
                photo_id, success = result
                sync_results[photo_id] = success
        
        return sync_results
    
    async def reconcile_school_photos(self, school_id: str, dry_run: bool = True) -> Dict[str, Any]:
        """
        Reconcile photos between YABOOK and PhotoPrism for a school
        """
        reconciliation_report = {
            "school_id": school_id,
            "dry_run": dry_run,
            "started_at": datetime.utcnow(),
            "yabook_photos": 0,
            "photoprism_photos": 0,
            "orphaned_yabook": [],
            "orphaned_photoprism": [],
            "sync_conflicts": [],
            "actions_taken": []
        }
        
        try:
            # Get all photos in YABOOK for this school
            yabook_photos = await self.db.photos.find({"school_id": school_id}).to_list(None)
            reconciliation_report["yabook_photos"] = len(yabook_photos)
            
            # Get PhotoPrism instance
            instance_data = await self.db.photoprism_instances.find_one({
                "school_id": school_id,
                "status": "active"
            })
            
            if not instance_data:
                reconciliation_report["error"] = "No active PhotoPrism instance found"
                return reconciliation_report
            
            instance = PhotoPrismInstance(**instance_data)
            adapter = self.instance_manager.get_instance_for_school(
                school_id,
                {
                    "base_url": instance.base_url,
                    "admin_username": instance.admin_username,
                    "admin_password": instance.admin_password_hash
                }
            )
            
            # Get all photos from PhotoPrism
            photoprism_photos = await adapter.search_photos("", count=10000)  # Get all photos
            if photoprism_photos:
                reconciliation_report["photoprism_photos"] = len(photoprism_photos)
                
                # Create lookup dictionaries
                yabook_by_uuid = {p.get("photoprism_uuid"): p for p in yabook_photos if p.get("photoprism_uuid")}
                photoprism_by_uuid = {p.get("uuid"): p for p in photoprism_photos if p.get("uuid")}
                
                # Find orphaned photos
                for photo in yabook_photos:
                    if photo.get("photoprism_uuid") and photo["photoprism_uuid"] not in photoprism_by_uuid:
                        reconciliation_report["orphaned_yabook"].append({
                            "id": photo["id"],
                            "filename": photo["filename"],
                            "photoprism_uuid": photo["photoprism_uuid"]
                        })
                
                for photo in photoprism_photos:
                    if photo.get("uuid") and photo["uuid"] not in yabook_by_uuid:
                        reconciliation_report["orphaned_photoprism"].append({
                            "uuid": photo["uuid"],
                            "filename": photo.get("filename", "unknown")
                        })
                
                # If not dry run, perform cleanup actions
                if not dry_run:
                    # Reset orphaned YABOOK photos to pending for re-sync
                    for orphan in reconciliation_report["orphaned_yabook"]:
                        await self.db.photos.update_one(
                            {"id": orphan["id"]},
                            {
                                "$set": {
                                    "status": PhotoStatus.PENDING,
                                    "photoprism_uuid": None,
                                    "photoprism_filename": None,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        reconciliation_report["actions_taken"].append(f"Reset photo {orphan['id']} to pending")
            
            reconciliation_report["completed_at"] = datetime.utcnow()
            reconciliation_report["duration_seconds"] = (
                reconciliation_report["completed_at"] - reconciliation_report["started_at"]
            ).total_seconds()
            
        except Exception as e:
            reconciliation_report["error"] = str(e)
            logger.error(f"Reconciliation error for school {school_id}: {str(e)}")
        
        return reconciliation_report
    
    async def get_sync_status(self, school_id: str) -> Dict[str, Any]:
        """
        Get sync status for a school
        """
        try:
            # Count photos by status
            pipeline = [
                {"$match": {"school_id": school_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            
            status_counts = await self.db.photos.aggregate(pipeline).to_list(None)
            
            total_photos = sum(item["count"] for item in status_counts)
            synced_photos = next((item["count"] for item in status_counts if item["_id"] == PhotoStatus.SYNCED), 0)
            pending_photos = next((item["count"] for item in status_counts if item["_id"] == PhotoStatus.PENDING), 0)
            failed_photos = next((item["count"] for item in status_counts if item["_id"] == PhotoStatus.FAILED), 0)
            
            # Get last sync time
            last_sync_event = await self.db.photoprism_sync_events.find_one(
                {"event_status": SyncEventStatus.SUCCESS},
                sort=[("updated_at", -1)]
            )
            
            last_sync = last_sync_event["updated_at"] if last_sync_event else None
            
            # Count active sync jobs
            active_sync_jobs = await self.db.photoprism_sync_events.count_documents({
                "event_status": {"$in": [SyncEventStatus.PENDING, SyncEventStatus.PROCESSING]}
            })
            
            return {
                "school_id": school_id,
                "total_photos": total_photos,
                "synced_photos": synced_photos,
                "pending_photos": pending_photos,
                "failed_photos": failed_photos,
                "last_sync": last_sync,
                "active_sync_jobs": active_sync_jobs,
                "sync_percentage": round((synced_photos / total_photos) * 100, 2) if total_photos > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting sync status for school {school_id}: {str(e)}")
            return {
                "school_id": school_id,
                "error": str(e)
            }
    
    async def retry_failed_syncs(self, school_id: str, limit: int = 10) -> List[str]:
        """
        Retry failed sync operations for a school
        """
        try:
            # Find failed photos
            failed_photos = await self.db.photos.find({
                "school_id": school_id,
                "status": PhotoStatus.FAILED
            }).limit(limit).to_list(None)
            
            photo_ids = [photo["id"] for photo in failed_photos]
            
            if photo_ids:
                # Reset status to pending
                await self.db.photos.update_many(
                    {"id": {"$in": photo_ids}},
                    {"$set": {"status": PhotoStatus.PENDING, "updated_at": datetime.utcnow()}}
                )
                
                # Start batch sync
                await self.batch_sync_photos(photo_ids)
                
            return photo_ids
            
        except Exception as e:
            logger.error(f"Error retrying failed syncs for school {school_id}: {str(e)}")
            return []