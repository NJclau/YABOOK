import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Dashboard from './components/Dashboard';
import SchoolManagement from './components/SchoolManagement';
import PhotoManagement from './components/PhotoManagement';
import PhotoPrismSettings from './components/PhotoPrismSettings';
import SyncMonitoring from './components/SyncMonitoring';
import PhotoSearch from './components/PhotoSearch';

function App() {
  const [currentSchool, setCurrentSchool] = useState(null);

  return (
    <div className="App min-h-screen bg-gray-50">
      <BrowserRouter>
        <div className="flex">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-gray-900 text-white min-h-screen p-4">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-blue-400">YABOOK</h1>
              <p className="text-sm text-gray-400">PhotoPrism Integration</p>
            </div>
            
            {currentSchool && (
              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">Current School</p>
                <p className="font-medium">{currentSchool.name}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <a href="/dashboard" className="block px-3 py-2 rounded-lg bg-blue-600 text-white">
                Dashboard
              </a>
              <a href="/schools" className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                School Management
              </a>
              <a href="/photos" className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                Photo Management
              </a>
              <a href="/search" className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                AI Photo Search
              </a>
              <a href="/sync" className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                Sync Monitoring
              </a>
              <a href="/settings" className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300">
                PhotoPrism Settings
              </a>
            </div>
          </nav>
          
          {/* Main Content */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={<Dashboard currentSchool={currentSchool} setCurrentSchool={setCurrentSchool} />} 
              />
              <Route 
                path="/schools" 
                element={<SchoolManagement setCurrentSchool={setCurrentSchool} />} 
              />
              <Route 
                path="/photos" 
                element={<PhotoManagement currentSchool={currentSchool} />} 
              />
              <Route 
                path="/search" 
                element={<PhotoSearch currentSchool={currentSchool} />} 
              />
              <Route 
                path="/sync" 
                element={<SyncMonitoring currentSchool={currentSchool} />} 
              />
              <Route 
                path="/settings" 
                element={<PhotoPrismSettings currentSchool={currentSchool} />} 
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;