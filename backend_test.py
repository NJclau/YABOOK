import requests
import sys
import uuid
from datetime import datetime

class YabookAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        self.user_password = "TestPassword123!"
        self.user_name = "Test User"
        self.project_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
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
                    # For multipart/form-data
                    del headers['Content-Type']
                    response = requests.post(url, headers=headers, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail provided')
                    print(f"Error: {error_detail}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": self.user_name,
                "email": self.user_email,
                "password": self.user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"Registered user: {self.user_email}")
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.user_email,
                "password": self.user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"Logged in as: {self.user_email}")
            return True
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"Current user: {response.get('name')} ({response.get('email')})")
        return success

    def test_get_templates(self):
        """Test get templates endpoint"""
        success, response = self.run_test(
            "Get Templates",
            "GET",
            "templates",
            200
        )
        if success:
            templates = response
            print(f"Found {len(templates)} templates:")
            for template in templates:
                print(f"  - {template.get('name')} (Category: {template.get('category')})")
        return success

    def test_create_project(self):
        """Test create project endpoint"""
        project_name = f"Test Project {uuid.uuid4().hex[:8]}"
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data={
                "name": project_name,
                "description": "A test project created by the API tester"
            }
        )
        if success:
            self.project_id = response.get('id')
            print(f"Created project: {project_name} (ID: {self.project_id})")
        return success

    def test_get_projects(self):
        """Test get projects endpoint"""
        success, response = self.run_test(
            "Get User Projects",
            "GET",
            "projects",
            200
        )
        if success:
            projects = response
            print(f"Found {len(projects)} projects:")
            for project in projects:
                print(f"  - {project.get('name')} (ID: {project.get('id')})")
        return success

def main():
    # Get the backend URL from the frontend .env file
    import os
    from dotenv import load_dotenv
    load_dotenv('/app/frontend/.env')
    backend_url = os.environ.get('REACT_APP_BACKEND_URL')
    
    if not backend_url:
        print("❌ Error: REACT_APP_BACKEND_URL not found in frontend/.env")
        return 1
    
    print(f"🔗 Testing API at: {backend_url}")
    
    # Setup tester
    tester = YabookAPITester(backend_url)
    
    # Run tests
    tester.test_health()
    
    # Test authentication
    if not tester.test_register():
        print("❌ Registration failed, trying login...")
        if not tester.test_login():
            print("❌ Login failed, stopping tests")
            return 1
    
    tester.test_get_current_user()
    
    # Test templates
    tester.test_get_templates()
    
    # Test projects
    tester.test_create_project()
    tester.test_get_projects()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())