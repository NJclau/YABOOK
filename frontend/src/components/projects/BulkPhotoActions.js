import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Trash2, Tag, CheckCircle, X, Users } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BulkPhotoActions = ({ projectId, selectedPhotos, onClearSelection, onPhotosUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTags, setNewTags] = useState('');
  const { addToast } = useToast();

  const handleBulkOperation = async (operation, data = null) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/projects/${projectId}/photos/bulk`,
        {
          photo_ids: selectedPhotos,
          operation,
          data
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      addToast(response.data.message, 'success');
      onPhotosUpdated();
    } catch (error) {
      addToast(error.response?.data?.detail || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedPhotos.length} photo(s)? This action cannot be undone.`)) {
      await handleBulkOperation('delete');
    }
  };

  const handleUpdateTags = async () => {
    if (!newTags.trim()) {
      addToast('Please enter tags', 'error');
      return;
    }

    const tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    await handleBulkOperation('update_tags', { tags });
    setNewTags('');
    setShowTagInput(false);
  };

  const handleUpdateConsent = async (consentStatus) => {
    await handleBulkOperation('update_consent', { consent_status: consentStatus });
  };

  return (
    <Card className="border-yellow-600 bg-yellow-900/10">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-medium">
                {selectedPhotos.length} photo(s) selected
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="w-4 h-4 mr-2" />
              Clear Selection
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Delete Photos */}
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>

            {/* Tag Management */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTagInput(!showTagInput)}
              disabled={loading}
            >
              <Tag className="w-4 h-4 mr-2" />
              Add Tags
            </Button>

            {/* Consent Actions */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateConsent('approved')}
              disabled={loading}
              className="text-green-400 border-green-600 hover:bg-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateConsent('rejected')}
              disabled={loading}
              className="text-red-400 border-red-600 hover:bg-red-600"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateConsent('pending')}
              disabled={loading}
              className="text-yellow-400 border-yellow-600 hover:bg-yellow-600"
            >
              Set Pending
            </Button>
          </div>

          {/* Tag Input */}
          {showTagInput && (
            <div className="flex space-x-2">
              <Input
                placeholder="Enter tags separated by commas"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateTags()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleUpdateTags} disabled={loading}>
                Add Tags
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowTagInput(false);
                  setNewTags('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkPhotoActions;