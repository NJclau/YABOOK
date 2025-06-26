#!/usr/bin/env python3
"""
Seed default templates for YABOOK
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Default templates
DEFAULT_TEMPLATES = [
    {
        "id": "classic-yearbook-1",
        "name": "Classic Yearbook Layout",
        "description": "Traditional yearbook page with photo grid and text areas",
        "category": "yearbook",
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
        }
    },
    {
        "id": "modern-showcase-1",
        "name": "Modern Showcase",
        "description": "Clean, modern layout with emphasis on large photos",
        "category": "showcase",
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
        }
    },
    {
        "id": "collage-style-1",
        "name": "Photo Collage",
        "description": "Dynamic collage layout for multiple photos",
        "category": "collage",
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
        }
    }
]

async def seed_templates():
    """Seed default templates into the database"""
    try:
        # Check if templates already exist
        existing_count = await db.templates.count_documents({})
        if existing_count > 0:
            print(f"Templates already exist ({existing_count} found). Skipping seed.")
            return
        
        # Insert default templates
        result = await db.templates.insert_many(DEFAULT_TEMPLATES)
        print(f"Successfully seeded {len(result.inserted_ids)} default templates:")
        
        for template in DEFAULT_TEMPLATES:
            print(f"  - {template['name']} ({template['category']})")
        
    except Exception as e:
        print(f"Error seeding templates: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_templates())