import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, Users, Settings, ArrowRight } from 'lucide-react';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'archived':
        return 'bg-gray-500';
      case 'published':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 group-hover:text-red-400 transition-colors">
              {project.title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`}></div>
              <span className="text-xs text-gray-400 capitalize">{project.status}</span>
            </div>
          </div>
          <div 
            className="w-4 h-4 rounded-full border-2 border-gray-600"
            style={{ backgroundColor: project.theme_color }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {project.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="space-y-2 mb-4">
          {project.school_name && (
            <div className="flex items-center text-sm text-gray-400">
              <Settings className="w-4 h-4 mr-2" />
              {project.school_name}
            </div>
          )}
          
          {project.academic_year && (
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              {project.academic_year}
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-400">
            <Users className="w-4 h-4 mr-2" />
            {project.collaborators.length + 1} member{project.collaborators.length !== 0 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Updated {formatDate(project.updated_at)}
          </span>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="group-hover:bg-red-600 transition-colors"
          >
            Open
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;