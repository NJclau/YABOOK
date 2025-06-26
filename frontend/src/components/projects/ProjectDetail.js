import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import PhotoUpload from './PhotoUpload';
import EnhancedPhotoGallery from './EnhancedPhotoGallery';
import { ArrowLeft, BookOpen, Upload, Image, Settings, Users } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(response.data);
    } catch (error) {
      addToast('Failed to fetch project details', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUploaded = (newPhoto) => {
    setRefreshPhotos(prev => prev + 1);
    addToast('Photo uploaded successfully!', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-white mb-2">Project not found</h3>
            <p className="text-gray-400 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'pages', label: 'Pages', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3 border"
                  style={{ backgroundColor: project.theme_color }}
                ></div>
                <h1 className="text-xl font-semibold text-white">{project.title}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-400">
                <Users className="w-4 h-4 mr-1" />
                {project.collaborators.length + 1} members
              </div>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{project.title}</h2>
              {project.description && (
                <p className="text-gray-400 mb-4">{project.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                {project.school_name && (
                  <span>📚 {project.school_name}</span>
                )}
                {project.academic_year && (
                  <span>📅 {project.academic_year}</span>
                )}
                <span className="capitalize">Status: {project.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-red-500 border-red-500'
                    : 'text-gray-400 border-transparent hover:text-white hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'photos' && (
            <div>
              <div className="mb-8">
                <PhotoUpload 
                  projectId={projectId} 
                  onPhotoUploaded={handlePhotoUploaded}
                />
              </div>
              <EnhancedPhotoGallery 
                projectId={projectId} 
                key={refreshPhotos} // Force refresh when photos are uploaded
              />
            </div>
          )}

          {activeTab === 'pages' && (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">Page Editor Coming Soon</h4>
                <p className="text-gray-400 mb-6">
                  The drag-and-drop page editor will be available in the next phase
                </p>
                <Button disabled>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Page
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">
                      Project Name
                    </label>
                    <p className="text-white">{project.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">
                      Theme Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: project.theme_color }}
                      ></div>
                      <span className="text-white">{project.theme_color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">
                      Created
                    </label>
                    <p className="text-white">
                      {new Date(project.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <Button variant="outline" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;