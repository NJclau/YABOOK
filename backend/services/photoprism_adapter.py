import aiohttp
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class PhotoPrismAdapter:
    """
    Primary interface for all PhotoPrism operations
    Handles authentication, photo upload, search, and API communication
    """
    
    def __init__(self, base_url: str, admin_username: str, admin_password: str):
        self.base_url = base_url.rstrip('/')
        self.admin_username = admin_username
        self.admin_password = admin_password
        self.session_token: Optional[str] = None
        self.session_expires: Optional[datetime] = None
        self.timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes
        
    async def _ensure_session(self) -> bool:
        """
        Ensure we have a valid session token
        """
        if (self.session_token and self.session_expires 
            and datetime.utcnow() < self.session_expires - timedelta(minutes=5)):
            return True
            
        return await self._authenticate()
    
    async def _authenticate(self) -> bool:
        """
        Authenticate with PhotoPrism and get session token
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                auth_data = {
                    "username": self.admin_username,
                    "password": self.admin_password
                }
                
                async with session.post(
                    f"{self.base_url}/api/v1/session",
                    json=auth_data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.session_token = data.get("id")
                        # Set expiry to 50 minutes (PhotoPrism default is 1 hour)
                        self.session_expires = datetime.utcnow() + timedelta(minutes=50)
                        logger.info("PhotoPrism authentication successful")
                        return True
                    else:
                        logger.error(f"PhotoPrism authentication failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"PhotoPrism authentication error: {str(e)}")
            return False
    
    async def upload_photo(self, file_path: str, filename: str) -> Optional[Dict[str, Any]]:
        """
        Upload a photo to PhotoPrism
        """
        if not await self._ensure_session():
            logger.error("Failed to authenticate with PhotoPrism")
            return None
            
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                with open(file_path, 'rb') as file:
                    data = aiohttp.FormData()
                    data.add_field('files', file, filename=filename)
                    
                    headers = {"X-Session-ID": self.session_token}
                    
                    async with session.post(
                        f"{self.base_url}/api/v1/upload/{filename}",
                        data=data,
                        headers=headers
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            logger.info(f"Photo uploaded successfully: {filename}")
                            return result
                        else:
                            error_msg = await response.text()
                            logger.error(f"Photo upload failed: {response.status} - {error_msg}")
                            return None
                            
        except Exception as e:
            logger.error(f"Photo upload error: {str(e)}")
            return None
    
    async def search_photos(self, query: str, count: int = 20, offset: int = 0) -> Optional[List[Dict[str, Any]]]:
        """
        Search photos using PhotoPrism AI-powered search
        """
        if not await self._ensure_session():
            logger.error("Failed to authenticate with PhotoPrism")
            return None
            
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                params = {
                    "q": query,
                    "count": count,
                    "offset": offset
                }
                
                headers = {"X-Session-ID": self.session_token}
                
                async with session.get(
                    f"{self.base_url}/api/v1/photos",
                    params=params,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        results = await response.json()
                        logger.info(f"Photo search successful: {len(results)} results")
                        return results
                    else:
                        error_msg = await response.text()
                        logger.error(f"Photo search failed: {response.status} - {error_msg}")
                        return None
                        
        except Exception as e:
            logger.error(f"Photo search error: {str(e)}")
            return None
    
    async def get_photo_metadata(self, photo_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed metadata for a specific photo
        """
        if not await self._ensure_session():
            logger.error("Failed to authenticate with PhotoPrism")
            return None
            
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {"X-Session-ID": self.session_token}
                
                async with session.get(
                    f"{self.base_url}/api/v1/photos/{photo_uuid}",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        metadata = await response.json()
                        logger.info(f"Photo metadata retrieved: {photo_uuid}")
                        return metadata
                    else:
                        error_msg = await response.text()
                        logger.error(f"Photo metadata retrieval failed: {response.status} - {error_msg}")
                        return None
                        
        except Exception as e:
            logger.error(f"Photo metadata error: {str(e)}")
            return None
    
    async def health_check(self) -> bool:
        """
        Check if PhotoPrism instance is healthy
        """
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(f"{self.base_url}/api/v1/status") as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"PhotoPrism health check error: {str(e)}")
            return False
    
    async def trigger_indexing(self) -> bool:
        """
        Trigger PhotoPrism to index new photos
        """
        if not await self._ensure_session():
            logger.error("Failed to authenticate with PhotoPrism")
            return False
            
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {"X-Session-ID": self.session_token}
                
                async with session.post(
                    f"{self.base_url}/api/v1/index",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        logger.info("PhotoPrism indexing triggered successfully")
                        return True
                    else:
                        error_msg = await response.text()
                        logger.error(f"PhotoPrism indexing failed: {response.status} - {error_msg}")
                        return False
                        
        except Exception as e:
            logger.error(f"PhotoPrism indexing error: {str(e)}")
            return False

class PhotoPrismInstanceManager:
    """
    Manages multiple PhotoPrism instances for different schools
    """
    
    def __init__(self):
        self._instances: Dict[str, PhotoPrismAdapter] = {}
    
    def get_instance_for_school(self, school_id: str, instance_config: Dict[str, Any]) -> PhotoPrismAdapter:
        """
        Get or create PhotoPrism adapter instance for a school
        """
        if school_id not in self._instances:
            self._instances[school_id] = PhotoPrismAdapter(
                base_url=instance_config["base_url"],
                admin_username=instance_config["admin_username"],
                admin_password=instance_config["admin_password"]
            )
        
        return self._instances[school_id]
    
    def remove_instance(self, school_id: str):
        """
        Remove cached instance for a school
        """
        if school_id in self._instances:
            del self._instances[school_id]
    
    async def health_check_all(self) -> Dict[str, bool]:
        """
        Check health of all cached instances
        """
        results = {}
        for school_id, adapter in self._instances.items():
            results[school_id] = await adapter.health_check()
        return results

# Global instance manager
instance_manager = PhotoPrismInstanceManager()