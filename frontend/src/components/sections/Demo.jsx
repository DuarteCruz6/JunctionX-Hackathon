import React from 'react';
import PhotoNavigation from '../ui/PhotoNavigation';
import DownloadOptionsModal from '../modals/DownloadOptionsModal';

const Demo = ({
  selectedImages,
  processedResults,
  currentResultIndex,
  showInputModal,
  isEditingNumber,
  editNumber,
  onFileChange,
  onAddMoreFiles,
  onProcessImages,
  onClearAll,
  onNavigateResult,
  onNavigateBySeven,
  onNavigateToIndex,
  onEditNumber,
  onSaveNumber,
  onEditInputChange,
  onEditKeyPress,
  onDownloadImage,
  onShowDownloadOptions,
  onCloseDownloadModal,
  onDownloadCurrentImage,
  onDownloadAllImages,
  showDownloadModal,
  isDownloading,
  onShowInputModal,
  onRemoveImage,
  isLoading,
  isUploading,
  uploadError
}) => {
  return (
    <section id="demo" className="py-20 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full">
        
        <div className="w-full">
          <div className="bg-slate-800/70 backdrop-blur-md p-8 border border-slate-600/50 shadow-xl">
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 hover:border-emerald-500/50 transition-all">
              {selectedImages.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-white">
                      Selected Images ({selectedImages.length})
                      {selectedImages.length > 12 && (
                        <span className="text-sm text-slate-400 ml-2">(Showing first 12)</span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={onClearAll}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105"
                      >
                        Clear All
                      </button>
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/tiff"
                          multiple
                          className="hidden"
                          id="add-more-files"
                          onChange={onAddMoreFiles}
                        />
                        <label
                          htmlFor="add-more-files"
                          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            isUploading 
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add More
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {selectedImages.slice(0, 12).map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="w-full h-24 object-cover rounded-lg border border-slate-600"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <button
                            onClick={() => onRemoveImage(index)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">{image.name}</p>
                      </div>
                    ))}
                    {selectedImages.length > 12 && (
                      <div className="relative group">
                        <div className="w-full h-24 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-400">+{selectedImages.length - 12}</div>
                            <div className="text-xs text-slate-500">more images</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {uploadError && (
                    <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-red-400 font-semibold mb-2">File Upload Error</h4>
                          <div className="text-red-300 text-sm whitespace-pre-line">
                            {uploadError}
                          </div>
                          <div className="mt-3 text-xs text-red-400">
                            💡 <strong>Tip:</strong> Please select only JPG, PNG, or TIFF files under 50MB each.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <button 
                      onClick={onProcessImages}
                      disabled={isLoading || isUploading}
                      className={`px-8 py-3 rounded-lg text-lg font-semibold transition-all transform ${
                        isLoading || isUploading
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
                      }`}
                    >
                      {isUploading ? 'AI analysing pictures...' : isLoading ? 'Processing...' : 'Upload & Process Images'}
                    </button>
                    {selectedImages.length > 0 && (
                      <p className="text-sm text-slate-400 mt-2">
                        {selectedImages.filter(img => !img.uploaded).length} images ready to upload
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-slate-400 mb-6">
                    <svg className="mx-auto h-16 w-16" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Upload Forest Images</h3>
                  <div className="text-sm text-slate-400 mb-8">
                    <p className="mb-2"><strong>Supported formats:</strong> JPG, PNG, TIFF</p>
                    <p className="mb-2"><strong>File size limit:</strong> 50MB per file</p>
                    <p className="text-slate-500 text-xs">Tip: Select multiple files at once for batch processing</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/tiff"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={onFileChange}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center px-8 py-4 rounded-lg text-lg font-semibold transition-all ${
                      isUploading 
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105 cursor-pointer'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose Images
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 bg-slate-800/70 backdrop-blur-md p-8 border-t border-b border-slate-600/50 shadow-xl w-full mx-0">
            <h3 className="text-2xl font-semibold text-white mb-6">AI Analysis Results</h3>
            
            {processedResults.length > 0 ? (
              <div className="space-y-8">
                {/* Top Info Bar */}
                <div className="flex justify-end items-center">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-slate-400">
                      Confidence: {processedResults[currentResultIndex]?.status === 'api_error' 
                        ? 'N/A' 
                        : `${(processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%`
                      }
                    </div>
                    <button
                      onClick={onShowDownloadOptions}
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {processedResults[currentResultIndex]?.status === 'api_error' && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="text-red-400 font-semibold">API Not Configured</h4>
                        <p className="text-red-300 text-sm mt-1">
                          The analysis API is not available. Please check your backend configuration.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Results Display - Full Screen Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                  {/* Input Image Thumbnail - Sidebar */}
                  <div className="xl:col-span-1">
                    <h4 className="text-lg font-semibold text-white mb-4">Input Image</h4>
                    <div 
                      className="relative cursor-pointer group mb-4"
                      onClick={onShowInputModal}
                    >
                      <img
                        src={processedResults[currentResultIndex]?.inputImage}
                        alt="Input"
                        className="w-full h-64 object-cover rounded-lg border border-slate-600 hover:border-emerald-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-sm">Click to enlarge</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-4 truncate">
                      {processedResults[currentResultIndex]?.inputName}
                    </p>
                    
                    {/* Analysis Details - Sidebar */}
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h5 className="text-md font-semibold text-white mb-3">Analysis Summary</h5>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="text-slate-400">Processing Time</div>
                          <div className="text-white font-semibold">
                            {processedResults[currentResultIndex]?.status === 'failed'
                              ? 'N/A' 
                              : `${(processedResults[currentResultIndex]?.processingTime || 0).toFixed(2)}s`
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Detected Areas</div>
                          <div className="text-white font-semibold">
                            {processedResults[currentResultIndex]?.status === 'failed'
                              ? 'N/A' 
                              : processedResults[currentResultIndex]?.detectedAreas || 0
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Confidence</div>
                          <div className={`font-semibold ${
                            processedResults[currentResultIndex]?.status === 'failed'
                              ? 'text-red-400' 
                              : 'text-emerald-400'
                          }`}>
                            {processedResults[currentResultIndex]?.status === 'failed'
                              ? 'N/A' 
                              : `${(processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%`
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Status</div>
                          <div className={`font-semibold ${
                            processedResults[currentResultIndex]?.status === 'failed'
                              ? 'text-red-400' 
                              : 'text-green-400'
                          }`}>
                            {processedResults[currentResultIndex]?.status === 'failed'
                              ? 'ML Service Unavailable'
                              : 'Completed'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Species</div>
                          <div className="text-white font-semibold">
                            {processedResults[currentResultIndex]?.status === 'failed'
                              ? 'N/A' 
                              : processedResults[currentResultIndex]?.species?.length > 0 
                                ? processedResults[currentResultIndex].species.join(', ')
                                : 'Unknown'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output Image - Main Display */}
                  <div className="xl:col-span-4">
                    <h4 className="text-lg font-semibold text-white mb-4">AI Analysis Result</h4>
                    
                    {/* Navigation Above Image */}
                    <div className="flex justify-center mb-6">
                      <PhotoNavigation
                        processedResults={processedResults}
                        currentResultIndex={currentResultIndex}
                        onNavigateResult={onNavigateResult}
                        onNavigateBySeven={onNavigateBySeven}
                        onNavigateToIndex={onNavigateToIndex}
                      />
                    </div>
                    
                    <div className="relative h-[70vh] overflow-hidden flex items-center justify-center">
                      <img
                        src={processedResults[currentResultIndex]?.outputImage}
                        alt="AI Analysis"
                        className="w-full h-full object-contain rounded-lg border border-slate-600 bg-slate-900/50"
                      />
                      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
                        <div className="text-sm text-white">
                          <div className="font-semibold mb-1">Detected Areas: {processedResults[currentResultIndex]?.detectedAreas}</div>
                          <div className="text-emerald-400">Confidence: {(processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-lg">Submit images to receive AI analysis results</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Options Modal */}
      <DownloadOptionsModal
        isOpen={showDownloadModal}
        onClose={onCloseDownloadModal}
        onDownloadCurrent={onDownloadCurrentImage}
        onDownloadAll={onDownloadAllImages}
        currentImageName={processedResults[currentResultIndex]?.outputName}
        totalImagesCount={processedResults.length}
        isDownloading={isDownloading}
      />
    </section>
  );
};

export default Demo;
