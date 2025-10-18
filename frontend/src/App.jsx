import React, { useState, useEffect } from 'react';
import './index.css';
import { uploadImages } from './services/api';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showInputModal, setShowInputModal] = useState(false);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [lastAuthEvent, setLastAuthEvent] = useState(null);
  const [lastAuthError, setLastAuthError] = useState(null);

  useEffect(() => {
    console.debug('Setting up onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.debug('onAuthStateChanged user:', user);
      setIsLoggedIn(!!user);
      setLastAuthEvent({ type: 'stateChanged', user });
      setLastAuthError(null);
    }, (err) => {
      console.error('onAuthStateChanged error', err);
      setLastAuthError(err);
    });
    return () => unsubscribe();
  }, []);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Create preview URLs for all images, but only show first 12 in grid
    const imagePreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setSelectedImages(imagePreviews);
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleAddMoreFiles = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Create preview URLs for new images
    const newImagePreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    // Add new images to existing ones
    setSelectedImages(prev => [...prev, ...newImagePreviews]);
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleProcessImages = () => {
    // Upload files to backend for processing
    const files = selectedImages.map(img => img.file);
    if (files.length === 0) return;

    uploadImages(files)
      .then(data => {
        // Backend returns an array of uploaded image metadata with s3_url and image_id
        const results = (data.results || []).map((item, index) => ({
          id: item.image_id || index,
          inputImage: selectedImages[index]?.preview,
          inputName: item.filename || selectedImages[index]?.name || `image_${index}`,
          outputImage: selectedImages[index]?.preview,
          outputName: item.filename ? `processed_${item.filename}` : `processed_image_${index}`,
          confidence: Math.random() * 0.3 + 0.7,
          detectedAreas: Math.floor(Math.random() * 5) + 1,
          processingTime: Math.floor(Math.random() * 3) + 1
        }));

        setProcessedResults(results);
        setCurrentResultIndex(0);
      })
      .catch(err => {
        console.error('Upload failed', err);
        alert('Upload failed: ' + (err?.response?.data?.detail || err.message));
      });
  };

  const navigateResult = (direction) => {
    if (direction === 'prev') {
      setCurrentResultIndex(prev => prev > 0 ? prev - 1 : processedResults.length - 1);
    } else {
      setCurrentResultIndex(prev => prev < processedResults.length - 1 ? prev + 1 : 0);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditNumber = () => {
    setIsEditingNumber(true);
    setEditNumber((currentResultIndex + 1).toString());
  };

  const handleSaveNumber = () => {
    const imageNumber = parseInt(editNumber);
    if (imageNumber >= 1 && imageNumber <= processedResults.length) {
      setCurrentResultIndex(imageNumber - 1); // Convert to 0-based index
    }
    setIsEditingNumber(false);
    setEditNumber('');
  };

  const handleEditInputChange = (event) => {
    const value = event.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setEditNumber(value);
    }
  };

  const handleEditKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSaveNumber();
    } else if (event.key === 'Escape') {
      setIsEditingNumber(false);
      setEditNumber('');
    }
  };

  const handleLoginFormChange = (event) => {
    const { name, value } = event.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    try {
      const { email, password } = loginForm;
      // Use initialized Firebase Auth instance for login/signup
  console.debug('Attempting auth', { isLoginMode, email });
  setLastAuthEvent({ type: 'attempt', email, mode: isLoginMode ? 'signin' : 'signup' });
  setLastAuthError(null);
      let result;
      if (isLoginMode) {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== loginForm.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        result = await createUserWithEmailAndPassword(auth, email, password);
      }

  console.debug('Auth result', result);
  setLastAuthEvent({ type: 'result', result });
      // Only mark logged in if Firebase returned a user object
      if (result && result.user) {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '', confirmPassword: '' });
      } else {
        console.warn('Auth did not return a user object', result);
        alert('Authentication did not return a valid user. Check console for details.');
      }
    } catch (err) {
      console.error('Auth error', err);
      setLastAuthError(err);
      const msg = err?.message || err?.code || String(err);
      alert('Authentication failed: ' + msg);
    }
  };

  const toggleLoginMode = () => {
    setIsLoginMode(!isLoginMode);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
    setIsLoginMode(true);
  };

  const handleReportsClick = () => {
    if (isLoggedIn) {
      // User is logged in, show reports (for now just scroll to reports section)
      document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // User is not logged in, show login prompt modal
      setShowReportsModal(true);
    }
  };

  const handleLoginFromReports = () => {
    setShowReportsModal(false);
    setShowLoginModal(true);
  };

  const closeReportsModal = () => {
    setShowReportsModal(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleClearAll = () => {
    // Clear all selected images and revoke their URLs
    selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    setSelectedImages([]);
    setProcessedResults([]);
    setCurrentResultIndex(0);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900">
      {/* Debug panel (visible during development) */}
      <div style={{position: 'fixed', right: 12, top: 12, zIndex: 9999}}>
        <div className="bg-black/70 text-white p-3 rounded-lg text-sm max-w-xs">
          <div className="font-semibold mb-1">Auth Debug</div>
          <div>isLoggedIn: {String(isLoggedIn)}</div>
          <div>lastEvent: {lastAuthEvent ? JSON.stringify(lastAuthEvent) : 'none'}</div>
          <div>lastError: {lastAuthError ? (lastAuthError.message || JSON.stringify(lastAuthError)) : 'none'}</div>
        </div>
      </div>
      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="relative z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">
                  <span className="text-emerald-400"></span> ForestGuard
                </h1>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#features" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Services</a>
                <a href="#demo" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Demo</a>
                <button 
                  onClick={handleReportsClick}
                  className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Reports
                </button>
                {isLoggedIn ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-300 text-sm">Welcome back!</span>
                    <button 
                      onClick={handleLogout}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-300 hover:text-white p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-screen flex items-center">
          {/* Video Background for Hero Section */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/demo_forest.mp4" type="video/mp4" />
            </video>
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-slate-900/30"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/20 to-slate-900/40"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full relative z-10">
            <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
              National
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-lg">
                Forest Protection
              </span>
            </h1>
            <p className="text-xl text-slate-200 mb-8 max-w-3xl mx-auto drop-shadow-lg">
              Advanced AI-powered monitoring system for invasive species detection and forest conservation. 
              Protecting our natural heritage through cutting-edge technology and scientific research.
            </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-emerald-600/90 hover:bg-emerald-700/90 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-xl"
                >
                  Public Demo
                </button>
                <button 
                  onClick={handleReportsClick}
                  className="border-2 border-white/30 hover:border-white/50 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-xl"
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Government AI Services</h2>
            <p className="text-xl text-slate-300">Advanced monitoring capabilities for environmental protection and conservation</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/70 backdrop-blur-md rounded-xl p-8 border border-slate-600/50 hover:border-emerald-500/70 transition-all shadow-xl">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Real-time Monitoring</h3>
              <p className="text-slate-300">Continuous surveillance and instant identification of invasive species using advanced AI models</p>
            </div>
            
            <div className="bg-slate-800/70 backdrop-blur-md rounded-xl p-8 border border-slate-600/50 hover:border-emerald-500/70 transition-all shadow-xl">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Satellite Surveillance</h3>
              <p className="text-slate-300">Government satellite network integration for comprehensive forest monitoring and threat assessment</p>
            </div>
            
            <div className="bg-slate-800/70 backdrop-blur-md rounded-xl p-8 border border-slate-600/50 hover:border-emerald-500/70 transition-all shadow-xl">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Scientific Accuracy</h3>
              <p className="text-slate-300">Government-validated 95%+ accuracy in species identification with detailed scientific reporting</p>
            </div>
          </div>
        </div>
      </section>

        {/* Demo Section */}
        <section id="demo" className="py-20 bg-slate-900/60 backdrop-blur-sm">
        <div className="w-full">
          <div className="text-center mb-16 px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-4">Public Demonstration</h2>
            <p className="text-xl text-slate-300">Experience our government AI system for forest monitoring and invasive species detection</p>
          </div>
          
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
                          onClick={handleClearAll}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105"
                        >
                          Clear All
                        </button>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id="add-more-files"
                            onChange={handleAddMoreFiles}
                          />
                          <label
                            htmlFor="add-more-files"
                            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
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
                              onClick={() => {
                                URL.revokeObjectURL(image.preview);
                                setSelectedImages(prev => prev.filter((_, i) => i !== index));
                              }}
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
                    <div className="text-center">
                      <button 
                        onClick={handleProcessImages}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105"
                      >
                        Process All Images
                      </button>
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
                    <p className="text-lg text-slate-300 mb-6">
                      Submit multiple satellite images or drone footage for batch government AI analysis
                    </p>
                    <p className="text-sm text-slate-400 mb-8">
                      Supports JPG, PNG, TIFF formats up to 50MB each • Batch processing available • All data processed securely
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 cursor-pointer"
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
              <h3 className="text-2xl font-semibold text-white mb-6">Government AI Analysis Results</h3>
              
              {processedResults.length > 0 ? (
                <div className="space-y-8 h-full">
                  {/* Navigation Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigateResult('prev')}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-300"></span>
                        {isEditingNumber ? (
                          <input
                            type="text"
                            value={editNumber}
                            onChange={handleEditInputChange}
                            onKeyPress={handleEditKeyPress}
                            onBlur={handleSaveNumber}
                            className="w-8 px-1 py-1 bg-slate-700 border border-emerald-500 rounded text-white text-sm text-center focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={handleEditNumber}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition-colors cursor-pointer"
                          >
                            {currentResultIndex + 1}
                          </button>
                        )}
                        <span className="text-slate-300"> of {processedResults.length}</span>
                      </div>
                      
                      <button
                        onClick={() => navigateResult('next')}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-400">
                        Confidence: {(processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%
                      </div>
                      <button
                        onClick={() => downloadImage(
                          processedResults[currentResultIndex]?.outputImage,
                          processedResults[currentResultIndex]?.outputName
                        )}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Main Results Display - Full Screen Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 h-full">
                    {/* Input Image Thumbnail - Sidebar */}
                    <div className="xl:col-span-1">
                      <h4 className="text-lg font-semibold text-white mb-4">Input Image</h4>
                      <div 
                        className="relative cursor-pointer group mb-4"
                        onClick={() => setShowInputModal(true)}
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
                            <div className="text-white font-semibold">{processedResults[currentResultIndex]?.processingTime}s</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Detected Areas</div>
                            <div className="text-white font-semibold">{processedResults[currentResultIndex]?.detectedAreas}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Confidence</div>
                            <div className="text-emerald-400 font-semibold">{(processedResults[currentResultIndex]?.confidence * 100).toFixed(1)}%</div>
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
                      <div className="relative h-full min-h-[60vh] max-h-[70vh] overflow-hidden">
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
                        
                        {/* Download Button Overlay */}
                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={() => downloadImage(
                              processedResults[currentResultIndex]?.outputImage,
                              processedResults[currentResultIndex]?.outputName
                            )}
                            className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Result
                          </button>
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
                  <p className="text-lg">Submit images to receive comprehensive government AI analysis results</p>
                  <p className="text-sm mt-2">Batch processing • Scientific reports • Threat assessments • Conservation recommendations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

        {/* Footer */}
        <footer className="bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                  <span className="text-emerald-400"></span> ForestGuard
                </h3>
                <p className="text-slate-400 text-sm">National Forest Protection Agency</p>
              </div>
              <p className="text-slate-400 text-sm">&copy; 2025 Government of Portugal. All rights reserved.</p>
              <p className="text-slate-500 text-xs mt-2">Built for JunctionX Hackathon • Environmental Protection Initiative</p>
            </div>
          </div>
      </footer>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full mx-4 bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={closeLoginModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </h2>
                <p className="text-slate-400">
                  {isLoginMode 
                    ? 'Access your ForestGuard account' 
                    : 'Join ForestGuard to protect our forests'
                  }
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginFormChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginFormChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                {!isLoginMode && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={loginForm.confirmPassword}
                      onChange={handleLoginFormChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Confirm your password"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                >
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-slate-400">
                  {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={toggleLoginMode}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    {isLoginMode ? 'Create Account' : 'Sign In'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Access Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full mx-4 bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={closeReportsModal}
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
                  onClick={handleLoginFromReports}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                >
                  Sign In to Access Reports
                </button>
                
                <button
                  onClick={closeReportsModal}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-6 text-sm text-slate-400">
                <p>Don't have an account? 
                  <button
                    onClick={() => {
                      setShowReportsModal(false);
                      setIsLoginMode(false);
                      setShowLoginModal(true);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors ml-1"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Image Modal */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowInputModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={processedResults[currentResultIndex]?.inputImage}
              alt="Input Image Full Size"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white text-sm">{processedResults[currentResultIndex]?.inputName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;