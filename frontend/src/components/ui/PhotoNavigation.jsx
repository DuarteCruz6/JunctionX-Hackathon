import React from 'react';

const PhotoNavigation = ({
  processedResults,
  currentResultIndex,
  onNavigateResult,
  onNavigateBySeven,
  onNavigateToIndex
}) => {
  const totalResults = processedResults.length;
  
  if (totalResults === 0) return null;

  // Calculate the range of indices to show (3 before, current, 3 after)
  const getVisibleIndices = () => {
    const indices = [];
    const current = currentResultIndex;
    
    // If we have 7 or fewer images, show all images without duplicates
    if (totalResults <= 7) {
      for (let i = 0; i < totalResults; i++) {
        indices.push({
          index: i,
          displayIndex: i,
          isCurrent: i === current
        });
      }
      return indices;
    }
    
    // For more than 7 images, show 7 squares with proper spacing
    // Calculate the start index to center the current image
    let startIndex = Math.max(0, current - 3);
    let endIndex = Math.min(totalResults - 1, current + 3);
    
    // Adjust if we're near the beginning
    if (current < 3) {
      endIndex = Math.min(totalResults - 1, 6);
    }
    
    // Adjust if we're near the end
    if (current > totalResults - 4) {
      startIndex = Math.max(0, totalResults - 7);
    }
    
    for (let i = startIndex; i <= endIndex; i++) {
      indices.push({
        index: i,
        displayIndex: i,
        isCurrent: i === current
      });
    }
    
    return indices;
  };

  const visibleIndices = getVisibleIndices();

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* Left Arrow - only show if more than 7 images and not at first image */}
      {totalResults > 7 && currentResultIndex > 0 && (
        <button
          onClick={() => onNavigateBySeven('prev')}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          title="Previous 7 images"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 7 Navigation Squares */}
      <div className={`flex items-center ${totalResults <= 3 ? 'space-x-2' : 'space-x-1.5'}`}>
        {visibleIndices.map((item, squareIndex) => (
          <button
            key={squareIndex}
            onClick={() => onNavigateToIndex(item.index)}
            className={`relative rounded-lg border-2 transition-all duration-200 ${
              totalResults <= 3 ? 'w-16 h-16' : 'w-12 h-12'
            } ${
              item.isCurrent
                ? 'border-emerald-500 bg-emerald-500/20 scale-110'
                : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
            }`}
            title={`Go to image ${item.index + 1}`}
          >
            {processedResults[item.index]?.inputImage ? (
              <img
                src={processedResults[item.index].inputImage}
                alt={`Image ${item.index + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              <div className="w-full h-full bg-slate-600 rounded-md flex items-center justify-center">
                <span className="text-xs text-slate-400">?</span>
              </div>
            )}
            {/* Current indicator */}
            {item.isCurrent && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
            )}
          </button>
        ))}
      </div>

      {/* Right Arrow - only show if more than 7 images and not at last image */}
      {totalResults > 7 && currentResultIndex < totalResults - 1 && (
        <button
          onClick={() => onNavigateBySeven('next')}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          title="Next 7 images"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Current Index Display */}
      <div className="ml-4 px-3 py-2 bg-slate-700 rounded-lg">
        <span className="text-sm text-slate-300">
          {currentResultIndex + 1} of {totalResults}
        </span>
      </div>
    </div>
  );
};

export default PhotoNavigation;
