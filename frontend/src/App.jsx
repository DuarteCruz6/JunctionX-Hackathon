import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

// Components
import Header from './components/layout/Header';
import Hero from './components/sections/Hero';
import Features from './components/sections/Features';
import Footer from './components/sections/Footer';
import LoginModal from './components/modals/LoginModal';
import ReportsModal from './components/modals/ReportsModal';
import AcaciaSearch from './pages/AcaciaSearch';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useReports } from './hooks/useReports';

// Home component for the main page
const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom hooks
  const auth = useAuth();
  const reports = useReports(auth.isLoggedIn);

  // Navigation handlers
  const handleDemoClick = () => {
    window.location.href = '/public-demo';
  };

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

        {/* Hero Section */}
        <Hero
          onDemoClick={handleDemoClick}
          onReportsClick={handleReportsClick}
        />

        {/* Features Section */}
        <Features />

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

      <ReportsModal
        isOpen={reports.showReportsModal}
        onClose={reports.closeReportsModal}
        onLoginClick={handleLoginFromReports}
        onCreateAccount={handleCreateAccountFromReports}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/public-demo" element={<AcaciaSearch />} />
      </Routes>
    </Router>
  );
}

export default App;