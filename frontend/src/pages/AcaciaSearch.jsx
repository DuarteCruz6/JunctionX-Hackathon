import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import Header from '../components/layout/Header';
import Demo from '../components/sections/Demo';
import Footer from '../components/sections/Footer';
import LoginModal from '../components/modals/LoginModal';
import ReportsModal from '../components/modals/ReportsModal';
import ImageModal from '../components/modals/ImageModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useReports } from '../hooks/useReports';

const AcaciaSearch = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom hooks
  const auth = useAuth();
  const imageProcessing = useImageProcessing();
  const reports = useReports(auth.isLoggedIn);

  // Navigation handlers
  const handleReportsClick = () => {
    const result = reports.handleReportsClick();
    if (result === true) {
      auth.setIsLoginModal(true);
    }
  };

  const handleLoginFromReports = () => {
    const result = reports.handleLoginFromReports();
    if (result === true) {
      auth.setIsLoginModal(true);
    }
  };

  const handleCreateAccountFromReports = () => {
    const result = reports.handleCreateAccountFromReports();
    if (result.openLogin) {
      auth.setIsLoginModal(true);
      if (result.isSignup) {
        auth.toggleLoginMode();
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900 pt-16">
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
          onReportsClick={handleReportsClick}
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Hero Section for Demo Page */}
        <section className="relative overflow-hidden py-8">
          {/* Background Image for Title Section */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/acacias.jpg" 
              alt="Acacias background" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center text-emerald-400 hover:text-emerald-300 mb-8 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home Page
              </button>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mt-4 mb-8 drop-shadow-2xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-lg">
                  Acacia Search
                </span>
              </h1>
              <p className="text-xl text-slate-200 mb-8 max-w-3xl mx-auto drop-shadow-lg">
                Advanced AI-powered search engine for Acacia species identification, 
                management protocols, and forest conservation data.
              </p>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <Demo
          selectedImages={imageProcessing.selectedImages}
          processedResults={imageProcessing.processedResults}
          currentResultIndex={imageProcessing.currentResultIndex}
          showInputModal={imageProcessing.showInputModal}
          isEditingNumber={imageProcessing.isEditingNumber}
          editNumber={imageProcessing.editNumber}
          onFileChange={imageProcessing.handleFileChange}
          onAddMoreFiles={imageProcessing.handleAddMoreFiles}
          onProcessImages={imageProcessing.handleProcessImages}
          onClearAll={imageProcessing.handleClearAll}
          onNavigateResult={imageProcessing.navigateResult}
          onNavigateBySeven={imageProcessing.navigateBySeven}
          onNavigateToIndex={imageProcessing.navigateToIndex}
          onEditNumber={imageProcessing.handleEditNumber}
          onSaveNumber={imageProcessing.handleSaveNumber}
          onEditInputChange={imageProcessing.handleEditInputChange}
          onEditKeyPress={imageProcessing.handleEditKeyPress}
          onDownloadImage={imageProcessing.downloadImage}
          onShowInputModal={() => imageProcessing.setShowInputModal(true)}
          onRemoveImage={imageProcessing.removeImage}
          isLoading={imageProcessing.isLoading}
          isUploading={imageProcessing.isUploading}
          uploadError={imageProcessing.uploadError}
        />

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
      />

      <ReportsModal
        isOpen={reports.showReportsModal}
        onClose={reports.closeReportsModal}
        onLoginClick={handleLoginFromReports}
        onCreateAccount={handleCreateAccountFromReports}
      />

      <ImageModal
        isOpen={imageProcessing.showInputModal}
        onClose={() => imageProcessing.setShowInputModal(false)}
        imageSrc={imageProcessing.processedResults[imageProcessing.currentResultIndex]?.inputImage}
        imageName={imageProcessing.processedResults[imageProcessing.currentResultIndex]?.inputName}
      />

      {/* Processing Loading Spinner */}
      <LoadingSpinner 
        isOpen={imageProcessing.isLoading}
        message="Processing forest images with AI..."
      />

      {/* Upload Loading Spinner */}
      <LoadingSpinner 
        isOpen={imageProcessing.isUploading}
        message="Uploading images to our server..."
      />
    </div>
  );
};

export default AcaciaSearch;
