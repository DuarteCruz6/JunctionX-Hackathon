import React from 'react';

const DownloadOptionsModal = ({ 
  isOpen, 
  onClose, 
  onDownloadCurrent, 
  onDownloadAll,
  currentImageName,
  totalImagesCount,
  isDownloading
}) => {
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
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Download Options
            </h2>
            <p className="text-slate-400">
              Choose how you'd like to download your images
            </p>
          </div>

          <div className="space-y-4">
            {/* Download Current Image Option */}
            <button
              onClick={() => {
                console.log('Download Current button clicked');
                onDownloadCurrent();
              }}
              disabled={isDownloading}
              className={`w-full p-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-all transform shadow-lg ${
                isDownloading 
                  ? 'cursor-not-allowed opacity-70' 
                  : 'hover:scale-105'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-emerald-600 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Download Current Image</h3>
                    <p className="text-sm text-slate-400">
                      {currentImageName || 'Current processed image'}
                    </p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Download All Images Option */}
            <button
              onClick={() => {
                console.log('Download All button clicked');
                onDownloadAll();
              }}
              disabled={isDownloading}
              className={`w-full p-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-all transform shadow-lg ${
                isDownloading 
                  ? 'cursor-not-allowed opacity-70' 
                  : 'hover:scale-105'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-600 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Download All Images</h3>
                    <p className="text-sm text-slate-400">
                      {totalImagesCount} processed images as ZIP file
                    </p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Loading State */}
          {isDownloading && (
            <div className="mt-6 p-4 bg-blue-900/50 border border-blue-500/50 rounded-lg">
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-blue-300 text-sm">Preparing download...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadOptionsModal;
