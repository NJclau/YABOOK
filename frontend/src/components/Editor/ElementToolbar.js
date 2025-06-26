import React from 'react';
import { 
  TrashIcon, 
  DocumentDuplicateIcon,
  PaintBrushIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function ElementToolbar({ element, onUpdate, onDelete, onDuplicate }) {
  const handleStyleChange = (property, value) => {
    onUpdate({
      styles: {
        ...element.styles,
        [property]: value
      }
    });
  };

  const handleContentChange = (property, value) => {
    onUpdate({
      content: {
        ...element.content,
        [property]: value
      }
    });
  };

  const renderTextControls = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Size
        </label>
        <input
          type="range"
          min="8"
          max="72"
          value={element.content?.fontSize || 16}
          onChange={(e) => handleContentChange('fontSize', parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{element.content?.fontSize || 16}px</span>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Weight
        </label>
        <select
          value={element.content?.fontWeight || 'normal'}
          onChange={(e) => handleContentChange('fontWeight', e.target.value)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="lighter">Light</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Text Color
        </label>
        <input
          type="color"
          value={element.styles?.color || '#000000'}
          onChange={(e) => handleStyleChange('color', e.target.value)}
          className="w-full h-8 border border-gray-300 rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Text Align
        </label>
        <select
          value={element.styles?.textAlign || 'left'}
          onChange={(e) => handleStyleChange('textAlign', e.target.value)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );

  const renderPhotoControls = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Border Radius
        </label>
        <input
          type="range"
          min="0"
          max="24"
          value={parseInt(element.styles?.borderRadius) || 0}
          onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {parseInt(element.styles?.borderRadius) || 0}px
        </span>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Border Color
        </label>
        <input
          type="color"
          value={element.styles?.borderColor || '#e2e8f0'}
          onChange={(e) => handleStyleChange('borderColor', e.target.value)}
          className="w-full h-8 border border-gray-300 rounded"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Border Width
        </label>
        <input
          type="range"
          min="0"
          max="10"
          value={parseInt(element.styles?.borderWidth) || 0}
          onChange={(e) => handleStyleChange('borderWidth', `${e.target.value}px`)}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {parseInt(element.styles?.borderWidth) || 0}px
        </span>
      </div>
    </div>
  );

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
          Properties
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={onDuplicate}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Duplicate"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:text-red-600"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Position and Size */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
            <input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 20 })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
            <input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 20 })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Element-specific controls */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-medium text-gray-700 mb-3 flex items-center">
          <PaintBrushIcon className="h-3 w-3 mr-1" />
          Styling
        </h4>
        
        {element.type === 'text' && renderTextControls()}
        {element.type === 'photo' && renderPhotoControls()}
      </div>
    </div>
  );
}