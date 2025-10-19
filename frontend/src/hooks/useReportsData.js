import { useState, useEffect, useCallback } from 'react';
import { getUserReports, getPredictionResults, runPrediction } from '../services/api.js';

export const useReportsData = (isLoggedIn) => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!isLoggedIn) {
      setReports([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('fetchReports: Starting API call...');
      const response = await getUserReports();
      console.log('fetchReports: API response received:', response);
      if (response.success) {
        console.log('fetchReports: Setting reports data:', response.reports?.length || 0, 'reports');
        setReports(response.reports || []);
        setLastFetchTime(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const refreshReports = useCallback(() => {
    console.log('refreshReports called - fetching fresh data...');
    fetchReports();
  }, [fetchReports]);

  const silentRefreshReports = useCallback(async () => {
    console.log('silentRefreshReports called - fetching fresh data without loading screen...');
    if (!isLoggedIn) {
      setReports([]);
      return;
    }

    setError(null);

    try {
      console.log('silentRefreshReports: Starting API call...');
      const response = await getUserReports();
      console.log('silentRefreshReports: API response received:', response);
      if (response.success) {
        console.log('silentRefreshReports: Setting reports data:', response.reports?.length || 0, 'reports');
        setReports(response.reports || []);
        setLastFetchTime(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error in silent refresh:', err);
      setError(err.message);
      setReports([]);
    }
    // Note: We don't set isLoading here to avoid showing loading screen
  }, [isLoggedIn]);

  const processPendingImages = useCallback(async (report) => {
    if (!report || !report.images) return;

    const pendingImages = report.images.filter(img => img.status === 'uploaded');
    
    for (const image of pendingImages) {
      try {
        // Run prediction for this image
        await runPrediction(image.image_id);
        
        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch updated results
        const results = await getPredictionResults(image.image_id);
        if (results.success && results.status === 'processed') {
          // Update the image in our local state
          setReports(prevReports => 
            prevReports.map(r => 
              r.id === report.id 
                ? {
                    ...r,
                    images: r.images.map(img => 
                      img.image_id === image.image_id 
                        ? {
                            ...img,
                            status: 'processed',
                            confidence: results.results.average_confidence || 0,
                            detectedAreas: results.results.num_detections || 0,
                            processingTime: results.results.processing_time || 0,
                            outputImage: results.results_url || img.inputImage
                          }
                        : img
                    )
                  }
                : r
            )
          );
        }
      } catch (err) {
        console.error(`Error processing image ${image.image_id}:`, err);
        // Mark as failed
        setReports(prevReports => 
          prevReports.map(r => 
            r.id === report.id 
              ? {
                  ...r,
                  images: r.images.map(img => 
                    img.image_id === image.image_id 
                      ? { ...img, status: 'failed' }
                      : img
                  )
                }
              : r
          )
        );
      }
    }
  }, []);

  const addNewReport = useCallback((newImages) => {
    if (!newImages || newImages.length === 0) return;

    // Create a new report from the uploaded images
    const newReport = {
      id: Date.now(), // Temporary ID
      submission_id: newImages[0].image_id,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      image_count: newImages.length,
      total_detected_areas: 0,
      average_confidence: 0,
      status: 'processing',
      images: newImages.map(img => ({
        image_id: img.image_id,
        input_name: img.original_filename || 'unknown',
        inputImage: img.s3_url,
        outputImage: img.s3_url, // Will be updated when processed
        status: 'uploaded',
        confidence: 0,
        detectedAreas: 0,
        processingTime: 0,
        species: [],
        created_at: new Date().toISOString()
      }))
    };

    // Add to the beginning of the reports list
    setReports(prevReports => [newReport, ...prevReports]);

    // Start processing the images
    processPendingImages(newReport);
  }, [processPendingImages]);

  // Auto-refresh every 30 seconds if there are processing reports
  useEffect(() => {
    if (!isLoggedIn) return;

    const hasProcessingReports = reports.some(report => 
      report.images && report.images.some(img => img.status === 'uploaded' || img.status === 'processing')
    );

    if (hasProcessingReports) {
      const interval = setInterval(() => {
        fetchReports();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, reports, fetchReports]);

  // Initial fetch when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchReports();
    } else {
      setReports([]);
      setError(null);
    }
  }, [isLoggedIn, fetchReports]);

  return {
    reports,
    isLoading,
    error,
    lastFetchTime,
    fetchReports,
    refreshReports,
    silentRefreshReports,
    addNewReport,
    processPendingImages
  };
};
