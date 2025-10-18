import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import Header from '../components/layout/Header';
import Footer from '../components/sections/Footer';
import LoginModal from '../components/modals/LoginModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PhotoNavigation from '../components/ui/PhotoNavigation';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useReports } from '../hooks/useReports';

const Reports = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Custom hooks
  const auth = useAuth();
  const reports = useReports(auth.isLoggedIn);

  // Mock data for demonstration - in real app, this would come from API
  const [reportsHistory, setReportsHistory] = useState([
    {
      id: 1,
      date: '2024-01-15',
      time: '14:30',
      searchType: 'Acacia Detection',
      imageCount: 3,
      processedResults: [
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_001.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.945,
          detectedAreas: 12,
          processingTime: 2.3,
          species: ['Acacia dealbata', 'Acacia melanoxylon']
        },
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_002.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.923,
          detectedAreas: 8,
          processingTime: 1.8,
          species: ['Acacia dealbata']
        },
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_003.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.967,
          detectedAreas: 15,
          processingTime: 2.1,
          species: ['Acacia melanoxylon', 'Acacia mearnsii']
        }
      ]
    },
    {
      id: 2,
      date: '2024-01-14',
      time: '09:15',
      searchType: 'Forest Analysis',
      imageCount: 5,
      processedResults: [
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_004.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.872,
          detectedAreas: 6,
          processingTime: 1.9,
          species: ['Acacia longifolia']
        },
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_005.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.891,
          detectedAreas: 10,
          processingTime: 2.0,
          species: ['Acacia longifolia', 'Acacia dealbata']
        }
      ]
    },
    {
      id: 3,
      date: '2024-01-13',
      time: '16:45',
      searchType: 'Species Identification',
      imageCount: 2,
      processedResults: [
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_006.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.918,
          detectedAreas: 20,
          processingTime: 2.5,
          species: ['Acacia dealbata', 'Acacia mearnsii', 'Acacia melanoxylon']
        },
        {
          inputImage: '/api/placeholder/400/300',
          inputName: 'forest_007.jpg',
          outputImage: '/api/placeholder/600/400',
          confidence: 0.934,
          detectedAreas: 18,
          processingTime: 2.2,
          species: ['Acacia dealbata', 'Acacia mearnsii']
        }
      ]
    }
  ]);

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
    if (reportsHistory.length > 0 && !selectedReport) {
      setSelectedReport(reportsHistory[0]);
    }
  }, [reportsHistory, selectedReport]);

  const handleReportSelect = (report) => {
    setSelectedReport(report);
    setCurrentResultIndex(0); // Reset to first image when selecting new report
  };

  const handleNavigateResult = (direction) => {
    if (!selectedReport?.processedResults) return;
    
    if (direction === 'next' && currentResultIndex < selectedReport.processedResults.length - 1) {
      setCurrentResultIndex(currentResultIndex + 1);
    } else if (direction === 'prev' && currentResultIndex > 0) {
      setCurrentResultIndex(currentResultIndex - 1);
    }
  };

  const handleNavigateToIndex = (index) => {
    if (!selectedReport?.processedResults) return;
    if (index >= 0 && index < selectedReport.processedResults.length) {
      setCurrentResultIndex(index);
    }
  };

  const handleNavigateBySeven = (direction) => {
    if (!selectedReport?.processedResults) return;
    
    const totalResults = selectedReport.processedResults.length;
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

  if (isCheckingAuth || !auth.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner 
          isOpen={true}
          message={isCheckingAuth ? "Checking authentication..." : "Redirecting to login..."}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/acacia.jpg" 
          alt="Acacia forest background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/60"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <Header
          isLoggedIn={auth.isLoggedIn}
          onLoginClick={() => auth.setIsLoginModal(true)}
          onLogout={auth.handleLogout}
          onReportsClick={() => {}} // Already on reports page
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Main Content */}
        <div className="flex h-screen">
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
              {reportsHistory.map((report) => (
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
                        <h3 className="text-white font-medium text-sm">{report.searchType}</h3>
                        <span className="text-slate-400 text-xs">
                          {formatDate(report.date)} {formatTime(report.time)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mb-1">
                        {report.imageCount} image{report.imageCount !== 1 ? 's' : ''} processed
                      </p>
                      <p className="text-slate-400 text-xs">
                        {report.processedResults?.reduce((total, result) => total + result.detectedAreas, 0) || 0} areas detected
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{report.id}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                      {selectedReport.searchType}
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
                      {selectedReport.imageCount} image{selectedReport.imageCount !== 1 ? 's' : ''}
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
                        Confidence: {(selectedReport.processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%
                      </div>
                      <button className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Main Results Display - Full Screen Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Input Image Thumbnail - Sidebar */}
                    <div className="xl:col-span-1">
                      <h4 className="text-lg font-semibold text-white mb-4">Input Image</h4>
                      <div className="relative cursor-pointer group mb-4">
                        <img
                          src={selectedReport.processedResults[currentResultIndex]?.inputImage}
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
                        {selectedReport.processedResults[currentResultIndex]?.inputName}
                      </p>
                      
                      {/* Analysis Details - Sidebar */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h5 className="text-md font-semibold text-white mb-3">Analysis Summary</h5>
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="text-slate-400">Processing Time</div>
                            <div className="text-white font-semibold">{selectedReport.processedResults[currentResultIndex]?.processingTime}s</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Detected Areas</div>
                            <div className="text-white font-semibold">{selectedReport.processedResults[currentResultIndex]?.detectedAreas}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Confidence</div>
                            <div className="text-emerald-400 font-semibold">{(selectedReport.processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Status</div>
                            <div className="text-green-400 font-semibold">Completed</div>
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
                          processedResults={selectedReport.processedResults}
                          currentResultIndex={currentResultIndex}
                          onNavigateResult={handleNavigateResult}
                          onNavigateBySeven={handleNavigateBySeven}
                          onNavigateToIndex={handleNavigateToIndex}
                        />
                      </div>
                      
                      <div className="relative h-[70vh] overflow-hidden flex items-center justify-center">
                        <img
                          src={selectedReport.processedResults[currentResultIndex]?.outputImage}
                          alt="AI Analysis"
                          className="w-full h-full object-contain rounded-lg border border-slate-600 bg-slate-900/50"
                        />
                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
                          <div className="text-sm text-white">
                            <div className="font-semibold mb-1">Detected Areas: {selectedReport.processedResults[currentResultIndex]?.detectedAreas}</div>
                            <div className="text-emerald-400">Confidence: {(selectedReport.processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%</div>
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
    </div>
  );
};

export default Reports;
