import requests
import sys
import uuid
from datetime import datetime

class YABOOKAPITester:
    def __init__(self, base_url="https://c7d27ab6-7498-4e30-b0e6-f87e7f9c16da.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None
        self.test_school_id = None
        self.test_photo_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # For file uploads, don't use JSON content type
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test API health endpoint"""
        return self.run_test(
            "API Health Check",
            "GET",
            "health",
            200
        )

    def test_create_school(self, name, domain, address, contact_email, contact_phone):
        """Test school creation"""
        success, response = self.run_test(
            "Create School",
            "POST",
            "schools",
            200,
            data={
                "name": name,
                "domain": domain,
                "address": address,
                "contact_email": contact_email,
                "contact_phone": contact_phone
            }
        )
        if success and 'id' in response:
            self.test_school_id = response['id']
            print(f"Created school with ID: {self.test_school_id}")
        return success, response

    def test_register_user(self, email, password, full_name, role, school_id):
        """Test user registration"""
        return self.run_test(
            f"Register {role} User",
            "POST",
            "auth/register",
            200,
            data={
                "email": email,
                "password": password,
                "full_name": full_name,
                "role": role,
                "school_id": school_id
            }
        )

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login as {email}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"Got token: {self.token[:10]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success:
            self.current_user = response
            print(f"Current user: {response['email']} (Role: {response['role']})")
        return success

    def test_get_schools(self):
        """Test getting schools list"""
        return self.run_test(
            "Get Schools List",
            "GET",
            "schools",
            200
        )

    def test_get_school(self, school_id):
        """Test getting a specific school"""
        return self.run_test(
            f"Get School {school_id}",
            "GET",
            f"schools/{school_id}",
            200
        )

    def test_upload_photo(self, file_path="test_photo.jpg"):
        """Test photo upload"""
        # Create a dummy test file if it doesn't exist
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
        except FileNotFoundError:
            # Create a simple text file as a mock image
            with open(file_path, 'w') as f:
                f.write("This is a test photo file")
            with open(file_path, 'rb') as f:
                file_content = f.read()
        
        files = {'file': (file_path, file_content, 'image/jpeg')}
        data = {'metadata': '{"description": "Test photo", "category": "test"}'}
        
        success, response = self.run_test(
            "Upload Photo",
            "POST",
            "photos/upload",
            200,
            data=data,
            files=files
        )
        
        if success and 'id' in response:
            self.test_photo_id = response['id']
            print(f"Uploaded photo with ID: {self.test_photo_id}")
        
        return success, response

    def test_get_photos(self):
        """Test getting photos list"""
        return self.run_test(
            "Get Photos List",
            "GET",
            "photos",
            200
        )

    def test_get_photo(self, photo_id):
        """Test getting a specific photo"""
        return self.run_test(
            f"Get Photo {photo_id}",
            "GET",
            f"photos/{photo_id}",
            200
        )

    def test_delete_photo(self, photo_id):
        """Test deleting a photo"""
        return self.run_test(
            f"Delete Photo {photo_id}",
            "DELETE",
            f"photos/{photo_id}",
            200
        )

    def test_photoprism_instances(self):
        """Test getting PhotoPrism instances"""
        return self.run_test(
            "Get PhotoPrism Instances",
            "GET",
            "photoprism/instances",
            200
        )

    def test_search_photos(self, query="test"):
        """Test photo search"""
        return self.run_test(
            f"Search Photos for '{query}'",
            "GET",
            f"search/photos?query={query}",
            200
        )

def main():
    # Setup
    tester = YABOOKAPITester()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Test data
    test_school = {
        "name": f"Test School {timestamp}",
        "domain": "test.edu",
        "address": "123 Test St, Testville, TS 12345",
        "contact_email": "contact@test.edu",
        "contact_phone": "555-123-4567"
    }
    
    admin_user = {
        "email": f"admin{timestamp}@test.edu",
        "password": "testpassword123",
        "full_name": "Admin User",
        "role": "admin"
    }
    
    teacher_user = {
        "email": f"teacher{timestamp}@test.edu",
        "password": "testpassword123",
        "full_name": "Teacher User",
        "role": "teacher"
    }
    
    student_user = {
        "email": f"student{timestamp}@test.edu",
        "password": "testpassword123",
        "full_name": "Student User",
        "role": "student"
    }

    # Run tests
    print("\n===== YABOOK API Testing =====")
    print(f"Testing against: {tester.api_url}")
    
    # Test API health
    tester.test_health()
    
    # Test school creation
    school_success, school_response = tester.test_create_school(**test_school)
    if not school_success:
        print("❌ School creation failed, using existing school for testing")
        # Try to login as admin to get existing schools
        if tester.test_login("admin@test.edu", "testpassword123"):
            tester.test_get_current_user()
            success, schools = tester.test_get_schools()
            if success and len(schools) > 0:
                tester.test_school_id = schools[0]['id']
                print(f"Using existing school with ID: {tester.test_school_id}")
            else:
                print("❌ No existing schools found, cannot continue testing")
                return 1
        else:
            print("❌ Cannot login as admin, cannot continue testing")
            return 1
    
    # Register users if we have a school
    if tester.test_school_id:
        admin_user["school_id"] = tester.test_school_id
        teacher_user["school_id"] = tester.test_school_id
        student_user["school_id"] = tester.test_school_id
        
        # Register admin user
        tester.test_register_user(**admin_user)
        
        # Register teacher user
        tester.test_register_user(**teacher_user)
        
        # Register student user
        tester.test_register_user(**student_user)
    else:
        print("❌ No school ID available, skipping user registration")
    
    # Test authentication with admin
    print("\n===== Testing Admin User =====")
    if tester.test_login(admin_user["email"], admin_user["password"]):
        tester.test_get_current_user()
        tester.test_get_schools()
        if tester.test_school_id:
            tester.test_get_school(tester.test_school_id)
        tester.test_upload_photo()
        tester.test_get_photos()
        if tester.test_photo_id:
            tester.test_get_photo(tester.test_photo_id)
        tester.test_photoprism_instances()
        tester.test_search_photos()
    else:
        # Try with default admin
        print("Trying with default admin credentials...")
        if tester.test_login("admin@test.edu", "testpassword123"):
            tester.test_get_current_user()
            tester.test_get_schools()
            if tester.test_school_id:
                tester.test_get_school(tester.test_school_id)
            tester.test_upload_photo()
            tester.test_get_photos()
            if tester.test_photo_id:
                tester.test_get_photo(tester.test_photo_id)
            tester.test_photoprism_instances()
            tester.test_search_photos()
    
    # Test authentication with teacher
    print("\n===== Testing Teacher User =====")
    if tester.test_login(teacher_user["email"], teacher_user["password"]):
        tester.test_get_current_user()
        tester.test_get_schools()  # Should only see their school
        tester.test_upload_photo()
        tester.test_get_photos()
    else:
        # Try with default teacher
        print("Trying with default teacher credentials...")
        if tester.test_login("teacher@test.edu", "testpassword123"):
            tester.test_get_current_user()
            tester.test_get_schools()
            tester.test_upload_photo()
            tester.test_get_photos()
    
    # Test authentication with student
    print("\n===== Testing Student User =====")
    if tester.test_login(student_user["email"], student_user["password"]):
        tester.test_get_current_user()
        tester.test_get_schools()  # Should only see their school
        tester.test_upload_photo()
        tester.test_get_photos()
    else:
        # Try with default student
        print("Trying with default student credentials...")
        if tester.test_login("student@test.edu", "testpassword123"):
            tester.test_get_current_user()
            tester.test_get_schools()
            tester.test_upload_photo()
            tester.test_get_photos()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())