import React, { useState, useEffect, useRef } from 'react';

const SubmissionTimelineSlider = ({ 
  reports, 
  onSubmissionSelect,
  selectedReportId 
}) => {
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
  const [timelineData, setTimelineData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  // Create timeline data from all reports
  useEffect(() => {
    if (!reports || reports.length === 0) {
      setTimelineData([]);
      return;
    }

    // Flatten all images from all reports into a timeline
    const timeline = [];
    reports.forEach(report => {
      if (report.images && report.images.length > 0) {
        report.images.forEach((image, imageIndex) => {
          // Use individual image timestamp if available, otherwise fall back to report timestamp
          const imageDate = image.created_at ? new Date(image.created_at).toISOString().split('T')[0] : report.date;
          const imageTime = image.created_at ? new Date(image.created_at).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : report.time;
          
          timeline.push({
            ...image,
            reportId: report.id,
            submissionId: report.submission_id,
            reportDate: imageDate,
            reportTime: imageTime,
            imageIndex: imageIndex,
            totalImagesInReport: report.images.length,
            reportTitle: `Submission ${report.id}`
          });
        });
      }
    });

    // Sort by creation date (oldest first, newest last - left to right)
    timeline.sort((a, b) => new Date(a.created_at || a.reportDate) - new Date(b.created_at || b.reportDate));
    
    setTimelineData(timeline);
    
    // Reset to first item when timeline changes
    setCurrentTimelineIndex(0);
  }, [reports]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      // Remove any lingering event listeners
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  const handleTimelineNavigation = (direction) => {
    if (direction === 'next' && currentTimelineIndex < timelineData.length - 1) {
      setCurrentTimelineIndex(currentTimelineIndex + 1);
    } else if (direction === 'prev' && currentTimelineIndex > 0) {
      setCurrentTimelineIndex(currentTimelineIndex - 1);
    }
  };


  // Range slider handlers
  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value);
    setCurrentTimelineIndex(value);
  };

  const handleSliderMouseDown = (event) => {
    event.preventDefault();
    setIsDragging(true);
    
    // Add global mouse event listeners
    const handleMouseMove = (e) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const sliderWidth = rect.width;
      const percentage = Math.max(0, Math.min(1, clickX / sliderWidth));
      const newIndex = Math.round(percentage * (timelineData.length - 1));
      
      if (newIndex >= 0 && newIndex < timelineData.length) {
        setCurrentTimelineIndex(newIndex);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSliderClick = (event) => {
    if (isDragging) return; // Prevent click when dragging
    
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const sliderWidth = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / sliderWidth));
    const newIndex = Math.round(percentage * (timelineData.length - 1));
    
    if (newIndex >= 0 && newIndex < timelineData.length) {
      setCurrentTimelineIndex(newIndex);
    }
  };

  const handleSubmissionClick = (reportId) => {
    if (onSubmissionSelect) {
      onSubmissionSelect(reportId);
    }
  };

  if (timelineData.length === 0) {
    return (
      <div className="bg-slate-800/70 backdrop-blur-md rounded-lg p-8 border border-slate-600/50">
        <div className="text-center text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No photos available</p>
          <p className="text-sm">Upload some images to see your progression timeline</p>
        </div>
      </div>
    );
  }

  const currentItem = timelineData[currentTimelineIndex];
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

  return (
    <div className="bg-slate-800/70 backdrop-blur-md rounded-lg p-6 border border-slate-600/50">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Photo Progression Timeline</h3>
          <p className="text-sm text-slate-400">
            Navigate through all your photos chronologically
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {currentTimelineIndex + 1} of {timelineData.length} photos
        </div>
      </div>

      {/* Range Slider */}
      <div className="flex items-center space-x-4">
        {/* Previous Button */}
        <button
          onClick={() => handleTimelineNavigation('prev')}
          disabled={currentTimelineIndex <= 0}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentTimelineIndex > 0 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Previous photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Range Slider */}
        <div className="flex-1 relative">
          <div className="relative h-8 flex items-center">
            {/* Slider Track */}
            <div 
              ref={sliderRef}
              className="w-full h-2 bg-slate-600 rounded-full cursor-pointer relative"
              onClick={handleSliderClick}
            >
              {/* Progress Fill */}
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ 
                  width: timelineData.length > 0 
                    ? `${(currentTimelineIndex / (timelineData.length - 1)) * 100}%` 
                    : '0%' 
                }}
              ></div>
              
              {/* Slider Thumb */}
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-lg cursor-grab select-none ${
                  isDragging ? 'scale-110 shadow-xl cursor-grabbing' : 'hover:scale-105'
                }`}
                style={{ 
                  left: timelineData.length > 0 
                    ? `calc(${(currentTimelineIndex / (timelineData.length - 1)) * 100}% - 12px)` 
                    : '-12px',
                  transition: isDragging ? 'none' : 'all 0.15s ease-out'
                }}
                onMouseDown={handleSliderMouseDown}
              >
                {/* Hidden input for accessibility */}
                <input
                  type="range"
                  min="0"
                  max={timelineData.length - 1}
                  value={currentTimelineIndex}
                  onChange={handleSliderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          </div>
          
          {/* Timeline Labels */}
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{timelineData.length > 0 ? formatDate(timelineData[0].reportDate) : ''} (Oldest)</span>
            <span>{timelineData.length > 0 ? formatDate(timelineData[timelineData.length - 1].reportDate) : ''} (Newest)</span>
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={() => handleTimelineNavigation('next')}
          disabled={currentTimelineIndex >= timelineData.length - 1}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentTimelineIndex < timelineData.length - 1 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Next photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Current Selected Image Display */}
      <div className="mt-6">
        <div className="text-center mb-4">
          <h4 className="text-lg font-semibold text-white mb-2">Current Selected Image</h4>
          <p className="text-sm text-slate-400">
            {formatDate(currentItem.reportDate)} at {formatTime(currentItem.reportTime)}
          </p>
        </div>
        
        {/* Image Display */}
        <div className="relative h-96 overflow-hidden rounded-lg border border-slate-600 bg-slate-900/50 mb-4">
          <img
            src={currentItem.outputImage || currentItem.inputImage}
            alt={currentItem.input_name}
            className="w-full h-full object-contain"
          />
          
          {/* Image Info Overlay */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="text-sm text-white">
              <div className="font-semibold mb-1">{currentItem.input_name}</div>
              <div className="text-slate-300">
                {currentItem.status === 'failed' ? (
                  <span className="text-red-400">Processing Failed</span>
                ) : (
                  <>
                    <div>Detected Areas: {currentItem.detectedAreas || 0}</div>
                    <div className="text-emerald-400">
                      Confidence: {((currentItem.confidence || 0) * 100).toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submission Info Overlay */}
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
            <div className="text-sm text-white">
              <div className="font-semibold">{currentItem.reportTitle}</div>
              <div className="text-slate-300">
                Image {currentItem.imageIndex + 1} of {currentItem.totalImagesInReport}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <h5 className="text-md font-semibold text-white mb-3">Analysis Summary</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Status</div>
              <div className={`font-semibold ${
                currentItem.status === 'processed' ? 'text-green-400' :
                currentItem.status === 'processing' ? 'text-yellow-400' :
                currentItem.status === 'failed' ? 'text-red-400' :
                'text-slate-400'
              }`}>
                {currentItem.status === 'processed' ? 'Completed' :
                 currentItem.status === 'processing' ? 'Processing' :
                 currentItem.status === 'failed' ? 'Failed' :
                 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Processing Time</div>
              <div className="text-white font-semibold">
                {currentItem.status === 'failed' ? 'N/A' : `${currentItem.processingTime || 0}s`}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Detected Areas</div>
              <div className="text-white font-semibold">
                {currentItem.status === 'failed' ? 'N/A' : currentItem.detectedAreas || 0}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Confidence</div>
              <div className={`font-semibold ${
                currentItem.status === 'failed' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {currentItem.status === 'failed' ? 'N/A' : `${((currentItem.confidence || 0) * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={() => handleSubmissionClick(currentItem.reportId)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
          >
            View Full Submission Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionTimelineSlider;
