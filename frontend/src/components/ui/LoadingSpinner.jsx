import React from 'react';

const LoadingSpinner = ({ isOpen, message = "Processing images..." }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-8 shadow-2xl max-w-md mx-4">
        <div className="text-center">
          {/* Animated Spinner */}
          <div className="w-16 h-16 mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-emerald-500"></div>
          </div>
          
          {/* Loading Message */}
          <h3 className="text-xl font-semibold text-white mb-2">
            {message}
          </h3>
          
          {/* Progress Dots Animation */}
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
