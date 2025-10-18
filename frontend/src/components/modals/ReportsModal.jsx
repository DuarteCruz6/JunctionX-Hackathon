import React from 'react';

const ReportsModal = ({ isOpen, onClose, onLoginClick, onCreateAccount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4 bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Authentication Required
          </h2>
          
          <p className="text-slate-300 mb-6 leading-relaxed">
            You must be logged in to access your previous reports and analysis history. 
            Please sign in to view your forest monitoring data and conservation reports.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={onLoginClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Sign In to access Reports
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
          
          <div className="mt-6 text-sm text-slate-400">
            <p>Don't have an account? 
              <button
                onClick={onCreateAccount}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors ml-1"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
