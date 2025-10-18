import { useState } from 'react';

export const useImageProcessing = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showInputModal, setShowInputModal] = useState(false);
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Simulate upload delay (1-3 seconds)
    const uploadTime = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, uploadTime));
    
    // Create preview URLs for all images, but only show first 12 in grid
    const imagePreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setSelectedImages(imagePreviews);
    setIsUploading(false);
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleAddMoreFiles = async (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Simulate upload delay (1-3 seconds)
    const uploadTime = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, uploadTime));
    
    // Create preview URLs for new images
    const newImagePreviews = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    // Add new images to existing ones
    setSelectedImages(prev => [...prev, ...newImagePreviews]);
    setIsUploading(false);
    // Reset the input so it can be used again
    event.target.value = '';
  };

  const handleProcessImages = async () => {
    setIsLoading(true);
    
    // Simulate processing delay (2-4 seconds)
    const processingTime = Math.random() * 2000 + 2000; // 2-4 seconds
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate processing results with mock data
    const mockResults = selectedImages.map((image, index) => ({
      id: index,
      inputImage: image.preview,
      inputName: image.name,
      outputImage: image.preview, // In real implementation, this would be the processed result
      outputName: `processed_${image.name}`,
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
      detectedAreas: Math.floor(Math.random() * 5) + 1, // Random detected areas 1-5
      processingTime: Math.floor(Math.random() * 3) + 1 // Random processing time 1-3 seconds
    }));
    
    setProcessedResults(mockResults);
    setCurrentResultIndex(0);
    setIsLoading(false);
  };

  const handleClearAll = () => {
    // Clear all selected images and revoke their URLs
    selectedImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    setSelectedImages([]);
    setProcessedResults([]);
    setCurrentResultIndex(0);
  };

  const navigateResult = (direction) => {
    if (direction === 'prev') {
      setCurrentResultIndex(prev => prev > 0 ? prev - 1 : processedResults.length - 1);
    } else {
      setCurrentResultIndex(prev => prev < processedResults.length - 1 ? prev + 1 : 0);
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
    downloadImage,
    handleEditNumber,
    handleSaveNumber,
    handleEditInputChange,
    handleEditKeyPress,
    removeImage,
    isLoading,
    isUploading
  };
};
