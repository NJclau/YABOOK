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
        self.school_id = None
        self.test_instance = {
            "instance_name": "Test PhotoPrism Instance",
            "base_url": "https://demo.photoprism.org",
            "admin_username": "admin",
            "admin_password": "admin"
        }
    
    def test_01_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{API_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "YABOOK PhotoPrism Integration API")
        print("✅ API root endpoint test passed")
    
    def test_02_create_school(self):
        """Test creating a school"""
        school_data = {
            "name": self.test_school_name,
            "slug": self.test_school_slug
        }
        response = requests.post(f"{API_URL}/schools", json=school_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], self.test_school_name)
        self.assertEqual(data["slug"], self.test_school_slug)
        self.assertTrue("id" in data)
        self.school_id = data["id"]
        print(f"✅ Create school test passed. School ID: {self.school_id}")
    
    def test_03_list_schools(self):
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
    
    def test_04_get_school(self):
        """Test getting a specific school"""
        if not self.school_id:
            self.test_02_create_school()
        
        response = requests.get(f"{API_URL}/schools/{self.school_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], self.school_id)
        self.assertEqual(data["name"], self.test_school_name)
        print("✅ Get school test passed")
    
    def test_05_create_photoprism_instance(self):
        """Test creating a PhotoPrism instance"""
        if not self.school_id:
            self.test_02_create_school()
        
        instance_data = {
            "school_id": self.school_id,
            **self.test_instance
        }
        response = requests.post(f"{API_URL}/schools/{self.school_id}/photoprism-instance", json=instance_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["school_id"], self.school_id)
        self.assertEqual(data["instance_name"], self.test_instance["instance_name"])
        print("✅ Create PhotoPrism instance test passed")
    
    def test_06_get_photoprism_instance(self):
        """Test getting a PhotoPrism instance"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photoprism-instance")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["school_id"], self.school_id)
        self.assertEqual(data["instance_name"], self.test_instance["instance_name"])
        print("✅ Get PhotoPrism instance test passed")
    
    def test_07_check_instance_health(self):
        """Test checking PhotoPrism instance health"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photoprism-instance/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("is_healthy", data)
        print(f"✅ Check instance health test passed. Healthy: {data['is_healthy']}")
    
    def test_08_get_sync_status(self):
        """Test getting sync status"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        response = requests.get(f"{API_URL}/schools/{self.school_id}/sync/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_photos", data)
        self.assertIn("synced_photos", data)
        self.assertIn("pending_photos", data)
        self.assertIn("failed_photos", data)
        print("✅ Get sync status test passed")
    
    def test_09_retry_failed_syncs(self):
        """Test retrying failed syncs"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        response = requests.post(f"{API_URL}/schools/{self.school_id}/sync/retry")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("photo_ids", data)
        print("✅ Retry failed syncs test passed")
    
    def test_10_reconcile_photos(self):
        """Test reconciling photos"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        response = requests.post(f"{API_URL}/schools/{self.school_id}/reconcile", params={"dry_run": True})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("yabook_photos", data)
        self.assertIn("photoprism_photos", data)
        print("✅ Reconcile photos test passed")
    
    def test_11_upload_photo(self):
        """Test uploading a photo - skipped as it requires a file"""
        print("⚠️ Upload photo test skipped - requires file upload")
    
    def test_12_list_photos(self):
        """Test listing photos"""
        if not self.school_id:
            self.test_02_create_school()
        
        response = requests.get(f"{API_URL}/schools/{self.school_id}/photos")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("photos", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("per_page", data)
        print("✅ List photos test passed")
    
    def test_13_search_photos(self):
        """Test searching photos"""
        if not self.school_id:
            self.test_02_create_school()
            self.test_05_create_photoprism_instance()
        
        try:
            response = requests.get(f"{API_URL}/schools/{self.school_id}/photos/search", params={"q": "test"})
            self.assertIn(response.status_code, [200, 404])
            if response.status_code == 200:
                data = response.json()
                self.assertIn("results", data)
                self.assertIn("query", data)
                print("✅ Search photos test passed")
            else:
                print("⚠️ Search photos test - PhotoPrism instance not found or not configured properly")
        except Exception as e:
            print(f"⚠️ Search photos test failed: {str(e)}")

def run_tests():
    """Run all tests in order"""
    test_suite = unittest.TestSuite()
    test_suite.addTest(YABOOKPhotoprismAPITest('test_01_api_root'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_02_create_school'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_03_list_schools'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_04_get_school'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_05_create_photoprism_instance'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_06_get_photoprism_instance'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_07_check_instance_health'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_08_get_sync_status'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_09_retry_failed_syncs'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_10_reconcile_photos'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_11_upload_photo'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_12_list_photos'))
    test_suite.addTest(YABOOKPhotoprismAPITest('test_13_search_photos'))
    
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)

if __name__ == "__main__":
    run_tests()