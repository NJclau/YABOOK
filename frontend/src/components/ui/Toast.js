import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-800 border-green-600';
      case 'error':
        return 'bg-red-800 border-red-600';
      case 'warning':
        return 'bg-yellow-800 border-yellow-600';
      default:
        return 'bg-blue-800 border-blue-600';
    }
  };

  return (
    <div className={`
      flex items-center p-4 rounded-lg border backdrop-blur-sm
      ${getBackgroundColor()}
      animate-in slide-in-from-right-full duration-300
      max-w-md shadow-lg
    `}>
      {getIcon()}
      <span className="ml-3 text-white text-sm font-medium flex-1">
        {message}
      </span>
      <button
        onClick={onClose}
        className="ml-3 text-white hover:text-gray-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;