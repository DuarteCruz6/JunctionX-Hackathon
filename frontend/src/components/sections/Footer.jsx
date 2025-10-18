import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                  <span className="text-emerald-400"></span> Chega dAcacias
                </h3>
            <p className="text-slate-400 text-sm">National Forest Protection Agency</p>
          </div>
          <p className="text-slate-400 text-sm">&copy; 2025 Government of Portugal. All rights reserved.</p>
          <p className="text-slate-500 text-xs mt-2">Built for JunctionX Hackathon • Environmental Protection Initiative</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
