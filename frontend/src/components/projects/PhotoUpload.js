import React, { useState, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Upload, X, ImageIcon } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoUpload = ({ projectId, onPhotoUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const { addToast } = useToast();

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        addToast(`${file.name} is not an image file`, 'error');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        addToast(`${file.name} is too large (max 10MB)`, 'error');
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
          `${API}/projects/${projectId}/photos`,
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        onPhotoUploaded(response.data);
      }

      setSelectedFiles([]);
      addToast(`${selectedFiles.length} photo(s) uploaded successfully!`, 'success');
    } catch (error) {
      addToast(error.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-red-500 bg-red-500/10' 
                : 'border-gray-600 hover:border-gray-500'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-white font-medium">
                  Drop photos here or click to browse
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Supports JPG, PNG, GIF up to 10MB each
                </p>
              </div>
              <Button variant="outline">
                Choose Files
              </Button>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-white font-medium">Selected Photos ({selectedFiles.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <div className="flex items-center space-x-3">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm truncate">{file.name}</span>
                      <span className="text-gray-400 text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFiles([])}
                  disabled={uploading}
                >
                  Clear All
                </Button>
                <Button 
                  onClick={uploadFiles}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo(s)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;