import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Store
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Layout/Navbar';
import AuthForm from './components/Auth/AuthForm';
import Dashboard from './components/Dashboard/Dashboard';
import ProjectView from './components/Project/ProjectView';
import PhotoLibrary from './components/Photos/PhotoLibrary';
import PageEditor from './components/Editor/PageEditor';
import TemplateGallery from './components/Templates/TemplateGallery';

import './App.css';

function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuthStore();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          
          {user && <Navbar />}
          
          <Routes>
            <Route 
              path="/auth" 
              element={
                <PublicRoute>
                  <AuthForm />
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/:projectId" 
              element={
                <ProtectedRoute>
                  <ProjectView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/:projectId/photos" 
              element={
                <ProtectedRoute>
                  <PhotoLibrary />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/:projectId/pages/:pageId/edit" 
              element={
                <ProtectedRoute>
                  <PageEditor />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/templates" 
              element={
                <ProtectedRoute>
                  <TemplateGallery />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </DndProvider>
  );
}

export default App;