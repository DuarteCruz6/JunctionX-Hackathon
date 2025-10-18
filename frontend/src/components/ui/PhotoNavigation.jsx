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

  // Calculate the range of indices to show
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
    
    // For more than 7 images, always show 7 squares representing positions 1-7
    // The actual image index is calculated based on the current "page"
    const currentPage = Math.floor(current / 7); // Which group of 7 we're in
    const positionInPage = current % 7; // Position within the current group (0-6)
    
    for (let i = 0; i < 7; i++) {
      const actualImageIndex = currentPage * 7 + i;
      
      // Only show if the actual image exists
      if (actualImageIndex < totalResults) {
        indices.push({
          index: actualImageIndex,
          displayIndex: i, // Always show as position 0-6
          isCurrent: i === positionInPage
        });
      }
    }
    
    return indices;
  };

  const visibleIndices = getVisibleIndices();

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* Left Arrow - navigate within current page or to previous page */}
      <button
        onClick={() => {
          if (currentResultIndex > 0) {
            if (totalResults > 7) {
              // Navigate to the first image of the previous page
              const currentPage = Math.floor(currentResultIndex / 7);
              const previousPage = Math.max(0, currentPage - 1);
              const firstIndexOfPreviousPage = previousPage * 7;
              onNavigateToIndex(firstIndexOfPreviousPage);
            } else {
              onNavigateResult('prev');
            }
          }
        }}
        disabled={currentResultIndex <= 0}
        className={`p-2 rounded-lg transition-colors ${
          currentResultIndex > 0 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
        title={totalResults > 7 ? "Previous page (7 images)" : "Previous image"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

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
                alt={`${item.index + 1}`}
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

      {/* Right Arrow - navigate within current page or to next page */}
      <button
        onClick={() => {
          if (currentResultIndex < totalResults - 1) {
            if (totalResults > 7) {
              // Navigate to the first image of the next page
              const currentPage = Math.floor(currentResultIndex / 7);
              const nextPage = currentPage + 1;
              const firstIndexOfNextPage = nextPage * 7;
              // Make sure we don't go beyond the total results
              const targetIndex = Math.min(totalResults - 1, firstIndexOfNextPage);
              onNavigateToIndex(targetIndex);
            } else {
              onNavigateResult('next');
            }
          }
        }}
        disabled={currentResultIndex >= totalResults - 1}
        className={`p-2 rounded-lg transition-colors ${
          currentResultIndex < totalResults - 1 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
        title={totalResults > 7 ? "Next page (7 images)" : "Next image"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

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
