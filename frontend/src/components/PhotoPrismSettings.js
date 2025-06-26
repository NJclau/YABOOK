import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoPrismSettings = ({ currentSchool }) => {
  const [instance, setInstance] = useState(null);
  const [instanceHealth, setInstanceHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInstance, setNewInstance] = useState({
    instance_name: '',
    base_url: '',
    admin_username: 'admin',
    admin_password: '',
    metadata: {}
  });

  useEffect(() => {
    if (currentSchool) {
      fetchInstance();
      fetchInstanceHealth();
    }
  }, [currentSchool]);

  const fetchInstance = async () => {
    if (!currentSchool) return;
    setLoading(true);
    
    try {
      const response = await axios.get(`${API}/schools/${currentSchool.id}/photoprism-instance`);
      setInstance(response.data);
      setShowCreateForm(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setInstance(null);
        setShowCreateForm(true);
      } else {
        console.error('Error fetching instance:', error);
      }
    } finally {
      setLoading(false);
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

  const handleCreateInstance = async (e) => {
    e.preventDefault();
    if (!currentSchool) return;
    
    setSaving(true);
    
    try {
      const instanceData = {
        ...newInstance,
        school_id: currentSchool.id
      };
      
      const response = await axios.post(`${API}/schools/${currentSchool.id}/photoprism-instance`, instanceData);
      setInstance(response.data);
      setShowCreateForm(false);
      setNewInstance({
        instance_name: '',
        base_url: '',
        admin_username: 'admin',
        admin_password: '',
        metadata: {}
      });
      
      // Fetch health after creation
      setTimeout(fetchInstanceHealth, 2000);
      
      alert('PhotoPrism instance created successfully!');
    } catch (error) {
      console.error('Error creating instance:', error);
      alert('Error creating instance: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!currentSchool) return;
    
    try {
      await fetchInstanceHealth();
      alert(instanceHealth?.is_healthy ? 'Connection test successful!' : 'Connection test failed!');
    } catch (error) {
      alert('Connection test failed: ' + error.message);
    }
  };

  if (!currentSchool) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please select a school from the dashboard to configure PhotoPrism settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PhotoPrism Settings</h1>
        <p className="text-gray-600">
          Configure PhotoPrism integration for {currentSchool.name}
        </p>
      </div>

      {/* Instance Status */}
      {instance && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Instance Status</h2>
            <button
              onClick={fetchInstanceHealth}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              Check Health
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700">Instance Name</h3>
              <p className="text-lg text-gray-900">{instance.instance_name}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700">Status</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  instance.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-lg capitalize">{instance.status}</span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700">Health</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  instanceHealth?.is_healthy ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-lg">
                  {instanceHealth?.is_healthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
            </div>
          </div>
          
          {instanceHealth && (
            <div className="mt-4 text-sm text-gray-600">
              <p>Last health check: {instanceHealth.last_health_check 
                ? new Date(instanceHealth.last_health_check).toLocaleString()
                : 'Never'
              }</p>
              {instanceHealth.last_sync && (
                <p>Last sync: {new Date(instanceHealth.last_sync).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instance Configuration */}
      {instance && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PhotoPrism URL
              </label>
              <input
                type="url"
                value={instance.base_url}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                value={instance.admin_username}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created At
              </label>
              <input
                type="text"
                value={new Date(instance.created_at).toLocaleString()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={testConnection}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Test Connection
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
              >
                Reconfigure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Reconfigure Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {instance ? 'Reconfigure PhotoPrism Instance' : 'Create PhotoPrism Instance'}
          </h2>
          
          {instance && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-medium text-yellow-900">Warning</h3>
                  <p className="text-sm text-yellow-800">
                    Reconfiguring will replace the existing instance configuration. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleCreateInstance} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instance Name
              </label>
              <input
                type="text"
                value={newInstance.instance_name}
                onChange={(e) => setNewInstance({...newInstance, instance_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., School PhotoPrism Instance"
                required
              />
              <p className="text-sm text-gray-500 mt-1">A descriptive name for this PhotoPrism instance</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PhotoPrism URL
              </label>
              <input
                type="url"
                value={newInstance.base_url}
                onChange={(e) => setNewInstance({...newInstance, base_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://photoprism.example.com"
                required
              />
              <p className="text-sm text-gray-500 mt-1">The base URL of your PhotoPrism installation</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                value={newInstance.admin_username}
                onChange={(e) => setNewInstance({...newInstance, admin_username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={newInstance.admin_password}
                onChange={(e) => setNewInstance({...newInstance, admin_password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin password"
                required
              />
              <p className="text-sm text-gray-500 mt-1">This will be stored encrypted in the database</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (instance ? 'Reconfigure' : 'Create Instance')}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Integration Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">PhotoPrism Integration Guide</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <h4 className="font-medium">1. PhotoPrism Installation</h4>
            <p>Ensure PhotoPrism is installed and accessible via the provided URL</p>
          </div>
          <div>
            <h4 className="font-medium">2. Admin Credentials</h4>
            <p>Create an admin user in PhotoPrism with the credentials provided above</p>
          </div>
          <div>
            <h4 className="font-medium">3. API Access</h4>
            <p>YABOOK will use the PhotoPrism REST API for photo operations</p>
          </div>
          <div>
            <h4 className="font-medium">4. Photo Sync</h4>
            <p>Photos uploaded to YABOOK will be automatically synced to PhotoPrism</p>
          </div>
          <div>
            <h4 className="font-medium">5. AI Search</h4>
            <p>PhotoPrism's AI capabilities will enable intelligent photo search</p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Troubleshooting</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <h4 className="font-medium text-gray-900">Connection Issues</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Verify PhotoPrism URL is accessible</li>
              <li>Check network connectivity</li>
              <li>Ensure admin credentials are correct</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Sync Problems</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check PhotoPrism storage space</li>
              <li>Monitor sync status in Sync Monitoring</li>
              <li>Review error logs for detailed information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoPrismSettings;