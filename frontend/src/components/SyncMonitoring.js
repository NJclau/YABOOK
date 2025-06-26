import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SyncMonitoring = ({ currentSchool }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reconcileReport, setReconcileReport] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (currentSchool) {
      fetchSyncStatus();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchSyncStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [currentSchool]);

  const fetchSyncStatus = async () => {
    if (!currentSchool) return;
    setLoading(true);
    
    try {
      const response = await axios.get(`${API}/schools/${currentSchool.id}/sync/status`);
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!currentSchool) return;
    setRetrying(true);
    
    try {
      const response = await axios.post(`${API}/schools/${currentSchool.id}/sync/retry`, {}, {
        params: { limit: 10 }
      });
      
      alert(`Retrying sync for ${response.data.photo_ids.length} photos`);
      // Refresh status after a delay
      setTimeout(fetchSyncStatus, 2000);
    } catch (error) {
      console.error('Error retrying sync:', error);
      alert('Error retrying sync: ' + (error.response?.data?.detail || error.message));
    } finally {
      setRetrying(false);
    }
  };

  const handleReconcile = async (dryRun = true) => {
    if (!currentSchool) return;
    setReconciling(true);
    
    try {
      const response = await axios.post(`${API}/schools/${currentSchool.id}/reconcile`, {}, {
        params: { dry_run: dryRun }
      });
      
      setReconcileReport(response.data);
      if (!dryRun) {
        // Refresh status after reconciliation
        setTimeout(fetchSyncStatus, 2000);
      }
    } catch (error) {
      console.error('Error reconciling:', error);
      alert('Error reconciling: ' + (error.response?.data?.detail || error.message));
    } finally {
      setReconciling(false);
    }
  };

  if (!currentSchool) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please select a school from the dashboard to monitor sync operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sync Monitoring</h1>
          <p className="text-gray-600">
            Monitor PhotoPrism sync operations for {currentSchool.name}
          </p>
        </div>
        <button
          onClick={fetchSyncStatus}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Sync Status Overview */}
      {syncStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Photos</h3>
            <p className="text-3xl font-bold mt-2 text-blue-600">{syncStatus.total_photos}</p>
            <p className="text-sm text-gray-500">All photos in system</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Synced</h3>
            <p className="text-3xl font-bold mt-2 text-green-600">{syncStatus.synced_photos}</p>
            <p className="text-sm text-gray-500">{syncStatus.sync_percentage}% complete</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{syncStatus.pending_photos}</p>
            <p className="text-sm text-gray-500">Waiting for sync</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Failed</h3>
            <p className="text-3xl font-bold mt-2 text-red-600">{syncStatus.failed_photos}</p>
            <p className="text-sm text-gray-500">Sync errors</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {syncStatus && syncStatus.total_photos > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Sync Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${syncStatus.sync_percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>0%</span>
            <span className="font-medium">{syncStatus.sync_percentage}% Complete</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Active Jobs */}
      {syncStatus && syncStatus.active_sync_jobs > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
            <div>
              <h3 className="font-medium text-blue-900">Sync in Progress</h3>
              <p className="text-sm text-blue-700">
                {syncStatus.active_sync_jobs} active sync jobs running
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Sync Info */}
      {syncStatus && syncStatus.last_sync && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Last Sync Activity</h3>
          <p className="text-gray-600">
            {new Date(syncStatus.last_sync).toLocaleString()}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Sync Actions</h3>
        <div className="space-y-4">
          {/* Retry Failed */}
          {syncStatus && syncStatus.failed_photos > 0 && (
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium text-red-900">Retry Failed Syncs</h4>
                <p className="text-sm text-red-700">
                  Retry up to 10 failed photo sync operations
                </p>
              </div>
              <button
                onClick={handleRetryFailed}
                disabled={retrying}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {retrying ? 'Retrying...' : 'Retry Failed'}
              </button>
            </div>
          )}

          {/* Reconciliation */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Data Reconciliation</h4>
            <p className="text-sm text-purple-700 mb-4">
              Check for inconsistencies between YABOOK and PhotoPrism data
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleReconcile(true)}
                disabled={reconciling}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {reconciling ? 'Checking...' : 'Check (Dry Run)'}
              </button>
              <button
                onClick={() => handleReconcile(false)}
                disabled={reconciling}
                className="bg-purple-800 text-white px-4 py-2 rounded-lg hover:bg-purple-900 disabled:opacity-50"
              >
                Fix Issues
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Report */}
      {reconcileReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Reconciliation Report</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-600">YABOOK Photos</p>
                <p className="text-xl font-bold text-blue-900">{reconcileReport.yabook_photos}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-green-600">PhotoPrism Photos</p>
                <p className="text-xl font-bold text-green-900">{reconcileReport.photoprism_photos}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-sm text-yellow-600">Orphaned YABOOK</p>
                <p className="text-xl font-bold text-yellow-900">{reconcileReport.orphaned_yabook.length}</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-red-600">Orphaned PhotoPrism</p>
                <p className="text-xl font-bold text-red-900">{reconcileReport.orphaned_photoprism.length}</p>
              </div>
            </div>

            {reconcileReport.actions_taken && reconcileReport.actions_taken.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Actions Taken:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {reconcileReport.actions_taken.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm text-gray-500">
              <p>Started: {new Date(reconcileReport.started_at).toLocaleString()}</p>
              {reconcileReport.completed_at && (
                <>
                  <p>Completed: {new Date(reconcileReport.completed_at).toLocaleString()}</p>
                  <p>Duration: {reconcileReport.duration_seconds.toFixed(2)} seconds</p>
                </>
              )}
              <p>Mode: {reconcileReport.dry_run ? 'Dry Run (No Changes Made)' : 'Live Run (Changes Applied)'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncMonitoring;