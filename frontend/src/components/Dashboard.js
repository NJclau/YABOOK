import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ currentSchool, setCurrentSchool }) => {
  const [schools, setSchools] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [instanceHealth, setInstanceHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
    if (currentSchool) {
      fetchSyncStatus();
      fetchInstanceHealth();
    }
  }, [currentSchool]);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/schools`);
      setSchools(response.data);
      if (response.data.length > 0 && !currentSchool) {
        setCurrentSchool(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    if (!currentSchool) return;
    try {
      const response = await axios.get(`${API}/schools/${currentSchool.id}/sync/status`);
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const fetchInstanceHealth = async () => {
    if (!currentSchool) return;
    try {
      const response = await axios.get(`${API}/schools/${currentSchool.id}/photoprism-instance/health`);
      setInstanceHealth(response.data);
    } catch (error) {
      console.error('Error fetching instance health:', error);
      setInstanceHealth({ is_healthy: false, error: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <img 
          src="https://images.pexels.com/photos/3584993/pexels-photo-3584993.jpeg"
          alt="Photo Management Dashboard"
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">YABOOK PhotoPrism Integration</h1>
            <p className="text-xl mb-6">AI-Powered Photo Management for Schools</p>
            <div className="flex space-x-4 justify-center">
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg px-4 py-2">
                <p className="text-sm">Schools</p>
                <p className="text-2xl font-bold">{schools.length}</p>
              </div>
              {syncStatus && (
                <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg px-4 py-2">
                  <p className="text-sm">Total Photos</p>
                  <p className="text-2xl font-bold">{syncStatus.total_photos}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* School Selector */}
      {schools.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Select School</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schools.map((school) => (
              <div
                key={school.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  currentSchool?.id === school.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentSchool(school)}
              >
                <h3 className="font-semibold">{school.name}</h3>
                <p className="text-sm text-gray-500">Slug: {school.slug}</p>
                <p className="text-xs text-gray-400">
                  Created: {new Date(school.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Cards */}
      {currentSchool && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* PhotoPrism Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                instanceHealth?.is_healthy ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <h3 className="text-lg font-semibold">PhotoPrism Status</h3>
            </div>
            <p className="text-2xl font-bold mt-2 text-gray-900">
              {instanceHealth?.is_healthy ? 'Healthy' : 'Unhealthy'}
            </p>
            <p className="text-sm text-gray-500">
              Last checked: {instanceHealth?.last_health_check 
                ? new Date(instanceHealth.last_health_check).toLocaleString()
                : 'Never'
              }
            </p>
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Total Photos</h3>
                <p className="text-3xl font-bold mt-2 text-blue-600">{syncStatus.total_photos}</p>
                <p className="text-sm text-gray-500">All photos in system</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Synced Photos</h3>
                <p className="text-3xl font-bold mt-2 text-green-600">{syncStatus.synced_photos}</p>
                <p className="text-sm text-gray-500">
                  {syncStatus.sync_percentage}% completion
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Pending Sync</h3>
                <p className="text-3xl font-bold mt-2 text-yellow-600">{syncStatus.pending_photos}</p>
                <p className="text-sm text-gray-500">
                  {syncStatus.active_sync_jobs} active jobs
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {currentSchool && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 text-left"
              onClick={() => window.location.href = '/photos'}
            >
              <h4 className="font-semibold text-blue-600">Upload Photos</h4>
              <p className="text-sm text-gray-600">Add new photos to the system</p>
            </button>
            
            <button 
              className="p-4 border border-green-200 rounded-lg hover:bg-green-50 text-left"
              onClick={() => window.location.href = '/search'}
            >
              <h4 className="font-semibold text-green-600">AI Search</h4>
              <p className="text-sm text-gray-600">Find photos using AI-powered search</p>
            </button>
            
            <button 
              className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 text-left"
              onClick={() => window.location.href = '/sync'}
            >
              <h4 className="font-semibold text-purple-600">Sync Monitor</h4>
              <p className="text-sm text-gray-600">Monitor sync operations</p>
            </button>
          </div>
        </div>
      )}

      {/* No Schools Message */}
      {schools.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-600 mb-4">No Schools Found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first school</p>
          <button 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => window.location.href = '/schools'}
          >
            Create School
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;