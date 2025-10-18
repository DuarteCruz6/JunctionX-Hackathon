import { useState } from 'react';
import { uploadImages } from '../services/api.js';

export const useImageProcessing = () => {
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
      // First, upload all selected images that haven't been uploaded yet
      const imagesToUpload = selectedImages.filter(img => !img.uploaded);
      
      if (imagesToUpload.length > 0) {
        setIsUploading(true);
        console.log(`Uploading ${imagesToUpload.length} images...`);
        
        const filesToUpload = imagesToUpload.map(img => img.file);
        const uploadResponse = await uploadImages(filesToUpload);
        
        if (uploadResponse.success && uploadResponse.results) {
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
                uploadIndex++;
              }
            });
            
            return updatedImages;
          });
          
          console.log('Images uploaded successfully:', uploadResponse.results);
        } else {
          throw new Error('Upload failed: Invalid response from server');
        }
        
        setIsUploading(false);
      }
      
      // Now simulate processing delay (2-4 seconds)
      const processingTime = Math.random() * 2000 + 2000; // 2-4 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Create mock processing results from current selected images
      const mockResults = selectedImages.map((image, index) => ({
        id: index,
        inputImage: image.preview,
        inputName: image.name,
        outputImage: image.preview, // In real implementation, this would be the processed result
        outputName: `processed_${image.name}`,
        originalFile: image.file, // Keep reference to original file for download
        confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
        detectedAreas: Math.floor(Math.random() * 5) + 1, // Random detected areas 1-5
        processingTime: Math.floor(Math.random() * 3) + 1 // Random processing time 1-3 seconds
      }));
      
      // Add new results to existing processedResults (for multiple batches)
      setProcessedResults(prev => [...prev, ...mockResults]);
      setCurrentResultIndex(prev => prev === 0 && mockResults.length > 0 ? 0 : prev);
      
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

  const handleClearAll = () => {
    // Clear all selected images and revoke their URLs
    selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    setSelectedImages([]);
    setProcessedResults([]);
    setCurrentResultIndex(0);
    setUploadError(null);
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
