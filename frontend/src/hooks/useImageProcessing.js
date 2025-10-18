import { useState } from 'react';
import { uploadImages, getPredictionResults, analyzeImageAnonymous } from '../services/api.js';

export const useImageProcessing = (onImagesUploaded, isLoggedIn = false) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showInputModal, setShowInputModal] = useState(false);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    // Filter valid image files
    const validFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= maxSize;
      
      if (!isValidType) {
        console.warn(`Invalid file type: ${file.name} (${file.type})`);
      }
      if (!isValidSize) {
        console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      return isValidType && isValidSize;
    });
    
    // Show error for invalid files
    const invalidFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= maxSize;
      return !isValidType || !isValidSize;
    });
    
    if (invalidFiles.length > 0) {
      const formatErrors = invalidFiles.filter(file => !allowedTypes.includes(file.type));
      const sizeErrors = invalidFiles.filter(file => file.size > maxSize);
      
      let errorMessage = '';
      if (formatErrors.length > 0) {
        errorMessage += `Invalid file format(s): Only JPG, PNG, and TIFF files are supported.\n`;
        errorMessage += `Files with unsupported formats: ${formatErrors.map(f => f.name).join(', ')}\n`;
      }
      if (sizeErrors.length > 0) {
        errorMessage += `File(s) too large: Maximum file size is 50MB.\n`;
        errorMessage += `Large files: ${sizeErrors.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ')}`;
      }
      
      setUploadError(errorMessage.trim());
    }
    
    if (validFiles.length === 0) {
      if (invalidFiles.length > 0) {
        // Don't clear existing images if we have invalid files
        return;
      }
      return;
    }
    
    // Just create preview URLs for selected images, don't upload yet
    const imagePreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      uploaded: false // Track if this image has been uploaded
    }));
    
    setSelectedImages(imagePreviews);
    if (invalidFiles.length === 0) {
      setUploadError(null);
    }
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleAddMoreFiles = async (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    // Filter valid image files
    const validFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= maxSize;
      
      if (!isValidType) {
        console.warn(`Invalid file type: ${file.name} (${file.type})`);
      }
      if (!isValidSize) {
        console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      return isValidType && isValidSize;
    });
    
    // Show error for invalid files
    const invalidFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= maxSize;
      return !isValidType || !isValidSize;
    });
    
    if (invalidFiles.length > 0) {
      const formatErrors = invalidFiles.filter(file => !allowedTypes.includes(file.type));
      const sizeErrors = invalidFiles.filter(file => file.size > maxSize);
      
      let errorMessage = '';
      if (formatErrors.length > 0) {
        errorMessage += `Invalid file format(s): Only JPG, PNG, and TIFF files are supported.\n`;
        errorMessage += `Files with unsupported formats: ${formatErrors.map(f => f.name).join(', ')}\n`;
      }
      if (sizeErrors.length > 0) {
        errorMessage += `File(s) too large: Maximum file size is 50MB.\n`;
        errorMessage += `Large files: ${sizeErrors.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ')}`;
      }
      
      setUploadError(errorMessage.trim());
    }
    
    if (validFiles.length === 0) {
      if (invalidFiles.length > 0) {
        // Don't clear existing images if we have invalid files
        return;
      }
      return;
    }
    
    // Just create preview URLs for new images, don't upload yet
    const newImagePreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      uploaded: false // Track if this image has been uploaded
    }));
    
    // Add new images to existing ones
    setSelectedImages(prev => [...prev, ...newImagePreviews]);
    if (invalidFiles.length === 0) {
      setUploadError(null);
    }
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleProcessImages = async () => {
    setIsLoading(true);
    setIsUploading(false);
    setUploadError(null);
    
    try {
      if (isLoggedIn) {
        // Authenticated flow - upload to server and save results
        await handleAuthenticatedProcessing();
      } else {
        // Anonymous flow - analyze without saving
        await handleAnonymousProcessing();
      }
      
      // Clear selectedImages after processing (images now only appear in results)
      setSelectedImages([]);
      
    } catch (error) {
      console.error('Process error:', error);
      setUploadError(`Processing failed: ${error.message}`);
      // Ensure all loading states are reset on error
      setIsUploading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticatedProcessing = async () => {
    // First, upload all selected images that haven't been uploaded yet
    const imagesToUpload = selectedImages.filter(img => !img.uploaded);
    
    if (imagesToUpload.length > 0) {
      setIsUploading(true);
      console.log(`Uploading ${imagesToUpload.length} images...`);
      
      const filesToUpload = imagesToUpload.map(img => img.file);
      
      // Check if we should reuse existing submission or create new one
      const shouldReuseSubmission = currentSubmissionId !== null;
      console.log(`Should reuse submission: ${shouldReuseSubmission}, currentSubmissionId: ${currentSubmissionId}`);
      
      const uploadResponse = await uploadImages(filesToUpload, shouldReuseSubmission ? currentSubmissionId : null);
      
      if (uploadResponse.success && uploadResponse.results) {
        // Store the submission ID if this is a new submission
        console.log('Upload response:', uploadResponse);
        console.log('Current submission ID before update:', currentSubmissionId);
        
        if (uploadResponse.submission_id && !currentSubmissionId) {
          setCurrentSubmissionId(uploadResponse.submission_id);
          console.log('New submission created:', uploadResponse.submission_id);
        } else if (uploadResponse.submission_id && currentSubmissionId) {
          console.log('Using existing submission:', uploadResponse.submission_id);
        }
        
        // Update the selected images with upload results
        setSelectedImages(prev => {
          const updatedImages = [...prev];
          let uploadIndex = 0;
          
          updatedImages.forEach((img, index) => {
            if (!img.uploaded) {
              const uploadResult = uploadResponse.results[uploadIndex];
              updatedImages[index] = {
                ...img,
                uploaded: true,
                imageId: uploadResult?.image_id,
                s3Url: uploadResult?.s3_url,
                uploadDate: uploadResult?.date
              };
              
              // Also store submission ID from individual result if not already set
              if (uploadResult?.submission_id && !currentSubmissionId) {
                setCurrentSubmissionId(uploadResult.submission_id);
                console.log('Submission ID from individual result:', uploadResult.submission_id);
              }
              
              uploadIndex++;
            }
          });
          
          return updatedImages;
        });
        
        console.log('Images uploaded successfully:', uploadResponse.results);
        
        // Notify parent component about uploaded images
        if (onImagesUploaded && uploadResponse.results) {
          onImagesUploaded(uploadResponse.results);
        }
      } else {
        throw new Error('Upload failed: Invalid response from server');
      }
      
      setIsUploading(false);
    }
    
    // Wait for backend processing to complete and fetch real results
    console.log('Waiting for backend processing to complete...');
    
    // Poll for results every 2 seconds until processing is complete
    const uploadedImages = selectedImages.filter(img => img.uploaded);
    const realResults = [];
    
    for (const image of uploadedImages) {
      if (image.imageId) {
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max wait time
        
        while (attempts < maxAttempts) {
          try {
            const results = await getPredictionResults(image.imageId);
            
            if (results.success && (results.status === 'processed' || results.status === 'failed')) {
              // Create real result from backend data
              const realResult = {
                id: realResults.length,
                inputImage: image.preview,
                inputName: image.name,
                outputImage: results.results_url || image.preview,
                outputName: `processed_${image.name}`,
                originalFile: image.file,
                confidence: results.results.average_confidence || 0,
                detectedAreas: results.results.num_detections || 0,
                processingTime: results.results.processing_time || 0,
                species: extractSpeciesFromDetections(results.results.detections || []),
                status: results.status, // Include the status (processed or failed)
                error: results.results.error || null
              };
              
              realResults.push(realResult);
              console.log(`Real results fetched for ${image.name}:`, realResult);
              break;
            }
            
            // Still processing, wait and try again
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          } catch (error) {
            console.error(`Error fetching results for ${image.name}:`, error);
            break;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`Timeout waiting for results for ${image.name}`);
        }
      }
    }
    
    // Add real results to existing processedResults
    if (realResults.length > 0) {
      setProcessedResults(prev => [...prev, ...realResults]);
      setCurrentResultIndex(prev => prev === 0 && realResults.length > 0 ? 0 : prev);
      console.log('Real results added:', realResults);
    } else {
      console.warn('No real results obtained, API may not be configured');
      // Create results with error state instead of mock data
      const errorResults = selectedImages.map((image, index) => ({
        id: index,
        inputImage: image.preview,
        inputName: image.name,
        outputImage: image.preview, // Use original image as fallback
        outputName: `processed_${image.name}`,
        originalFile: image.file,
        confidence: 0, // Show 0 instead of fake data
        detectedAreas: 0, // Show 0 instead of fake data
        processingTime: 0, // Show 0 instead of fake data
        species: [], // Empty species array
        status: 'failed', // Use failed status to match backend
        error: 'API not configured or processing failed'
      }));
      
      setProcessedResults(prev => [...prev, ...errorResults]);
      setCurrentResultIndex(prev => prev === 0 && errorResults.length > 0 ? 0 : prev);
    }
  };

  const handleAnonymousProcessing = async () => {
    console.log('Processing images anonymously (no data saved)...');
    
    const anonymousResults = [];
    
    for (const image of selectedImages) {
      try {
        console.log(`Analyzing ${image.name} anonymously...`);
        const analysisResult = await analyzeImageAnonymous(image.file);
        
        if (analysisResult.success) {
          // Create result from anonymous analysis
          const anonymousResult = {
            id: anonymousResults.length,
            inputImage: image.preview,
            inputName: image.name,
            outputImage: image.preview, // Use original image since no processed image is saved
            outputName: `analyzed_${image.name}`,
            originalFile: image.file,
            confidence: analysisResult.results.average_confidence || 0,
            detectedAreas: analysisResult.results.num_detections || 0,
            processingTime: analysisResult.processing_time || 0,
            species: extractSpeciesFromDetections(analysisResult.results.detections || []),
            status: analysisResult.status === 'failed' ? 'failed' : 'anonymous', // Mark as failed or anonymous
            message: analysisResult.message,
            error: analysisResult.results.error || null
          };
          
          anonymousResults.push(anonymousResult);
          console.log(`Anonymous analysis completed for ${image.name}:`, anonymousResult);
        } else {
          throw new Error(`Analysis failed for ${image.name}`);
        }
      } catch (error) {
        console.error(`Error analyzing ${image.name} anonymously:`, error);
        // Create error result
        const errorResult = {
          id: anonymousResults.length,
          inputImage: image.preview,
          inputName: image.name,
          outputImage: image.preview,
          outputName: `error_${image.name}`,
          originalFile: image.file,
          confidence: 0,
          detectedAreas: 0,
          processingTime: 0,
          species: [],
          status: 'error',
          error: error.message
        };
        anonymousResults.push(errorResult);
      }
    }
    
    // Add anonymous results to existing processedResults
    if (anonymousResults.length > 0) {
      setProcessedResults(prev => [...prev, ...anonymousResults]);
      setCurrentResultIndex(prev => prev === 0 && anonymousResults.length > 0 ? 0 : prev);
      console.log('Anonymous results added:', anonymousResults);
    }
  };

  const handleClearAll = () => {
    // Clear all selected images and revoke their URLs
    selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    setSelectedImages([]);
    setProcessedResults([]);
    setCurrentResultIndex(0);
    setUploadError(null);
    setCurrentSubmissionId(null);
  };

  const navigateResult = (direction) => {
    if (direction === 'prev') {
      setCurrentResultIndex(prev => prev > 0 ? prev - 1 : prev);
    } else {
      setCurrentResultIndex(prev => prev < processedResults.length - 1 ? prev + 1 : prev);
    }
  };

  const navigateBySeven = (direction) => {
    if (direction === 'prev') {
      setCurrentResultIndex(prev => {
        const newIndex = prev - 7;
        return newIndex >= 0 ? newIndex : 0;
      });
    } else {
      setCurrentResultIndex(prev => {
        const newIndex = prev + 7;
        return newIndex < processedResults.length ? newIndex : processedResults.length - 1;
      });
    }
  };

  const navigateToIndex = (index) => {
    if (index >= 0 && index < processedResults.length) {
      setCurrentResultIndex(index);
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

  const showDownloadOptions = () => {
    setShowDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
  };

  const downloadCurrentImage = () => {
    const currentResult = processedResults[currentResultIndex];
    if (currentResult) {
      if (currentResult.originalFile) {
        // Use original file for download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentResult.originalFile);
        link.download = currentResult.outputName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        // Fallback to original method
        downloadImage(currentResult.outputImage, currentResult.outputName);
      }
      setShowDownloadModal(false);
    }
  };

  const downloadAllImages = async () => {
    console.log('downloadAllImages called, processedResults:', processedResults);
    
    if (processedResults.length === 0) {
      console.log('No processed results to download');
      alert('No images to download');
      return;
    }
    
    setIsDownloading(true);
    console.log('Starting ZIP download process...');
    
    try {
      // Use JSZip from global scope (loaded via script tag)
      console.log('Using JSZip library...');
      
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded. Please refresh the page and try again.');
      }
      
      const zip = new window.JSZip();
      console.log('JSZip instance created:', zip);
      
      // Add each processed image to the zip
      for (let i = 0; i < processedResults.length; i++) {
        const result = processedResults[i];
        console.log(`Processing image ${i + 1}/${processedResults.length}:`, result);
        
        try {
          let blob;
          let filename;
          
          // Use the original file if available, otherwise fetch from URL
          if (result.originalFile && result.originalFile instanceof File) {
            blob = result.originalFile;
            filename = result.originalFile.name;
            console.log('Using original file:', filename);
          } else if (result.outputImage) {
            // Fallback: fetch from URL
            console.log('Fetching from URL:', result.outputImage);
            const response = await fetch(result.outputImage);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            blob = await response.blob();
            filename = result.outputName || `image_${i + 1}.jpg`;
            console.log('Fetched from URL successfully');
          } else {
            throw new Error('No valid image source found');
          }
          
          // Validate blob
          if (!blob || blob.size === 0) {
            throw new Error('Invalid or empty image blob');
          }
          
          // Create a clean filename
          const cleanFilename = `processed_image_${i + 1}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          // Add to zip
          zip.file(cleanFilename, blob);
          console.log(`Added to zip: ${cleanFilename} (${blob.size} bytes)`);
          
        } catch (imageError) {
          console.error(`Error processing image ${i + 1}:`, imageError);
          // Continue with other images instead of failing completely
          continue;
        }
      }
      
      // Check if any files were added to the zip
      const fileCount = Object.keys(zip.files).length;
      if (fileCount === 0) {
        throw new Error('No valid images could be added to the ZIP file');
      }
      
      console.log(`Generating ZIP file with ${fileCount} images...`);
      
      // Generate the zip file with compression
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      console.log('ZIP file generated, size:', zipBlob.size);
      
      if (zipBlob.size === 0) {
        throw new Error('Generated ZIP file is empty');
      }
      
      // Create download link
      const link = document.createElement('a');
      const zipUrl = URL.createObjectURL(zipBlob);
      link.href = zipUrl;
      link.download = `acacia_analysis_results_${new Date().toISOString().split('T')[0]}.zip`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(zipUrl);
      }, 1000);
      
      console.log('ZIP download completed successfully');
      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      setUploadError(`Failed to create ZIP file: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
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

  const removeImage = (index) => {
    const imageToRemove = selectedImages[index];
    URL.revokeObjectURL(imageToRemove.preview);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return {
    selectedImages,
    processedResults,
    currentResultIndex,
    showInputModal,
    isEditingNumber,
    editNumber,
    setShowInputModal,
    handleFileChange,
    handleAddMoreFiles,
    handleProcessImages,
    handleClearAll,
    navigateResult,
    navigateBySeven,
    navigateToIndex,
    downloadImage,
    showDownloadOptions,
    closeDownloadModal,
    downloadCurrentImage,
    downloadAllImages,
    showDownloadModal,
    isDownloading,
    handleEditNumber,
    handleSaveNumber,
    handleEditInputChange,
    handleEditKeyPress,
    removeImage,
    isLoading,
    isUploading,
    uploadError
  };
};

// Helper function to extract species from detections
function extractSpeciesFromDetections(detections) {
  const species = new Set();
  for (const detection of detections) {
    const label = detection.label?.toLowerCase() || '';
    if (label.includes('acacia')) {
      const speciesName = label.replace('acacia', '').trim();
      if (speciesName) {
        species.add(`Acacia ${speciesName}`);
      } else {
        species.add('Acacia');
      }
    } else if (label) {
      species.add(label.charAt(0).toUpperCase() + label.slice(1));
    }
  }
  return Array.from(species);
}
