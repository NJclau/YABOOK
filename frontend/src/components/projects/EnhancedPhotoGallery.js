import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import PhotoSearch from './PhotoSearch';
import PhotoModal from './PhotoModal';
import PhotoStats from './PhotoStats';
import BulkPhotoActions from './BulkPhotoActions';
import { 
  Image, Calendar, User, Check, X, AlertCircle, 
  ChevronLeft, ChevronRight, Grid, List, MoreVertical 
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedPhotoGallery = ({ projectId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
  });
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showStats, setShowStats] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchPhotos();
  }, [projectId, searchParams, pagination.page]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.per_page.toString(),
        ...searchParams
      });

      const response = await axios.get(`${API}/projects/${projectId}/photos?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPhotos(response.data.photos);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages
      }));
    } catch (error) {
      addToast('Failed to fetch photos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params) => {
    setSearchParams(params);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setSearchParams({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePhotoUpdate = (updatedPhoto) => {
    setPhotos(photos.map(photo => 
      photo.id === updatedPhoto.id ? updatedPhoto : photo
    ));
  };

  const handlePhotoDelete = (photoId) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(new Set(photos.map(photo => photo.id)));
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getConsentIcon = (status) => {
    switch (status) {
      case 'approved':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getConsentColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-800 text-green-200 border-green-600';
      case 'rejected':
        return 'bg-red-800 text-red-200 border-red-600';
      default:
        return 'bg-yellow-800 text-yellow-200 border-yellow-600';
    }
  };

  if (loading && photos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Photo Gallery</h3>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowStats(!showStats)}>
              Statistics
            </Button>
          </div>
        </div>
        
        <PhotoSearch onSearch={handleSearch} onReset={handleReset} isLoading={loading} />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-700 rounded-t-lg"></div>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!loading && photos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Photo Gallery</h3>
          <Button variant="outline" onClick={() => setShowStats(!showStats)}>
            Statistics
          </Button>
        </div>
        
        <PhotoSearch onSearch={handleSearch} onReset={handleReset} isLoading={loading} />
        
        {showStats && (
          <PhotoStats projectId={projectId} />
        )}
        
        <Card>
          <CardContent className="p-12 text-center">
            <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No photos found</h4>
            <p className="text-gray-400">
              {Object.keys(searchParams).length > 0 
                ? 'Try adjusting your search criteria'
                : 'Upload your first photos to get started'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">
          Photo Gallery ({pagination.total} photos)
        </h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
            Statistics
          </Button>
        </div>
      </div>

      {/* Search */}
      <PhotoSearch onSearch={handleSearch} onReset={handleReset} isLoading={loading} />

      {/* Statistics */}
      {showStats && (
        <PhotoStats projectId={projectId} />
      )}

      {/* Bulk Actions */}
      {selectedPhotos.size > 0 && (
        <BulkPhotoActions
          projectId={projectId}
          selectedPhotos={Array.from(selectedPhotos)}
          onClearSelection={clearSelection}
          onPhotosUpdated={() => {
            fetchPhotos();
            clearSelection();
          }}
        />
      )}

      {/* Selection Controls */}
      {photos.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={selectAllPhotos}>
              Select All
            </Button>
            {selectedPhotos.size > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection ({selectedPhotos.size})
              </Button>
            )}
          </div>
          
          {/* Pagination Info */}
          <span className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
            {pagination.total} photos
          </span>
        </div>
      )}

      {/* Photo Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card 
              key={photo.id} 
              className={`overflow-hidden hover:shadow-lg transition-all group cursor-pointer ${
                selectedPhotos.has(photo.id) ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <CardContent className="p-0">
                {/* Photo Preview */}
                <div 
                  className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Image className="w-12 h-12 text-gray-500" />
                  
                  {/* Selection Checkbox */}
                  <div 
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedPhotos.has(photo.id) 
                        ? 'bg-red-500 border-red-500' 
                        : 'bg-gray-800 border-gray-600 hover:border-gray-400'
                    }`}>
                      {selectedPhotos.has(photo.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Consent Status Badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getConsentColor(photo.consent_status)}`}>
                      {photo.consent_status}
                    </div>
                  </div>
                </div>
                
                {/* Photo Info */}
                <div className="p-3 space-y-2">
                  <h4 className="text-white text-sm font-medium truncate" title={photo.original_name}>
                    {photo.original_name}
                  </h4>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(photo.uploaded_at)}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <User className="w-3 h-3 mr-1" />
                      {formatFileSize(photo.file_size)}
                    </div>
                  </div>

                  {/* Tags */}
                  {photo.tags && photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {photo.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {photo.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          +{photo.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {photos.map((photo) => (
            <Card 
              key={photo.id}
              className={`hover:shadow-lg transition-all cursor-pointer ${
                selectedPhotos.has(photo.id) ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Selection Checkbox */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedPhotos.has(photo.id) 
                        ? 'bg-red-500 border-red-500' 
                        : 'bg-gray-800 border-gray-600 hover:border-gray-400'
                    }`}>
                      {selectedPhotos.has(photo.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Photo Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-500" />
                  </div>

                  {/* Photo Info */}
                  <div className="flex-1 min-w-0" onClick={() => setSelectedPhoto(photo)}>
                    <h4 className="text-white font-medium truncate">{photo.original_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(photo.uploaded_at)}
                      </span>
                      <span>{formatFileSize(photo.file_size)}</span>
                      {photo.metadata && (
                        <span>{photo.metadata.width} × {photo.metadata.height}</span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Consent Status */}
                  <div className="flex items-center space-x-2">
                    {getConsentIcon(photo.consent_status)}
                    <span className="text-sm text-gray-400 capitalize">{photo.consent_status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.total_pages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdate={handlePhotoUpdate}
        />
      )}
    </div>
  );
};

export default EnhancedPhotoGallery;