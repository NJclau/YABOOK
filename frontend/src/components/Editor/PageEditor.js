import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDrop } from 'react-dnd';
import { useProjectStore } from '../../store/projectStore';
import DraggableElement from './DraggableElement';
import ElementToolbar from './ElementToolbar';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  DocumentTextIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const ELEMENT_TYPES = {
  PHOTO: 'photo',
  TEXT: 'text',
  SHAPE: 'shape'
};

export default function PageEditor() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  const { 
    fetchProject,
    fetchPages,
    pages,
    updatePageLayout,
    photos,
    fetchPhotos
  } = useProjectStore();

  useEffect(() => {
    if (projectId && pageId) {
      fetchProject(projectId);
      fetchPages(projectId);
      fetchPhotos(projectId);
    }
  }, [projectId, pageId, fetchProject, fetchPages, fetchPhotos]);

  useEffect(() => {
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setCurrentPage(page);
      if (page.layout_data?.dimensions) {
        setCanvasSize(page.layout_data.dimensions);
      }
    }
  }, [pages, pageId]);

  const [{ isOver }, drop] = useDrop({
    accept: ['photo', 'element'],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();
      const x = offset.x - canvasRect.left;
      const y = offset.y - canvasRect.top;
      
      if (item.type === 'photo') {
        addPhotoElement(item.photo, x, y);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const addPhotoElement = useCallback((photo, x, y) => {
    const newElement = {
      id: `photo-${Date.now()}`,
      type: ELEMENT_TYPES.PHOTO,
      x: Math.max(0, x - 75), // Center the element
      y: Math.max(0, y - 75),
      width: 150,
      height: 150,
      content: {
        photoId: photo.id,
        photoUrl: photo.file_path,
        alt: photo.original_name
      },
      styles: {
        borderRadius: '8px',
        border: '2px solid #e2e8f0'
      }
    };
    
    updateElements([...currentPage.layout_data.elements, newElement]);
  }, [currentPage]);

  const addTextElement = useCallback(() => {
    const newElement = {
      id: `text-${Date.now()}`,
      type: ELEMENT_TYPES.TEXT,
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      content: {
        text: 'Edit this text',
        fontSize: 16,
        fontWeight: 'normal'
      },
      styles: {
        color: '#374151',
        textAlign: 'left',
        fontFamily: 'Inter, sans-serif'
      }
    };
    
    updateElements([...currentPage.layout_data.elements, newElement]);
  }, [currentPage]);

  const updateElements = async (elements) => {
    const updatedLayoutData = {
      ...currentPage.layout_data,
      elements
    };
    
    const result = await updatePageLayout(pageId, updatedLayoutData);
    if (result) {
      setCurrentPage(result);
    }
  };

  const updateElement = useCallback((elementId, updates) => {
    const elements = currentPage.layout_data.elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    updateElements(elements);
  }, [currentPage, updateElements]);

  const deleteElement = useCallback((elementId) => {
    const elements = currentPage.layout_data.elements.filter(el => el.id !== elementId);
    updateElements(elements);
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  }, [currentPage, selectedElement, updateElements]);

  const duplicateElement = useCallback((elementId) => {
    const element = currentPage.layout_data.elements.find(el => el.id === elementId);
    if (element) {
      const duplicated = {
        ...element,
        id: `${element.type}-${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20
      };
      updateElements([...currentPage.layout_data.elements, duplicated]);
    }
  }, [currentPage, updateElements]);

  if (!currentPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{currentPage.name}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                previewMode 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        {!previewMode && (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Elements</h2>
              
              {/* Add Elements */}
              <div className="space-y-2 mb-6">
                <button
                  onClick={addTextElement}
                  className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium">Add Text</span>
                </button>
              </div>

              {/* Photo Library */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Photos</h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {photos.slice(0, 20).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative bg-gray-100 rounded cursor-pointer hover:bg-gray-200 aspect-square flex items-center justify-center"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'photo',
                          photo: photo
                        }));
                      }}
                    >
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Element Properties */}
              {selectedElement && (
                <ElementToolbar
                  element={selectedElement}
                  onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                  onDelete={() => deleteElement(selectedElement.id)}
                  onDuplicate={() => duplicateElement(selectedElement.id)}
                />
              )}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex justify-center">
              <div
                id="canvas"
                ref={drop}
                className={`relative bg-white shadow-lg mx-auto ${
                  isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                }`}
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                  minHeight: '600px'
                }}
                onClick={() => setSelectedElement(null)}
              >
                {/* Canvas Background */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundColor: currentPage.layout_data.background?.color || '#ffffff'
                  }}
                />

                {/* Grid (in edit mode only) */}
                {!previewMode && (
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  />
                )}

                {/* Elements */}
                {currentPage.layout_data.elements.map((element) => (
                  <DraggableElement
                    key={element.id}
                    element={element}
                    isSelected={selectedElement?.id === element.id}
                    isPreview={previewMode}
                    onSelect={() => !previewMode && setSelectedElement(element)}
                    onUpdate={(updates) => updateElement(element.id, updates)}
                  />
                ))}

                {/* Drop indicator */}
                {!previewMode && isOver && (
                  <div className="absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-dashed border-blue-400 flex items-center justify-center">
                    <div className="text-blue-600 text-center">
                      <CursorArrowRaysIcon className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Drop to add element</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}