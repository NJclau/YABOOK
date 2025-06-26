import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { X, BookOpen, School, Calendar, Palette } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateProjectModal = ({ onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    school_name: '',
    academic_year: new Date().getFullYear().toString(),
    theme_color: '#E50914'
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
      const response = await axios.post(`${API}/projects`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onProjectCreated(response.data);
    } catch (error) {
      addToast(error.response?.data?.detail || 'Failed to create project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const themeColors = [
    '#E50914', '#1E40AF', '#059669', '#7C3AED',
    '#DC2626', '#EA580C', '#CA8A04', '#9333EA'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-red-500" />
            Create New Project
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Project Title</label>
              <Input
                name="title"
                placeholder="e.g., Class of 2024 Yearbook"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                name="description"
                placeholder="Brief description of your yearbook project..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <School className="w-4 h-4 mr-1" />
                  School Name
                </label>
                <Input
                  name="school_name"
                  placeholder="School name"
                  value={formData.school_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Academic Year
                </label>
                <Input
                  name="academic_year"
                  placeholder="2024"
                  value={formData.academic_year}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center">
                <Palette className="w-4 h-4 mr-1" />
                Theme Color
              </label>
              <div className="flex flex-wrap gap-2">
                {themeColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme_color: color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.theme_color === color 
                        ? 'border-white scale-110' 
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProjectModal;