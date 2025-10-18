import React from 'react';

const Hero = ({ onDemoClick, onReportsClick }) => {
  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      {/* Video Background for Hero Section */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover scale-125 transition-all duration-1000 ease-in-out"
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
              onClick={onDemoClick}
              className="bg-emerald-600/90 hover:bg-emerald-700/90 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-xl"
            >
              Acacia Search
            </button>
            <button 
              onClick={onReportsClick}
              className="border-2 border-white/30 hover:border-white/50 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-xl"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
