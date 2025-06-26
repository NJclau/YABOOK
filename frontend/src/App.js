import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const Login = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to YABOOK
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enterprise Yearbook Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <button
                onClick={onSwitchToRegister}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Don't have an account? Register here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher',
    school_id: ''
  });
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      // Use public endpoint for school listing during registration
      const response = await axios.get(`${API}/schools/public`);
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      // Fallback to demo schools if the API call fails
      setSchools([
        { id: 'demo-school-1', name: 'Demo High School', domain: 'demo.school' },
        { id: 'demo-school-2', name: 'Example Academy', domain: 'example.academy' }
      ]);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await register(formData);
    if (result.success) {
      setSuccess('Registration successful! You can now login.');
      setTimeout(() => onSwitchToLogin(), 2000);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your YABOOK account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="school_id" className="block text-sm font-medium text-gray-700">
                School
              </label>
              <select
                id="school_id"
                name="school_id"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.school_id}
                onChange={handleChange}
              >
                <option value="">Select a school</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.domain})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('photos');
  const [photos, setPhotos] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    fetchPhotos();
    if (user?.role === 'admin') {
      fetchSchools();
    }
  }, [user]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/photos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('metadata', JSON.stringify({
      description: 'Uploaded via YABOOK web interface',
      category: 'general'
    }));

    try {
      await axios.post(`${API}/photos/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadFile(null);
      fetchPhotos(); // Refresh photos list
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploadLoading(false);
    }
  };

  const PhotosTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Upload Photos</h3>
        <form onSubmit={handleFileUpload}>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="submit"
              disabled={!uploadFile || uploadLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploadLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Your Photos ({photos.length})</h3>
        {loading ? (
          <div className="text-center py-8">Loading photos...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No photos yet. Upload your first photo above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="border rounded-lg p-4">
                <div className="mb-2">
                  <div className="font-medium text-sm truncate">{photo.filename}</div>
                  <div className="text-xs text-gray-500">
                    Status: <span className={`px-2 py-1 rounded-full text-xs ${
                      photo.sync_status === 'synced' ? 'bg-green-100 text-green-800' :
                      photo.sync_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {photo.sync_status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Uploaded: {new Date(photo.created_at).toLocaleDateString()}
                </div>
                {photo.ai_tags && photo.ai_tags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600">AI Tags:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {photo.ai_tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const SchoolsTab = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Schools Management</h3>
      {user?.role === 'admin' ? (
        <div className="space-y-4">
          {schools.map(school => (
            <div key={school.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{school.name}</h4>
                  <p className="text-sm text-gray-600">{school.domain}</p>
                  <p className="text-sm text-gray-600">{school.contact_email}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Users: {school.total_users}</div>
                  <div>Photos: {school.total_photos}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Only administrators can view school management.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">YABOOK</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.full_name}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('photos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'photos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Photos
              </button>
              <button
                onClick={() => setActiveTab('schools')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'schools'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Schools
              </button>
            </nav>
          </div>

          {activeTab === 'photos' && <PhotosTab />}
          {activeTab === 'schools' && <SchoolsTab />}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [authMode, setAuthMode] = useState('login');
  
  return (
    <AuthProvider>
      <div className="App">
        <AuthContent authMode={authMode} setAuthMode={setAuthMode} />
      </div>
    </AuthProvider>
  );
};

// Auth Content Component
const AuthContent = ({ authMode, setAuthMode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading YABOOK...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return authMode === 'login' ? (
    <Login onSwitchToRegister={() => setAuthMode('register')} />
  ) : (
    <Register onSwitchToLogin={() => setAuthMode('login')} />
  );
};

export default App;