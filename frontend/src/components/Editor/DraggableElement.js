import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { PhotoIcon } from '@heroicons/react/24/outline';

export default function DraggableElement({ 
  element, 
  isSelected, 
  isPreview, 
  onSelect, 
  onUpdate 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const elementRef = useRef(null);
  const textRef = useRef(null);

  const [{ isDraggingDnd }, drag] = useDrag({
    type: 'element',
    item: () => ({ id: element.id, type: element.type }),
    collect: (monitor) => ({
      isDraggingDnd: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (!isPreview) {
      drag(elementRef);
    }
  }, [drag, isPreview]);

  const handleMouseDown = (e) => {
    if (isPreview || isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.x,
      y: e.clientY - element.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isPreview) return;
    
    const newX = Math.max(0, e.clientX - dragStart.x);
    const newY = Math.max(0, e.clientY - dragStart.y);
    
    onUpdate({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e, direction) => {
    if (isPreview) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height
    });
  };

  const handleResizeMove = (e) => {
    if (!isResizing || isPreview) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(20, resizeStart.width + deltaX);
    const newHeight = Math.max(20, resizeStart.height + deltaY);
    
    onUpdate({ width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const handleDoubleClick = (e) => {
    if (isPreview || element.type !== 'text') return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextChange = (e) => {
    onUpdate({
      content: {
        ...element.content,
        text: e.target.value
      }
    });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart]);

  const elementStyle = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    cursor: isPreview ? 'default' : 'move',
    opacity: isDraggingDnd ? 0.5 : 1,
    zIndex: isSelected ? 10 : 1,
    ...element.styles
  };

  const renderElement = () => {
    switch (element.type) {
      case 'photo':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gray-100 ${
              !isPreview ? 'border-2 border-dashed border-gray-300' : ''
            }`}
            style={elementStyle}
          >
            {element.content?.photoUrl ? (
              <img
                src={element.content.photoUrl}
                alt={element.content.alt || 'Photo'}
                className="w-full h-full object-cover"
                style={{ borderRadius: element.styles?.borderRadius }}
              />
            ) : (
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>
        );

      case 'text':
        return (
          <div
            className={`w-full h-full flex items-center ${
              !isPreview && isSelected ? 'ring-2 ring-blue-400' : ''
            }`}
            style={elementStyle}
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <textarea
                ref={textRef}
                value={element.content?.text || ''}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                onKeyDown={handleTextKeyDown}
                className="w-full h-full resize-none border-none outline-none bg-transparent"
                style={{
                  fontSize: element.content?.fontSize || 16,
                  fontWeight: element.content?.fontWeight || 'normal',
                  color: element.styles?.color || '#000',
                  textAlign: element.styles?.textAlign || 'left',
                  fontFamily: element.styles?.fontFamily || 'inherit'
                }}
                autoFocus
              />
            ) : (
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  fontSize: element.content?.fontSize || 16,
                  fontWeight: element.content?.fontWeight || 'normal',
                  color: element.styles?.color || '#000',
                  textAlign: element.styles?.textAlign || 'left',
                  fontFamily: element.styles?.fontFamily || 'inherit',
                  lineHeight: element.styles?.lineHeight || 'normal'
                }}
              >
                {element.content?.text || 'Text'}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div
            className="w-full h-full bg-gray-200 border border-gray-300"
            style={elementStyle}
          >
            Unknown element
          </div>
        );
    }
  };

  return (
    <div
      ref={elementRef}
      className={`group ${isSelected && !isPreview ? 'ring-2 ring-blue-400' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!isPreview) onSelect();
      }}
    >
      {renderElement()}
      
      {/* Selection handles */}
      {isSelected && !isPreview && !isEditing && (
        <>
          {/* Corner resize handles */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-se-resize"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-ne-resize"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-600 border border-white cursor-nw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-600 border border-white cursor-sw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
        </>
      )}
    </div>
  );
}