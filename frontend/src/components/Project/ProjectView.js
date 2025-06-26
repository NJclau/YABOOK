import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { 
  PhotoIcon, 
  DocumentTextIcon, 
  UsersIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function ProjectView() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    currentProject, 
    photos, 
    pages, 
    teamMembers,
    fetchProject,
    fetchPhotos,
    fetchPages,
    fetchTeamMembers,
    createPage
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchPhotos(projectId);
      fetchPages(projectId);
      fetchTeamMembers(projectId);
    }
  }, [projectId, fetchProject, fetchPhotos, fetchPages, fetchTeamMembers]);

  const handleCreatePage = async () => {
    const pageName = prompt('Enter page name:');
    if (pageName) {
      await createPage(projectId, pageName);
    }
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: EyeIcon },
    { id: 'photos', name: 'Photos', icon: PhotoIcon, count: photos.length },
    { id: 'pages', name: 'Pages', icon: DocumentTextIcon, count: pages.length },
    { id: 'team', name: 'Team', icon: UsersIcon, count: teamMembers.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
              {currentProject.description && (
                <p className="text-gray-600 mt-1">{currentProject.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Created {format(new Date(currentProject.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <button className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
              <Cog6ToothIcon className="h-4 w-4 mr-1" />
              Settings
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <PhotoIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Photos</p>
                    <p className="text-2xl font-bold text-blue-900">{photos.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Pages</p>
                    <p className="text-2xl font-bold text-green-900">{pages.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Team Members</p>
                    <p className="text-2xl font-bold text-purple-900">{teamMembers.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    to={`/projects/${projectId}/photos`}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <PhotoIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium">Manage Photos</span>
                  </Link>
                  
                  <button
                    onClick={handleCreatePage}
                    className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium">Create New Page</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Pages</h3>
                {pages.length === 0 ? (
                  <p className="text-gray-500 text-sm">No pages created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pages.slice(0, 5).map((page) => (
                      <div key={page.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm font-medium">{page.name}</span>
                        <Link
                          to={`/projects/${projectId}/pages/${page.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Photo Library</h3>
              <Link
                to={`/projects/${projectId}/photos`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Photos →
              </Link>
            </div>
            
            {photos.length === 0 ? (
              <div className="text-center py-8">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No photos uploaded yet.</p>
                <Link
                  to={`/projects/${projectId}/photos`}
                  className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Upload Photos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photos.slice(0, 12).map((photo) => (
                  <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <PhotoIcon className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pages</h3>
              <button
                onClick={handleCreatePage}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Page
              </button>
            </div>
            
            {pages.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No pages created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map((page) => (
                  <div key={page.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900 mb-2">{page.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Created {format(new Date(page.created_at), 'MMM d, yyyy')}
                    </p>
                    <Link
                      to={`/projects/${projectId}/pages/${page.id}/edit`}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit Page
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
              <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-md">
                <PlusIcon className="h-4 w-4 mr-2" />
                Invite Member
              </button>
            </div>
            
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No team members yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.user_email}</p>
                      <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}