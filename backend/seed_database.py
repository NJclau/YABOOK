#!/usr/bin/env python3
"""
Comprehensive database seeding for YABOOK v2.0
Sets up multi-tenant structure with sample data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid
from passlib.context import CryptContext

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Sample data
SCHOOLS = [
    {
        "id": "school-1",
        "name": "Lincoln High School",
        "district": "Lincoln Unified School District",
        "address": "123 Education St, Lincoln, CA 95648",
        "settings": {
            "timezone": "America/Los_Angeles",
            "academic_calendar": "semester",
            "photo_consent_required": True
        },
        "subscription_tier": "premium",
        "max_users": 500,
        "max_storage_gb": 100,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "school-2", 
        "name": "Roosevelt Middle School",
        "district": "Roosevelt School District",
        "address": "456 Learning Ave, Roosevelt, CA 94567",
        "settings": {
            "timezone": "America/Los_Angeles",
            "academic_calendar": "trimester",
            "photo_consent_required": True
        },
        "subscription_tier": "basic",
        "max_users": 200,
        "max_storage_gb": 50,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

USERS = [
    # Super Admin
    {
        "id": "user-super-admin",
        "email": "admin@yabook.com",
        "name": "Super Administrator",
        "password_hash": hash_password("admin123"),
        "role": "super_admin",
        "school_id": None,
        "is_active": True,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    
    # Lincoln High School Users
    {
        "id": "user-lincoln-admin",
        "email": "admin@lincolnhigh.edu",
        "name": "Sarah Johnson",
        "password_hash": hash_password("lincoln123"),
        "role": "school_admin",
        "school_id": "school-1",
        "is_active": True,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "user-lincoln-teacher",
        "email": "teacher@lincolnhigh.edu",
        "name": "Michael Chen",
        "password_hash": hash_password("teacher123"),
        "role": "admin",
        "school_id": "school-1",
        "is_active": True,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "user-lincoln-student",
        "email": "student@lincolnhigh.edu",
        "name": "Emma Davis",
        "password_hash": hash_password("student123"),
        "role": "editor",
        "school_id": "school-1",
        "is_active": True,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    
    # Roosevelt Middle School Users
    {
        "id": "user-roosevelt-admin",
        "email": "admin@rooseveltmiddle.edu",
        "name": "David Martinez",
        "password_hash": hash_password("roosevelt123"),
        "role": "school_admin",
        "school_id": "school-2",
        "is_active": True,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

PHOTOPRISM_INSTANCES = [
    {
        "id": "pp-instance-1",
        "school_id": "school-1",
        "instance_name": "lincoln-photoprism",
        "base_url": "http://photoprism-lincoln:2342",
        "api_token": "demo-token-lincoln-12345",
        "status": "active",
        "config": {
            "max_photos": 10000,
            "ai_enabled": True,
            "face_detection": True
        },
        "resource_limits": {
            "cpu_limit": "2",
            "memory_limit": "4Gi",
            "storage_limit": "100Gi"
        },
        "last_health_check": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "pp-instance-2",
        "school_id": "school-2",
        "instance_name": "roosevelt-photoprism",
        "base_url": "http://photoprism-roosevelt:2342",
        "api_token": "demo-token-roosevelt-67890",
        "status": "active",
        "config": {
            "max_photos": 5000,
            "ai_enabled": True,
            "face_detection": False
        },
        "resource_limits": {
            "cpu_limit": "1",
            "memory_limit": "2Gi",
            "storage_limit": "50Gi"
        },
        "last_health_check": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

PROJECTS = [
    {
        "id": "project-lincoln-2025",
        "name": "Class of 2025 Yearbook",
        "description": "Celebrating the achievements and memories of Lincoln High School's Class of 2025",
        "school_id": "school-1",
        "owner_id": "user-lincoln-teacher",
        "academic_year": "2024-2025",
        "settings": {
            "theme": "classic",
            "cover_design": "traditional",
            "page_count": 200,
            "deadline": "2025-05-15"
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "project-lincoln-sports",
        "name": "2024 Sports Highlights",
        "description": "Capturing the best moments from our athletic programs",
        "school_id": "school-1",
        "owner_id": "user-lincoln-student",
        "academic_year": "2024-2025",
        "settings": {
            "theme": "modern",
            "cover_design": "sports",
            "page_count": 50
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": "project-roosevelt-2025",
        "name": "Roosevelt Memories 2025",
        "description": "A collection of wonderful moments from our middle school journey",
        "school_id": "school-2",
        "owner_id": "user-roosevelt-admin",
        "academic_year": "2024-2025",
        "settings": {
            "theme": "fun",
            "cover_design": "colorful",
            "page_count": 80
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

# Enhanced templates with school-specific and global templates
ENHANCED_TEMPLATES = [
    # Global Templates (existing)
    {
        "id": "classic-yearbook-1",
        "name": "Classic Yearbook Layout",
        "description": "Traditional yearbook page with photo grid and text areas",
        "category": "yearbook",
        "is_public": True,
        "school_id": None,
        "layout_schema": {
            "elements": [
                {
                    "id": "header-text",
                    "type": "text",
                    "x": 50,
                    "y": 50,
                    "width": 600,
                    "height": 80,
                    "content": {"text": "Class of 2025", "fontSize": 32, "fontWeight": "bold"},
                    "styles": {"textAlign": "center", "color": "#1a365d"}
                },
                {
                    "id": "photo-grid-1",
                    "type": "photo",
                    "x": 100,
                    "y": 150,
                    "width": 200,
                    "height": 200,
                    "content": {"placeholder": "Student Photo 1"},
                    "styles": {"borderRadius": "8px", "border": "2px solid #e2e8f0"}
                },
                {
                    "id": "photo-grid-2",
                    "type": "photo",
                    "x": 350,
                    "y": 150,
                    "width": 200,
                    "height": 200,
                    "content": {"placeholder": "Student Photo 2"},
                    "styles": {"borderRadius": "8px", "border": "2px solid #e2e8f0"}
                },
                {
                    "id": "description-text",
                    "type": "text",
                    "x": 100,
                    "y": 400,
                    "width": 450,
                    "height": 150,
                    "content": {"text": "Add your class memories and achievements here...", "fontSize": 16},
                    "styles": {"textAlign": "left", "color": "#4a5568", "lineHeight": "1.6"}
                }
            ],
            "background": {"color": "#ffffff"},
            "dimensions": {"width": 800, "height": 600}
        },
        "created_at": datetime.utcnow()
    },
    {
        "id": "modern-showcase-1",
        "name": "Modern Showcase",
        "description": "Clean, modern layout with emphasis on large photos",
        "category": "showcase",
        "is_public": True,
        "school_id": None,
        "layout_schema": {
            "elements": [
                {
                    "id": "hero-photo",
                    "type": "photo",
                    "x": 50,
                    "y": 50,
                    "width": 500,
                    "height": 300,
                    "content": {"placeholder": "Hero Photo"},
                    "styles": {"borderRadius": "12px", "boxShadow": "0 4px 6px rgba(0,0,0,0.1)"}
                },
                {
                    "id": "title-text",
                    "type": "text",
                    "x": 600,
                    "y": 100,
                    "width": 250,
                    "height": 60,
                    "content": {"text": "Featured Moment", "fontSize": 28, "fontWeight": "bold"},
                    "styles": {"color": "#2d3748"}
                },
                {
                    "id": "subtitle-text",
                    "type": "text",
                    "x": 600,
                    "y": 180,
                    "width": 250,
                    "height": 120,
                    "content": {"text": "Capture the essence of your special moment with this modern layout design.", "fontSize": 14},
                    "styles": {"color": "#718096", "lineHeight": "1.5"}
                }
            ],
            "background": {"color": "#f7fafc"},
            "dimensions": {"width": 900, "height": 400}
        },
        "created_at": datetime.utcnow()
    },
    {
        "id": "collage-style-1",
        "name": "Photo Collage",
        "description": "Dynamic collage layout for multiple photos",
        "category": "collage",
        "is_public": True,
        "school_id": None,
        "layout_schema": {
            "elements": [
                {
                    "id": "collage-photo-1",
                    "type": "photo",
                    "x": 50,
                    "y": 50,
                    "width": 150,
                    "height": 150,
                    "content": {"placeholder": "Photo 1"},
                    "styles": {"borderRadius": "50%", "border": "3px solid #ffffff", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"}
                },
                {
                    "id": "collage-photo-2",
                    "type": "photo",
                    "x": 220,
                    "y": 100,
                    "width": 180,
                    "height": 120,
                    "content": {"placeholder": "Photo 2"},
                    "styles": {"borderRadius": "8px", "transform": "rotate(-5deg)"}
                },
                {
                    "id": "collage-photo-3",
                    "type": "photo",
                    "x": 420,
                    "y": 80,
                    "width": 160,
                    "height": 160,
                    "content": {"placeholder": "Photo 3"},
                    "styles": {"borderRadius": "8px", "transform": "rotate(10deg)"}
                },
                {
                    "id": "memories-text",
                    "type": "text",
                    "x": 100,
                    "y": 280,
                    "width": 400,
                    "height": 80,
                    "content": {"text": "Memories that last forever", "fontSize": 24, "fontWeight": "bold"},
                    "styles": {"textAlign": "center", "color": "#805ad5"}
                }
            ],
            "background": {"color": "#edf2f7"},
            "dimensions": {"width": 650, "height": 400}
        },
        "created_at": datetime.utcnow()
    },
    
    # School-specific templates
    {
        "id": "lincoln-branded-1",
        "name": "Lincoln High School Official",
        "description": "Branded template with Lincoln High School colors and logo placement",
        "category": "branded",
        "is_public": False,
        "school_id": "school-1",
        "layout_schema": {
            "elements": [
                {
                    "id": "school-header",
                    "type": "text",
                    "x": 50,
                    "y": 30,
                    "width": 700,
                    "height": 60,
                    "content": {"text": "LINCOLN HIGH SCHOOL", "fontSize": 36, "fontWeight": "bold"},
                    "styles": {"textAlign": "center", "color": "#1e3a8a"}
                },
                {
                    "id": "main-photo",
                    "type": "photo",
                    "x": 200,
                    "y": 120,
                    "width": 400,
                    "height": 300,
                    "content": {"placeholder": "Main Photo"},
                    "styles": {"borderRadius": "12px", "border": "3px solid #1e3a8a"}
                },
                {
                    "id": "school-motto",
                    "type": "text",
                    "x": 50,
                    "y": 450,
                    "width": 700,
                    "height": 40,
                    "content": {"text": "Excellence • Leadership • Community", "fontSize": 18},
                    "styles": {"textAlign": "center", "color": "#374151", "fontStyle": "italic"}
                }
            ],
            "background": {"color": "#f8fafc"},
            "dimensions": {"width": 800, "height": 550}
        },
        "created_at": datetime.utcnow()
    },
    {
        "id": "roosevelt-fun-1",
        "name": "Roosevelt Fun Layout",
        "description": "Colorful and engaging template perfect for middle school memories",
        "category": "fun",
        "is_public": False,
        "school_id": "school-2",
        "layout_schema": {
            "elements": [
                {
                    "id": "fun-title",
                    "type": "text",
                    "x": 100,
                    "y": 50,
                    "width": 500,
                    "height": 80,
                    "content": {"text": "Roosevelt Memories!", "fontSize": 42, "fontWeight": "bold"},
                    "styles": {"textAlign": "center", "color": "#dc2626", "textShadow": "2px 2px 4px rgba(0,0,0,0.3)"}
                },
                {
                    "id": "photo-circle-1",
                    "type": "photo",
                    "x": 80,
                    "y": 150,
                    "width": 120,
                    "height": 120,
                    "content": {"placeholder": "Fun Photo 1"},
                    "styles": {"borderRadius": "50%", "border": "4px solid #fbbf24"}
                },
                {
                    "id": "photo-circle-2",
                    "type": "photo",
                    "x": 480,
                    "y": 150,
                    "width": 120,
                    "height": 120,
                    "content": {"placeholder": "Fun Photo 2"},
                    "styles": {"borderRadius": "50%", "border": "4px solid #10b981"}
                },
                {
                    "id": "center-text",
                    "type": "text",
                    "x": 220,
                    "y": 180,
                    "width": 260,
                    "height": 60,
                    "content": {"text": "Amazing Year!", "fontSize": 24, "fontWeight": "bold"},
                    "styles": {"textAlign": "center", "color": "#7c3aed"}
                }
            ],
            "background": {"color": "#fef3c7"},
            "dimensions": {"width": 700, "height": 350}
        },
        "created_at": datetime.utcnow()
    }
]

TEAM_MEMBERS = [
    {
        "id": "team-1",
        "project_id": "project-lincoln-2025",
        "user_id": "user-lincoln-student",
        "user_email": "student@lincolnhigh.edu",
        "role": "editor",
        "invited_by": "user-lincoln-teacher",
        "joined_at": datetime.utcnow(),
        "status": "active",
        "created_at": datetime.utcnow()
    },
    {
        "id": "team-2",
        "project_id": "project-lincoln-sports",
        "user_id": "user-lincoln-teacher",
        "user_email": "teacher@lincolnhigh.edu",
        "role": "admin",
        "invited_by": "user-lincoln-student",
        "joined_at": datetime.utcnow(),
        "status": "active",
        "created_at": datetime.utcnow()
    }
]

# Sample photos with different sync statuses
SAMPLE_PHOTOS = [
    {
        "id": "photo-1",
        "filename": "graduation-ceremony.jpg",
        "original_name": "Graduation Ceremony 2024.jpg",
        "file_path": "/uploads/graduation-ceremony.jpg",
        "thumbnail_path": "/uploads/thumbs/graduation-ceremony.jpg",
        "photoprism_uuid": "pp-uuid-12345",
        "photoprism_instance_id": "pp-instance-1",
        "sync_status": "synced",
        "sync_version": 2,
        "last_sync_attempt": datetime.utcnow(),
        "sync_errors": [],
        "metadata": {
            "width": 1920,
            "height": 1080,
            "file_size": 2456789,
            "mime_type": "image/jpeg",
            "camera_make": "Canon",
            "camera_model": "EOS R5"
        },
        "ai_tags": ["graduation", "ceremony", "students", "diploma", "celebration"],
        "faces": [],
        "uploaded_by": "user-lincoln-teacher",
        "school_id": "school-1",
        "project_id": "project-lincoln-2025",
        "consent_status": "approved",
        "usage_permissions": {"print": True, "digital": True, "social_media": False},
        "created_at": datetime.utcnow()
    },
    {
        "id": "photo-2",
        "filename": "football-game.jpg",
        "original_name": "Football Championship Game.jpg",
        "file_path": "/uploads/football-game.jpg",
        "photoprism_uuid": None,
        "photoprism_instance_id": None,
        "sync_status": "pending",
        "sync_version": 1,
        "last_sync_attempt": None,
        "sync_errors": [],
        "metadata": {
            "width": 1600,
            "height": 1200,
            "file_size": 1823456,
            "mime_type": "image/jpeg"
        },
        "ai_tags": ["football", "sports", "game", "field"],
        "faces": [],
        "uploaded_by": "user-lincoln-student",
        "school_id": "school-1",
        "project_id": "project-lincoln-sports",
        "consent_status": "pending",
        "usage_permissions": {"print": True, "digital": True, "social_media": True},
        "created_at": datetime.utcnow()
    },
    {
        "id": "photo-3",
        "filename": "science-fair.jpg",
        "original_name": "Science Fair Winners.jpg",
        "file_path": "/uploads/science-fair.jpg",
        "photoprism_uuid": None,
        "photoprism_instance_id": None,
        "sync_status": "failed",
        "sync_version": 1,
        "last_sync_attempt": datetime.utcnow(),
        "sync_errors": ["PhotoPrism instance unavailable", "Upload timeout"],
        "metadata": {
            "width": 1280,
            "height": 960,
            "file_size": 987654,
            "mime_type": "image/jpeg"
        },
        "ai_tags": ["science", "fair", "students", "projects"],
        "faces": [],
        "uploaded_by": "user-roosevelt-admin",
        "school_id": "school-2",
        "project_id": "project-roosevelt-2025",
        "consent_status": "approved",
        "usage_permissions": {"print": True, "digital": True, "social_media": False},
        "created_at": datetime.utcnow()
    }
]

SYNC_EVENTS = [
    {
        "id": "sync-event-1",
        "photo_id": "photo-1",
        "instance_id": "pp-instance-1",
        "event_type": "upload",
        "event_status": "success",
        "payload": {"photoprism_uuid": "pp-uuid-12345", "tags_detected": 5},
        "error_details": None,
        "processing_time": 2340,
        "created_at": datetime.utcnow()
    },
    {
        "id": "sync-event-2",
        "photo_id": "photo-3",
        "instance_id": "pp-instance-2",
        "event_type": "upload",
        "event_status": "failed",
        "payload": {},
        "error_details": "Connection timeout to PhotoPrism instance",
        "processing_time": 30000,
        "created_at": datetime.utcnow()
    }
]

async def seed_database():
    """Seed the database with comprehensive sample data"""
    try:
        print("🌱 Starting comprehensive YABOOK database seeding...")
        
        # Clear existing data
        print("🧹 Clearing existing data...")
        collections = ['schools', 'users', 'photoprism_instances', 'projects', 'templates', 
                      'team_members', 'photos', 'sync_events', 'pages']
        
        for collection in collections:
            result = await db[collection].delete_many({})
            print(f"   Cleared {result.deleted_count} documents from {collection}")
        
        # Seed schools
        print("🏫 Seeding schools...")
        await db.schools.insert_many(SCHOOLS)
        print(f"   Inserted {len(SCHOOLS)} schools")
        
        # Seed users
        print("👥 Seeding users...")
        await db.users.insert_many(USERS)
        print(f"   Inserted {len(USERS)} users")
        
        # Seed PhotoPrism instances
        print("📷 Seeding PhotoPrism instances...")
        await db.photoprism_instances.insert_many(PHOTOPRISM_INSTANCES)
        print(f"   Inserted {len(PHOTOPRISM_INSTANCES)} PhotoPrism instances")
        
        # Seed projects
        print("📁 Seeding projects...")
        await db.projects.insert_many(PROJECTS)
        print(f"   Inserted {len(PROJECTS)} projects")
        
        # Seed templates
        print("🎨 Seeding templates...")
        await db.templates.insert_many(ENHANCED_TEMPLATES)
        print(f"   Inserted {len(ENHANCED_TEMPLATES)} templates")
        
        # Seed team members
        print("👫 Seeding team members...")
        await db.team_members.insert_many(TEAM_MEMBERS)
        print(f"   Inserted {len(TEAM_MEMBERS)} team members")
        
        # Seed photos
        print("🖼️  Seeding photos...")
        await db.photos.insert_many(SAMPLE_PHOTOS)
        print(f"   Inserted {len(SAMPLE_PHOTOS)} photos")
        
        # Seed sync events
        print("🔄 Seeding sync events...")
        await db.sync_events.insert_many(SYNC_EVENTS)
        print(f"   Inserted {len(SYNC_EVENTS)} sync events")
        
        print("\n✅ Database seeding completed successfully!")
        print("\n📋 Sample Login Credentials:")
        print("   Super Admin: admin@yabook.com / admin123")
        print("   Lincoln School Admin: admin@lincolnhigh.edu / lincoln123")
        print("   Lincoln Teacher: teacher@lincolnhigh.edu / teacher123")
        print("   Lincoln Student: student@lincolnhigh.edu / student123")
        print("   Roosevelt School Admin: admin@rooseveltmiddle.edu / roosevelt123")
        
        print("\n🏢 Sample Schools:")
        for school in SCHOOLS:
            print(f"   - {school['name']} ({school['subscription_tier']} tier)")
        
        print("\n📊 Data Summary:")
        print(f"   - {len(SCHOOLS)} schools")
        print(f"   - {len(USERS)} users")
        print(f"   - {len(PROJECTS)} projects") 
        print(f"   - {len(ENHANCED_TEMPLATES)} templates (global + school-specific)")
        print(f"   - {len(SAMPLE_PHOTOS)} photos with different sync statuses")
        print(f"   - {len(PHOTOPRISM_INSTANCES)} PhotoPrism instances")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())