import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { 
  TemplateIcon,
  FunnelIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function TemplateGallery() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const { templates, fetchTemplates } = useProjectStore();

  useEffect(() => {
    fetchTemplates(selectedCategory);
  }, [selectedCategory, fetchTemplates]);

  const categories = [
    { value: '', label: 'All Templates' },
    { value: 'yearbook', label: 'Yearbook' },
    { value: 'showcase', label: 'Showcase' },
    { value: 'collage', label: 'Collage' },
  ];

  const TemplatePreview = ({ template }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div 
        className="relative bg-gray-100 rounded border mb-3 overflow-hidden"
        style={{ 
          aspectRatio: `${template.layout_schema.dimensions.width}/${template.layout_schema.dimensions.height}`,
          minHeight: '200px'
        }}
      >
        {/* Template preview visualization */}
        <div className="absolute inset-0 p-2">
          {template.layout_schema.elements.map((element, index) => (
            <div
              key={element.id || index}
              className={`absolute border-2 border-dashed flex items-center justify-center text-xs ${
                element.type === 'photo' 
                  ? 'border-blue-300 bg-blue-50 text-blue-600' 
                  : 'border-green-300 bg-green-50 text-green-600'
              }`}
              style={{
                left: `${(element.x / template.layout_schema.dimensions.width) * 100}%`,
                top: `${(element.y / template.layout_schema.dimensions.height) * 100}%`,
                width: `${(element.width / template.layout_schema.dimensions.width) * 100}%`,
                height: `${(element.height / template.layout_schema.dimensions.height) * 100}%`,
              }}
            >
              {element.type === 'photo' ? 'Photo' : 'Text'}
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {template.category}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTemplate(template)}
              className="text-gray-400 hover:text-gray-600"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Gallery</h1>
          <p className="text-gray-600">Choose from pre-designed templates for your yearbook pages</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <TemplateIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No templates found</h3>
          <p className="mt-2 text-gray-500">
            {selectedCategory 
              ? 'No templates available in this category.' 
              : 'No templates available yet.'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-700">
              Showing {templates.length} template{templates.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplatePreview key={template.id} template={template} />
            ))}
          </div>
        </>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.name}</h3>
                {selectedTemplate.description && (
                  <p className="text-gray-600 mt-1">{selectedTemplate.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div 
                className="bg-gray-100 rounded-lg border mx-auto relative"
                style={{ 
                  aspectRatio: `${selectedTemplate.layout_schema.dimensions.width}/${selectedTemplate.layout_schema.dimensions.height}`,
                  maxHeight: '400px',
                  width: 'fit-content'
                }}
              >
                <div className="absolute inset-0 p-4">
                  {selectedTemplate.layout_schema.elements.map((element, index) => (
                    <div
                      key={element.id || index}
                      className={`absolute border-2 border-dashed flex items-center justify-center text-sm font-medium ${
                        element.type === 'photo' 
                          ? 'border-blue-400 bg-blue-100 text-blue-700' 
                          : 'border-green-400 bg-green-100 text-green-700'
                      }`}
                      style={{
                        left: `${(element.x / selectedTemplate.layout_schema.dimensions.width) * 100}%`,
                        top: `${(element.y / selectedTemplate.layout_schema.dimensions.height) * 100}%`,
                        width: `${(element.width / selectedTemplate.layout_schema.dimensions.width) * 100}%`,
                        height: `${(element.height / selectedTemplate.layout_schema.dimensions.height) * 100}%`,
                      }}
                    >
                      {element.type === 'photo' ? 'Photo Area' : element.content?.text || 'Text Area'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}