import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { 
  PlusIcon, 
  FolderIcon, 
  PhotoIcon, 
  DocumentTextIcon,
  UsersIcon,
  CalendarIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { projects, loading, fetchProjects, createProject, syncStatus, fetchSyncStatus } = useProjectStore();
  const { user, school, hasSchoolAccess } = useAuthStore();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    fetchProjects();
    
    // Fetch sync status if user has school access
    if (hasSchoolAccess() && user?.school_id) {
      fetchSyncStatus(user.school_id);
    }
  }, [fetchProjects, fetchSyncStatus, hasSchoolAccess, user?.school_id]);

  const onCreateProject = async (data) => {
    const project = await createProject(data);
    if (project) {
      setShowCreateModal(false);
      reset();
    }
  };

  const getSyncStatusColor = (status) => {
    switch (status) {
      case 'synced': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has school access
  if (!hasSchoolAccess()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No School Access</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to be associated with a school to create projects.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600 mt-1">
            Manage your yearbook projects and create beautiful memories
            {school && ` for ${school.name}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* PhotoPrism Sync Status */}
      {syncStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <CloudIcon className="h-5 w-5 mr-2" />
              PhotoPrism Sync Status
            </h2>
            <span className="text-sm text-gray-500">
              Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <PhotoIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Photos</p>
                  <p className="text-2xl font-bold text-blue-900">{syncStatus.total_photos}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Synced</p>
                  <p className="text-2xl font-bold text-green-900">{syncStatus.synced_photos}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{syncStatus.pending_photos}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-600">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{syncStatus.failed_photos}</p>
                </div>
              </div>
            </div>
          </div>
          
          {syncStatus.sync_percentage !== undefined && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Sync Progress</span>
                <span>{Math.round(syncStatus.sync_percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${syncStatus.sync_percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first yearbook project.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                  <FolderIcon className="h-6 w-6 text-blue-600" />
                </div>
                
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}
                
                {project.academic_year && (
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Academic Year: {project.academic_year}
                  </div>
                )}
                
                <div className="flex items-center text-xs text-gray-500 mb-4">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <PhotoIcon className="h-4 w-4 mr-1" />
                      Photos
                    </span>
                    <span className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      Pages
                    </span>
                    <span className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      Team
                    </span>
                  </div>
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
              <form onSubmit={handleSubmit(onCreateProject)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    {...register('name', { required: 'Project name is required' })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Class of 2025 Yearbook"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year (optional)
                  </label>
                  <input
                    {...register('academic_year')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2024-2025"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your yearbook project..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}