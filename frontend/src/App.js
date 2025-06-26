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
  const [currentSchool, setCurrentSchool] = useState(() => {
    // Try to load school from localStorage
    const savedSchool = localStorage.getItem('currentSchool');
    return savedSchool ? JSON.parse(savedSchool) : null;
  });

  // Save school to localStorage whenever it changes
  useEffect(() => {
    if (currentSchool) {
      localStorage.setItem('currentSchool', JSON.stringify(currentSchool));
    } else {
      localStorage.removeItem('currentSchool');
    }
  }, [currentSchool]);

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
              <a 
                href="/dashboard" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/dashboard' || window.location.pathname === '/'
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                Dashboard
              </a>
              <a 
                href="/schools" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/schools'
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                School Management
              </a>
              <a 
                href="/photos" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/photos'
                    ? 'bg-blue-600 text-white' 
                    : currentSchool ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-500 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!currentSchool) {
                    e.preventDefault();
                    alert('Please select a school first from the dashboard');
                  }
                }}
              >
                Photo Management
              </a>
              <a 
                href="/search" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/search'
                    ? 'bg-blue-600 text-white' 
                    : currentSchool ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-500 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!currentSchool) {
                    e.preventDefault();
                    alert('Please select a school first from the dashboard');
                  }
                }}
              >
                AI Photo Search
              </a>
              <a 
                href="/sync" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/sync'
                    ? 'bg-blue-600 text-white' 
                    : currentSchool ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-500 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!currentSchool) {
                    e.preventDefault();
                    alert('Please select a school first from the dashboard');
                  }
                }}
              >
                Sync Monitoring
              </a>
              <a 
                href="/settings" 
                className={`block px-3 py-2 rounded-lg ${
                  window.location.pathname === '/settings'
                    ? 'bg-blue-600 text-white' 
                    : currentSchool ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-500 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!currentSchool) {
                    e.preventDefault();
                    alert('Please select a school first from the dashboard');
                  }
                }}
              >
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