import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import Header from '../components/layout/Header';
import Footer from '../components/sections/Footer';
import LoginModal from '../components/modals/LoginModal';
import DownloadOptionsModal from '../components/modals/DownloadOptionsModal';
import ImageModal from '../components/modals/ImageModal';
import AddPhotosModal from '../components/modals/AddPhotosModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PhotoNavigation from '../components/ui/PhotoNavigation';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useReportsData } from '../hooks/useReportsData';

// Services
import { downloadImage } from '../services/api';

const Reports = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [selectedSubmissionForUpdate, setSelectedSubmissionForUpdate] = useState(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  
  // Custom hooks
  const auth = useAuth();
  const reportsData = useReportsData(auth.isLoggedIn);

  // Check authentication status
  useEffect(() => {
    // Give auth time to initialize
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Redirect if not logged in (after auth check)
  useEffect(() => {
    if (!isCheckingAuth && !auth.isLoggedIn) {
      navigate('/');
    }
  }, [isCheckingAuth, auth.isLoggedIn, navigate]);

  // Set first report as selected by default
  useEffect(() => {
    if (reportsData.reports.length > 0 && !selectedReport) {
      setSelectedReport(reportsData.reports[0]);
    }
  }, [reportsData.reports, selectedReport]);

  // Update selectedReport when reports data changes (e.g., after adding photos)
  useEffect(() => {
    if (selectedReport && reportsData.reports.length > 0) {
      // Find the updated report with the same submission_id
      const updatedReport = reportsData.reports.find(
        report => report.submission_id === selectedReport.submission_id
      );
      if (updatedReport) {
        const oldPosition = reportsData.reports.findIndex(r => r.submission_id === selectedReport.submission_id);
        const newPosition = reportsData.reports.findIndex(r => r.submission_id === updatedReport.submission_id);
        
        console.log('Updating selectedReport with fresh data:', {
          oldImageCount: selectedReport.image_count,
          newImageCount: updatedReport.image_count,
          oldImagesLength: selectedReport.images?.length,
          newImagesLength: updatedReport.images?.length,
          oldPosition: oldPosition + 1,
          newPosition: newPosition + 1,
          movedToTop: newPosition === 0
        });
        
        setSelectedReport(updatedReport);
        
        // Reset to first image if the number of images changed
        if (updatedReport.images && updatedReport.images.length !== selectedReport.images?.length) {
          console.log('Resetting to first image due to image count change');
          setCurrentResultIndex(0);
        }
        
        // If the submission moved to the top, show a brief visual indicator
        if (newPosition === 0 && oldPosition > 0) {
          console.log('Submission moved to top position - this is now the most recent');
          setShowUpdateNotification(true);
          // Hide notification after 3 seconds
          setTimeout(() => {
            setShowUpdateNotification(false);
          }, 3000);
        }
      } else {
        console.warn('Could not find updated report for submission_id:', selectedReport.submission_id);
      }
    }
  }, [reportsData.reports, selectedReport]);

  const handleReportSelect = (report) => {
    setSelectedReport(report);
    setCurrentResultIndex(0); // Reset to first image when selecting new report
  };

  const handleNavigateResult = (direction) => {
    if (!selectedReport?.images) return;
    
    if (direction === 'next' && currentResultIndex < selectedReport.images.length - 1) {
      setCurrentResultIndex(currentResultIndex + 1);
    } else if (direction === 'prev' && currentResultIndex > 0) {
      setCurrentResultIndex(currentResultIndex - 1);
    }
  };

  const handleNavigateToIndex = (index) => {
    if (!selectedReport?.images) return;
    if (index >= 0 && index < selectedReport.images.length) {
      setCurrentResultIndex(index);
    }
  };

  const handleNavigateBySeven = (direction) => {
    if (!selectedReport?.images) return;
    
    const totalResults = selectedReport.images.length;
    const currentPage = Math.floor(currentResultIndex / 7);
    
    if (direction === 'next') {
      const nextPage = currentPage + 1;
      const firstIndexOfNextPage = nextPage * 7;
      const targetIndex = Math.min(totalResults - 1, firstIndexOfNextPage);
      setCurrentResultIndex(targetIndex);
    } else if (direction === 'prev') {
      const prevPage = Math.max(0, currentPage - 1);
      const firstIndexOfPrevPage = prevPage * 7;
      setCurrentResultIndex(firstIndexOfPrevPage);
    }
  };

  const handleAddPhotosToSubmission = (report) => {
    setSelectedSubmissionForUpdate(report);
    setShowAddPhotosModal(true);
  };

  const closeAddPhotosModal = () => {
    setShowAddPhotosModal(false);
    setSelectedSubmissionForUpdate(null);
  };

  const handleAddPhotosSubmit = async (files) => {
    if (!selectedSubmissionForUpdate || !files || files.length === 0) {
      return;
    }

    setIsUploadingPhotos(true);
    try {
      // Import the uploadImages function
      const { uploadImages } = await import('../services/api');
      
      // Upload images with the existing submission ID
      const result = await uploadImages(files, selectedSubmissionForUpdate.submission_id);
      
      console.log('Photos added to submission:', result);
      
      // Close the modal first
      closeAddPhotosModal();
      
      // Refresh immediately to get the updated submission data
      console.log('Refreshing reports immediately after adding photos...');
      reportsData.refreshReports();
      
      // Also refresh after a delay to catch any async processing (but don't show loading)
      setTimeout(() => {
        console.log('Refreshing reports after delay to catch async processing...');
        // Use silent refresh to avoid showing loading screen again
        reportsData.silentRefreshReports();
      }, 3000); // 3 second delay to allow backend processing
      
    } catch (error) {
      console.error('Error adding photos to submission:', error);
      alert(`Failed to add photos: ${error.message}`);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  // Helper function to create clean filenames without double extensions
  const createCleanFilename = (baseName, prefix = 'processed') => {
    if (!baseName) baseName = 'image';
    
    // Remove any existing image extensions
    const nameWithoutExt = baseName.replace(/\.(jpg|jpeg|png|tiff)$/i, '');
    
    // Create clean filename with single extension
    return `${prefix}_${nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`;
  };

  // Download functionality
  const showDownloadOptions = () => {
    setShowDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
  };

  const downloadCurrentImage = async () => {
    if (!selectedReport?.images?.[currentResultIndex]) return;
    
    const currentImage = selectedReport.images[currentResultIndex];
    const imageId = currentImage.image_id;
    const filename = createCleanFilename(currentImage.input_name);
    
    console.log('Downloading current image via backend:', {
      imageId,
      filename,
      currentImage
    });
    
    try {
      // Use the backend endpoint to download the image
      console.log('Fetching image via backend API...');
      const blob = await downloadImage(imageId);
      
      console.log('Blob received from backend:', {
        size: blob.size,
        type: blob.type
      });
      
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty image blob received from backend');
      }
      
      // Create a blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      
      console.log('Download completed successfully');
      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error downloading image:', error);
      alert(`Failed to download image: ${error.message}`);
    }
  };

  const downloadAllImages = async () => {
    if (!selectedReport?.images || selectedReport.images.length === 0) {
      alert('No images to download');
      return;
    }
    
    setIsDownloading(true);
    console.log('Starting ZIP download process via backend...');
    
    try {
      // Use JSZip from global scope (loaded via script tag)
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded. Please refresh the page and try again.');
      }
      
      const zip = new window.JSZip();
      let successfulDownloads = 0;
      
      // Add each image to the zip using backend endpoint
      for (let i = 0; i < selectedReport.images.length; i++) {
        const image = selectedReport.images[i];
        const imageId = image.image_id;
        
        console.log(`Processing image ${i + 1}/${selectedReport.images.length}:`, {
          imageId,
          inputName: image.input_name,
          image
        });
        
        try {
          // Use the backend endpoint to download the image
          console.log(`Fetching image ${i + 1} via backend API...`);
          const blob = await downloadImage(imageId);
          
          console.log(`Blob received for image ${i + 1}:`, {
            size: blob.size,
            type: blob.type
          });
          
          if (!blob || blob.size === 0) {
            throw new Error('Invalid or empty image blob received from backend');
          }
          
          // Create a clean filename
          const cleanFilename = createCleanFilename(image.input_name, `processed_image_${i + 1}`);
          
          // Add to zip
          zip.file(cleanFilename, blob);
          successfulDownloads++;
          console.log(`Successfully added image ${i + 1} to ZIP: ${cleanFilename}`);
          
        } catch (imageError) {
          console.error(`Error processing image ${i + 1}:`, imageError);
          // Continue with other images instead of failing completely
          continue;
        }
      }
      
      console.log(`Successfully processed ${successfulDownloads}/${selectedReport.images.length} images`);
      
      // Check if any files were added to the zip
      const fileCount = Object.keys(zip.files).length;
      if (fileCount === 0) {
        throw new Error('No valid images could be added to the ZIP file. All images failed to download.');
      }
      
      console.log(`Generating ZIP file with ${fileCount} images...`);
      
      // Generate the zip file with compression
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      console.log('ZIP file generated:', {
        size: zipBlob.size,
        fileCount
      });
      
      if (zipBlob.size === 0) {
        throw new Error('Generated ZIP file is empty');
      }
      
      // Create download link
      const link = document.createElement('a');
      const zipUrl = URL.createObjectURL(zipBlob);
      link.href = zipUrl;
      link.download = `acacia_report_${selectedReport.id}_${new Date().toISOString().split('T')[0]}.zip`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(zipUrl);
      }, 1000);
      
      console.log('ZIP download completed successfully');
      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert(`Failed to create ZIP file: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isCheckingAuth || !auth.isLoggedIn || reportsData.isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner 
          isOpen={true}
          message={isCheckingAuth ? "Checking authentication..." : reportsData.isLoading ? "Loading reports..." : "Redirecting to login..."}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-16">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/acacia.jpg" 
          alt="Acacia forest background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/60"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <Header
          isLoggedIn={auth.isLoggedIn}
          onLoginClick={() => auth.setIsLoginModal(true)}
          onLogout={auth.handleLogout}
          onReportsClick={() => {}} // Already on reports page
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Update Notification */}
        {showUpdateNotification && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg border border-emerald-500/50 animate-pulse">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Submission Updated!</span>
              <span className="text-sm">This submission is now the most recent.</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex h-screen">
          {/* Sidebar - Search History */}
          <div className={`bg-slate-800/90 backdrop-blur-md border-r border-slate-700/50 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-80'
          }`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                {!isSidebarCollapsed && (
                  <h2 className="text-xl font-bold text-white">Search History</h2>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search History List */}
            <div className="overflow-y-auto h-full pb-20">
              {reportsData.error && (
                <div className="p-4 m-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <div className="text-red-400 text-sm">
                    <strong>Error:</strong> {reportsData.error}
                  </div>
                  <button
                    onClick={reportsData.refreshReports}
                    className="mt-2 text-red-300 hover:text-red-200 text-xs underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {reportsData.reports.length === 0 && !reportsData.isLoading && !reportsData.error ? (
                <div className="p-4 text-center text-slate-400">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No submissions yet</p>
                  <p className="text-xs text-slate-500 mt-1">Upload images to see your reports here</p>
                </div>
              ) : (
                reportsData.reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => handleReportSelect(report)}
                    className={`p-4 border-b border-slate-700/30 cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? 'bg-emerald-600/20 border-emerald-500/50'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    {!isSidebarCollapsed ? (
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-white font-medium text-sm">Acacia Detection</h3>
                          <span className="text-slate-400 text-xs">
                            {formatDate(report.date)} {formatTime(report.time)}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs mb-1">
                          {report.image_count} image{report.image_count !== 1 ? 's' : ''} processed
                        </p>
                        <p className="text-slate-400 text-xs">
                          {report.total_detected_areas} areas detected
                        </p>
                        <p className="text-slate-400 text-xs">
                          Avg confidence: {(report.average_confidence * 100).toFixed(1)}%
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            report.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                            report.status === 'processing' ? 'bg-yellow-600/20 text-yellow-400' :
                            report.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                            'bg-slate-600/20 text-slate-400'
                          }`}>
                            {report.status === 'completed' ? 'Completed' :
                             report.status === 'processing' ? 'Processing' :
                             report.status === 'failed' ? 'Failed' :
                             report.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddPhotosToSubmission(report);
                            }}
                            className="text-xs px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 rounded transition-colors"
                            title="Add more photos to this submission"
                          >
                            + Add Photos
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          report.status === 'completed' ? 'bg-green-600' :
                          report.status === 'processing' ? 'bg-yellow-600' :
                          report.status === 'failed' ? 'bg-red-600' :
                          'bg-slate-600'
                        }`}>
                          <span className="text-white text-xs font-bold">{report.id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Content Area - Report Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedReport ? (
              <div className="p-8">
                {/* Report Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-white">
                      Acacia Detection Report
                    </h1>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Home Page
                    </button>
                  </div>
                  <div className="flex items-center space-x-6 text-slate-300">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(selectedReport.date)} at {formatTime(selectedReport.time)}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {selectedReport.image_count} image{selectedReport.image_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Results Display - Same as Demo Component */}
                <div className="bg-slate-800/70 backdrop-blur-md rounded-lg p-8 border border-slate-600/50">
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-400">
                        Confidence: {selectedReport.images[currentResultIndex]?.status === 'failed' 
                          ? 'N/A' 
                          : `${(selectedReport.images[currentResultIndex]?.confidence * 100).toFixed(1)}%`
                        }
                      </div>
                      {selectedReport.images && selectedReport.images.length > 0 && (
                        <button 
                          onClick={showDownloadOptions}
                          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Results Display - Full Screen Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Input Image Thumbnail - Sidebar */}
                    <div className="xl:col-span-1">
                      <h4 className="text-lg font-semibold text-white mb-4">Input Image</h4>
                      <div 
                        className="relative cursor-pointer group mb-4"
                        onClick={() => setShowInputModal(true)}
                      >
                        <img
                          src={selectedReport.images[currentResultIndex]?.inputImage}
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
                        {selectedReport.images[currentResultIndex]?.input_name}
                      </p>
                      
                      {/* Analysis Details - Sidebar */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h5 className="text-md font-semibold text-white mb-3">Analysis Summary</h5>
                        <div className="space-y-3 text-sm">
                            <div>
                              <div className="text-slate-400">Processing Time</div>
                              <div className="text-white font-semibold">
                              {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                ? 'N/A' 
                                : `${selectedReport.images[currentResultIndex]?.processingTime || 0}s`
                              }
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Detected Areas</div>
                              <div className="text-white font-semibold">
                                {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                  ? 'N/A' 
                                  : selectedReport.images[currentResultIndex]?.detectedAreas || 0
                                }
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Confidence</div>
                              <div className={`font-semibold ${
                                selectedReport.images[currentResultIndex]?.status === 'failed' 
                                  ? 'text-red-400' 
                                  : 'text-emerald-400'
                              }`}>
                                {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                  ? 'N/A' 
                                  : `${(selectedReport.images[currentResultIndex]?.confidence * 100 || 0).toFixed(1)}%`
                                }
                              </div>
                            </div>
                          <div>
                            <div className="text-slate-400">Status</div>
                            <div className={`font-semibold ${
                              selectedReport.images[currentResultIndex]?.status === 'processed' ? 'text-green-400' :
                              selectedReport.images[currentResultIndex]?.status === 'processing' ? 'text-yellow-400' :
                              selectedReport.images[currentResultIndex]?.status === 'failed' ? 'text-red-400' :
                              'text-slate-400'
                            }`}>
                              {selectedReport.images[currentResultIndex]?.status === 'processed' ? 'Completed' :
                               selectedReport.images[currentResultIndex]?.status === 'processing' ? 'Processing' :
                               selectedReport.images[currentResultIndex]?.status === 'failed' ? 'ML Service Unavailable' :
                               'Unknown'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Species</div>
                            <div className="text-white font-semibold text-sm">
                              {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                ? 'N/A' 
                                : selectedReport.images[currentResultIndex]?.species?.join(', ') || 'None detected'
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
                          processedResults={selectedReport.images}
                          currentResultIndex={currentResultIndex}
                          onNavigateResult={handleNavigateResult}
                          onNavigateBySeven={handleNavigateBySeven}
                          onNavigateToIndex={handleNavigateToIndex}
                        />
                      </div>
                      
                      <div className="relative h-[70vh] overflow-hidden flex items-center justify-center">
                        <img
                          src={selectedReport.images[currentResultIndex]?.outputImage || selectedReport.images[currentResultIndex]?.inputImage}
                          alt="AI Analysis"
                          className="w-full h-full object-contain rounded-lg border border-slate-600 bg-slate-900/50"
                        />
                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
                          <div className="text-sm text-white">
                            <div className="font-semibold mb-1">
                              Detected Areas: {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                ? 'N/A' 
                                : selectedReport.images[currentResultIndex]?.detectedAreas || 0
                              }
                            </div>
                            <div className={`${
                              selectedReport.images[currentResultIndex]?.status === 'failed' 
                                ? 'text-red-400' 
                                : 'text-emerald-400'
                            }`}>
                              Confidence: {selectedReport.images[currentResultIndex]?.status === 'failed' 
                                ? 'N/A' 
                                : `${(selectedReport.images[currentResultIndex]?.confidence * 100 || 0).toFixed(1)}%`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">Select a report from the history to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={auth.showLoginModal}
        onClose={auth.closeLoginModal}
        isLoginMode={auth.isLoginMode}
        onToggleMode={auth.toggleLoginMode}
        loginForm={auth.loginForm}
        onFormChange={auth.handleLoginFormChange}
        onSubmit={auth.handleLoginSubmit}
        isLoading={auth.isLoading}
        error={auth.error}
      />

      <DownloadOptionsModal
        isOpen={showDownloadModal}
        onClose={closeDownloadModal}
        onDownloadCurrent={downloadCurrentImage}
        onDownloadAll={downloadAllImages}
        currentImageName={createCleanFilename(selectedReport?.images?.[currentResultIndex]?.input_name)}
        totalImagesCount={selectedReport?.images?.length || 0}
        isDownloading={isDownloading}
      />

      <ImageModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        imageSrc={selectedReport?.images?.[currentResultIndex]?.inputImage}
        imageName={selectedReport?.images?.[currentResultIndex]?.input_name}
      />

      <AddPhotosModal
        isOpen={showAddPhotosModal}
        onClose={closeAddPhotosModal}
        onSubmit={handleAddPhotosSubmit}
        isLoading={isUploadingPhotos}
        submissionInfo={selectedSubmissionForUpdate}
      />
    </div>
  );
};

export default Reports;
