import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { 
  PhotoIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  TagIcon,
  CheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function PhotoLibrary() {
  const { projectId } = useParams();
  const fileInputRef = useRef(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    tags: '',
    uploader: '',
    consent_status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { 
    currentProject,
    photos, 
    fetchProject,
    fetchPhotos, 
    uploadPhoto 
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchPhotos(projectId, filters);
    }
  }, [projectId, filters, fetchProject, fetchPhotos]);

  const handleFileUpload = async (files) => {
    setUploading(true);
    const uploadPromises = Array.from(files).map(file => 
      uploadPhoto(projectId, file, [])
    );
    
    try {
      await Promise.all(uploadPromises);
      fetchPhotos(projectId, filters); // Refresh photos
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      tags: '',
      uploader: '',
      consent_status: ''
    });
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(photos.map(photo => photo.id));
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Library</h1>
          <p className="text-gray-600">{currentProject.name}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedPhotos.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-md">
              <span className="text-sm text-blue-700">{selectedPhotos.length} selected</span>
              <button
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Photos
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search photos..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          {(filters.search || filters.tags || filters.uploader || filters.consent_status) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  placeholder="Enter tags (comma separated)"
                  value={filters.tags}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uploader</label>
                <input
                  type="text"
                  placeholder="Filter by uploader"
                  value={filters.uploader}
                  onChange={(e) => handleFilterChange('uploader', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consent Status</label>
                <select
                  value={filters.consent_status}
                  onChange={(e) => handleFilterChange('consent_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedPhotos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Add Tags
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Update Consent
              </button>
              <button className="text-sm text-red-600 hover:text-red-800">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No photos found</h3>
          <p className="mt-2 text-gray-500">
            {filters.search || filters.tags || filters.uploader || filters.consent_status
              ? 'Try adjusting your filters or search terms.'
              : 'Upload your first photos to get started.'
            }
          </p>
          {!filters.search && !filters.tags && !filters.uploader && !filters.consent_status && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload Photos
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-700">
              Showing {photos.length} photo{photos.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAllPhotos}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              {selectedPhotos.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all ${
                  selectedPhotos.includes(photo.id)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => togglePhotoSelection(photo.id)}
              >
                {/* Photo placeholder - in real app, this would be an img tag */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <PhotoIcon className="h-12 w-12" />
                </div>
                
                {/* Selection indicator */}
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPhotos.includes(photo.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {selectedPhotos.includes(photo.id) && (
                      <CheckIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                
                {/* Consent status */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(photo.consent_status)}`}>
                    {photo.consent_status}
                  </span>
                </div>
                
                {/* Photo info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.original_name}
                  </p>
                  {photo.tags.length > 0 && (
                    <div className="flex items-center mt-1">
                      <TagIcon className="h-3 w-3 text-white/80 mr-1" />
                      <p className="text-white/80 text-xs truncate">
                        {photo.tags.slice(0, 2).join(', ')}
                        {photo.tags.length > 2 && '...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}