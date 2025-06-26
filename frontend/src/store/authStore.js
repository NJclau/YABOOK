import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuthStore = create((set, get) => ({
  user: null,
  school: null,
  token: localStorage.getItem('token'),
  loading: true,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API}/auth/me`);
        set({ user: response.data, loading: false });
        
        // Fetch school info if user has school_id
        if (response.data.school_id) {
          try {
            const schoolResponse = await axios.get(`${API}/schools`);
            const userSchool = schoolResponse.data.find(s => s.id === response.data.school_id);
            set({ school: userSchool });
          } catch (error) {
            console.error('Failed to fetch school info:', error);
          }
        }
      } catch (error) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, school: null, token: null, loading: false });
      }
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });
      
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      set({ user, token: access_token });
      
      // Fetch school info if user has school_id
      if (user.school_id) {
        try {
          const schoolResponse = await axios.get(`${API}/schools`);
          const userSchool = schoolResponse.data.find(s => s.id === user.school_id);
          set({ school: userSchool });
        } catch (error) {
          console.error('Failed to fetch school info:', error);
        }
      }
      
      toast.success(`Welcome back, ${user.name}!`);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      toast.error(errorMessage);
      return false;
    }
  },

  register: async (name, email, password, schoolId = null) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name,
        email,
        password,
        school_id: schoolId
      });
      
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      set({ user, token: access_token });
      
      // Fetch school info if user has school_id
      if (user.school_id) {
        try {
          const schoolResponse = await axios.get(`${API}/schools`);
          const userSchool = schoolResponse.data.find(s => s.id === user.school_id);
          set({ school: userSchool });
        } catch (error) {
          console.error('Failed to fetch school info:', error);
        }
      }
      
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      toast.error(errorMessage);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    set({ user: null, school: null, token: null });
    toast.success('Logged out successfully');
  },

  // School management functions
  createSchool: async (schoolData) => {
    try {
      const response = await axios.post(`${API}/schools`, schoolData);
      toast.success('School created successfully!');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to create school';
      toast.error(errorMessage);
      return null;
    }
  },

  fetchSchools: async () => {
    try {
      const response = await axios.get(`${API}/schools`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch schools');
      return [];
    }
  },

  // User role checks
  isSuperAdmin: () => {
    const { user } = get();
    return user?.role === 'super_admin';
  },

  isSchoolAdmin: () => {
    const { user } = get();
    return user?.role === 'school_admin' || user?.role === 'super_admin';
  },

  canManageSchool: () => {
    const { user } = get();
    return user?.role === 'school_admin' || user?.role === 'super_admin';
  },

  hasSchoolAccess: () => {
    const { user } = get();
    return !!user?.school_id || user?.role === 'super_admin';
  }
}));