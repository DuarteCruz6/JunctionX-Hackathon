import React from 'react';

const Header = ({ 
  isLoggedIn, 
  onLoginClick, 
  onLogout, 
  onReportsClick, 
  isMenuOpen, 
  onMenuToggle 
}) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">
                <span className="text-emerald-400"></span> Chega dAcacias
              </h1>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Services</a>
              <a href="#demo" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Demo</a>
              <button 
                onClick={onReportsClick}
                className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reports
              </button>
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <span className="text-slate-300 text-sm">Welcome back!</span>
                  <button 
                    onClick={onLogout}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onLoginClick}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={onMenuToggle}
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
  );
};

export default Header;
