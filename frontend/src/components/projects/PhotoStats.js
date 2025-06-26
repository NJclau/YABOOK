import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Image, CheckCircle, AlertCircle, XCircle, HardDrive, TrendingUp } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoStats = ({ projectId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects/${projectId}/photos/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch photo stats:', error);
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

  const getConsentIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getConsentColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Image className="w-5 h-5 mr-2 text-red-500" />
            Photo Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Image className="w-5 h-5 mr-2 text-red-500" />
          Photo Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Photos */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Image className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_photos}</p>
            <p className="text-sm text-gray-400">Total Photos</p>
          </div>

          {/* Storage Used */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <HardDrive className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{formatFileSize(stats.total_size)}</p>
            <p className="text-sm text-gray-400">Storage Used</p>
          </div>

          {/* Recent Uploads */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.recent_uploads}</p>
            <p className="text-sm text-gray-400">Last 7 Days</p>
          </div>

          {/* Approval Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats.total_photos > 0 
                ? Math.round(((stats.by_consent_status.approved || 0) / stats.total_photos) * 100)
                : 0
              }%
            </p>
            <p className="text-sm text-gray-400">Approved</p>
          </div>
        </div>

        {/* Consent Status Breakdown */}
        {Object.keys(stats.by_consent_status).length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Consent Status</h4>
            <div className="space-y-2">
              {Object.entries(stats.by_consent_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2">
                    {getConsentIcon(status)}
                    <span className="text-white capitalize">{status}</span>
                  </div>
                  <span className={`font-medium ${getConsentColor(status)}`}>
                    {count} ({stats.total_photos > 0 ? Math.round((count / stats.total_photos) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Type Breakdown */}
        {Object.keys(stats.by_file_type).length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">File Types</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.by_file_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-white text-sm">{type.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
                  <span className="text-gray-400 text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoStats;