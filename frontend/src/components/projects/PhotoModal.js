import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { X, Save, Tag, Calendar, MapPin, Users, FileText, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoModal = ({ photo, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    tags: photo.tags.join(', '),
    consent_status: photo.consent_status,
    description: photo.description || '',
    taken_date: photo.taken_date ? photo.taken_date.split('T')[0] : '',
    location: photo.location || '',
    people: photo.people.join(', ')
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        people: formData.people.split(',').map(person => person.trim()).filter(person => person),
        taken_date: formData.taken_date || null
      };

      const response = await axios.put(`${API}/photos/${photo.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onUpdate(response.data);
      addToast('Photo updated successfully!', 'success');
      onClose();
    } catch (error) {
      addToast(error.response?.data?.detail || 'Failed to update photo', 'error');
    } finally {
      setLoading(false);
    }
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700">
          <CardTitle className="flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-red-500" />
            Photo Details
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(90vh-80px)]">
          {/* Photo Preview */}
          <div className="bg-gray-900 flex items-center justify-center p-4">
            <div className="text-center">
              <ImageIcon className="w-32 h-32 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm mb-2">{photo.original_name}</p>
              <div className="space-y-1 text-xs text-gray-500">
                {photo.metadata && (
                  <>
                    <p>{photo.metadata.width} × {photo.metadata.height} pixels</p>
                    <p>{photo.metadata.format} format</p>
                  </>
                )}
                <p>{formatFileSize(photo.file_size)}</p>
                <p>Uploaded: {formatDate(photo.uploaded_at)}</p>
              </div>
            </div>
          </div>

          {/* Photo Information */}
          <div className="overflow-y-auto">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">
                      Original Filename
                    </label>
                    <p className="text-white bg-gray-800 p-2 rounded border">{photo.original_name}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Add a description for this photo..."
                      rows={3}
                      className="flex w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      Tags
                    </label>
                    <Input
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      Consent Status
                    </label>
                    <select
                      name="consent_status"
                      value={formData.consent_status}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Date Taken
                      </label>
                      <Input
                        type="date"
                        name="taken_date"
                        value={formData.taken_date}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Location
                      </label>
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Where was this taken?"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      People in Photo
                    </label>
                    <Input
                      name="people"
                      value={formData.people}
                      onChange={handleChange}
                      placeholder="Enter names separated by commas"
                    />
                    <p className="text-xs text-gray-500">Separate multiple names with commas</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PhotoModal;