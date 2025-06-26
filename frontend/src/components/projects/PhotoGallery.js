import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Image, Calendar, User } from 'lucide-react';

const PhotoGallery = ({ photos, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Photo Gallery</h3>
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

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">No photos yet</h4>
          <p className="text-gray-400">
            Upload your first photos to get started with your yearbook
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Photo Gallery ({photos.length} photos)
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            <CardContent className="p-0">
              {/* Photo Preview - Placeholder for now */}
              <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <Image className="w-12 h-12 text-gray-500" />
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

                {/* Consent Status */}
                <div className="flex items-center justify-between">
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${photo.consent_status === 'approved' 
                      ? 'bg-green-800 text-green-200' 
                      : photo.consent_status === 'rejected'
                      ? 'bg-red-800 text-red-200'
                      : 'bg-yellow-800 text-yellow-200'
                    }
                  `}>
                    {photo.consent_status}
                  </span>
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
    </div>
  );
};

export default PhotoGallery;