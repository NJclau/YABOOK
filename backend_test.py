import requests
import unittest
import json
import uuid
import os
import time
from datetime import datetime

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://7189c3fc-1265-4fa0-a23a-40dddcc75ac7.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class YABOOKPhotoprismAPITest(unittest.TestCase):
    """Test suite for YABOOK PhotoPrism Integration API"""
    
    def setUp(self):
        """Set up test data"""
        self.test_school_name = f"Test School {uuid.uuid4()}"
        self.test_school_slug = f"test-school-{uuid.uuid4()}"
        # Use the provided test school ID
        self.school_id = "448de099-69b1-4c82-a045-cab7804a447d"
        self.photoprism_instance_id = "ac4afb6a-1a46-45ae-8e06-117c2e28b7c0"
        self.test_instance = {
            "instance_name": "Test PhotoPrism Instance",
            "base_url": "https://demo.photoprism.org",
            "admin_username": "admin",
            "admin_password": "admin",
            "metadata": {}  # Add empty metadata dictionary
        }
    
    def test_01_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{API_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "YABOOK PhotoPrism Integration API")
        print("✅ API root endpoint test passed")
    
    def test_02_list_schools(self):
        """Test listing schools"""
        response = requests.get(f"{API_URL}/schools")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        # Find our test school
        found = False
        for school in data:
            if school.get("id") == self.school_id:
                found = True
                break
        self.assertTrue(found, "Test school not found in schools list")
        print("✅ List schools test passed")
    
    def test_03_get_school(self):
        """Test getting a specific school"""
        response = requests.get(f"{API_URL}/schools/{self.school_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], self.school_id)
        print(f"✅ Get school test passed. School name: {data['name']}")
    
    def test_04_get_photoprism_instance(self):
        """Test getting a PhotoPrism instance"""
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photoprism-instance")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["school_id"], self.school_id)
        print(f"✅ Get PhotoPrism instance test passed. Instance name: {data['instance_name']}")
    
    def test_05_check_instance_health(self):
        """Test checking PhotoPrism instance health"""
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photoprism-instance/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("is_healthy", data)
        print(f"✅ Check instance health test passed. Healthy: {data['is_healthy']}")
    
    def test_06_get_sync_status(self):
        """Test getting sync status"""
        response = requests.get(f"{API_URL}/schools/{self.school_id}/sync/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_photos", data)
        self.assertIn("synced_photos", data)
        self.assertIn("pending_photos", data)
        self.assertIn("failed_photos", data)
        print("✅ Get sync status test passed")
        print(f"   Total photos: {data['total_photos']}")
        print(f"   Synced photos: {data['synced_photos']}")
        print(f"   Pending photos: {data['pending_photos']}")
        print(f"   Failed photos: {data['failed_photos']}")
    
    def test_07_retry_failed_syncs(self):
        """Test retrying failed syncs"""
        response = requests.post(f"{API_URL}/schools/{self.school_id}/sync/retry")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("photo_ids", data)
        print("✅ Retry failed syncs test passed")
        print(f"   Message: {data['message']}")
        print(f"   Photo IDs: {data['photo_ids']}")
    
    def test_08_reconcile_photos(self):
        """Test reconciling photos"""
        response = requests.post(f"{API_URL}/schools/{self.school_id}/reconcile", params={"dry_run": True})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("yabook_photos", data)
        self.assertIn("photoprism_photos", data)
        print("✅ Reconcile photos test passed")
        print(f"   YABOOK photos: {len(data['yabook_photos'])}")
        print(f"   PhotoPrism photos: {len(data['photoprism_photos'])}")
    
    def test_09_list_photos(self):
        """Test listing photos"""
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photos")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("photos", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("per_page", data)
        print("✅ List photos test passed")
        print(f"   Total photos: {data['total']}")
    
    def test_10_search_photos_fixed(self):
        """Test searching photos with the fixed API"""
        try:
            response = requests.get(f"{API_URL}/schools/{self.school_id}/photos/search", params={"q": "test"})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("results", data)
            self.assertIn("query", data)
            self.assertIn("count", data)
            print("✅ Search photos test passed")
            print(f"   Query: {data['query']}")
            print(f"   Results count: {data['count']}")
            
            # Test with a non-existent query to verify empty results handling
            response = requests.get(f"{API_URL}/schools/{self.school_id}/photos/search", 
                                   params={"q": "nonexistentquerythatshouldfail12345"})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("results", data)
            self.assertEqual(len(data["results"]), 0)
            print("✅ Search photos with non-existent query returns empty results instead of 500 error")
            
        except Exception as e:
            self.fail(f"Search photos test failed: {str(e)}")

def run_tests():
    """Run all tests in order"""
    test_suite = unittest.TestSuite()
    test_suite.addTest(YABOOKPhotoprismAPITest('test_01_api_root'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_02_list_schools'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_03_get_school'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_04_get_photoprism_instance'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_05_check_instance_health'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_06_get_sync_status'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_07_retry_failed_syncs'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_08_reconcile_photos'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_09_list_photos'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_10_search_photos_fixed'))
    
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)

if __name__ == "__main__":
    run_tests()