import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  photos: [],
  pages: [],
  templates: [],
  teamMembers: [],
  loading: false,

  fetchProjects: async () => {
    try {
      set({ loading: true });
      const response = await axios.get(`${API}/projects`);
      set({ projects: response.data, loading: false });
    } catch (error) {
      toast.error('Failed to fetch projects');
      set({ loading: false });
    }
  },

  createProject: async (projectData) => {
    try {
      const response = await axios.post(`${API}/projects`, projectData);
      set(state => ({ 
        projects: [...state.projects, response.data]
      }));
      toast.success('Project created successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to create project');
      return null;
    }
  },

  fetchProject: async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}`);
      set({ currentProject: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch project');
      return null;
    }
  },

  fetchPhotos: async (projectId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await axios.get(`${API}/projects/${projectId}/photos?${params}`);
      set({ photos: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch photos');
      return [];
    }
  },

  uploadPhoto: async (projectId, file, tags = []) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', tags.join(','));

      const response = await axios.post(`${API}/projects/${projectId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      set(state => ({
        photos: [...state.photos, response.data]
      }));
      
      toast.success('Photo uploaded successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to upload photo');
      return null;
    }
  },

  fetchPages: async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/pages`);
      set({ pages: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch pages');
      return [];
    }
  },

  createPage: async (projectId, name, templateId = null) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (templateId) formData.append('template_id', templateId);

      const response = await axios.post(`${API}/projects/${projectId}/pages`, formData);
      
      set(state => ({
        pages: [...state.pages, response.data]
      }));
      
      toast.success('Page created successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to create page');
      return null;
    }
  },

  updatePageLayout: async (pageId, layoutData) => {
    try {
      const response = await axios.put(`${API}/pages/${pageId}`, layoutData);
      
      set(state => ({
        pages: state.pages.map(page => 
          page.id === pageId ? response.data : page
        )
      }));
      
      return response.data;
    } catch (error) {
      toast.error('Failed to update page');
      return null;
    }
  },

  fetchTemplates: async (category = null) => {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await axios.get(`${API}/templates${params}`);
      set({ templates: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch templates');
      return [];
    }
  },

  fetchTeamMembers: async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/team`);
      set({ teamMembers: response.data });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch team members');
      return [];
    }
  },

  inviteTeamMember: async (projectId, email, role) => {
    try {
      await axios.post(`${API}/projects/${projectId}/team/invite`, {
        user_email: email,
        role
      });
      toast.success('Team member invited successfully!');
      // Refresh team members
      get().fetchTeamMembers(projectId);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to invite team member');
      return false;
    }
  }
}));