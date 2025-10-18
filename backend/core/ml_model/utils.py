import cv2
import numpy as np
from PIL import Image
import torch
from typing import Tuple, List, Dict, Any
import os
from pathlib import Path

class ImagePreprocessor:
    """Image preprocessing utilities for Acacia detection."""
    
    @staticmethod
    def resize_image(image: np.ndarray, target_size: Tuple[int, int] = (640, 640)) -> np.ndarray:
        """
        Resize image while maintaining aspect ratio.
        
        Args:
            image: Input image as numpy array
            target_size: Target size (width, height)
        
        Returns:
            np.ndarray: Resized image
        """
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        # Calculate scaling factor
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        # Resize image
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Create padded image
        padded = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        padded[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        return padded
    
    @staticmethod
    def normalize_image(image: np.ndarray) -> np.ndarray:
        """
        Normalize image to [0, 1] range.
        
        Args:
            image: Input image as numpy array
        
        Returns:
            np.ndarray: Normalized image
        """
        return image.astype(np.float32) / 255.0
    
    @staticmethod
    def apply_augmentation(image: np.ndarray, 
                          brightness: float = 0.1,
                          contrast: float = 0.1,
                          saturation: float = 0.1) -> np.ndarray:
        """
        Apply data augmentation to image.
        
        Args:
            image: Input image as numpy array
            brightness: Brightness adjustment factor
            contrast: Contrast adjustment factor
            saturation: Saturation adjustment factor
        
        Returns:
            np.ndarray: Augmented image
        """
        # Convert to PIL for easier augmentation
        pil_image = Image.fromarray(image)
        
        # Apply brightness
        if brightness > 0:
            brightness_factor = 1 + np.random.uniform(-brightness, brightness)
            pil_image = pil_image.point(lambda p: min(255, int(p * brightness_factor)))
        
        # Apply contrast
        if contrast > 0:
            contrast_factor = 1 + np.random.uniform(-contrast, contrast)
            pil_image = pil_image.point(lambda p: min(255, max(0, int((p - 128) * contrast_factor + 128))))
        
        # Convert back to numpy
        return np.array(pil_image)
    
    @staticmethod
    def create_mask_overlay(image: np.ndarray, 
                           masks: List[np.ndarray], 
                           colors: List[Tuple[int, int, int]] = None) -> np.ndarray:
        """
        Create mask overlay on image.
        
        Args:
            image: Original image
            masks: List of binary masks
            colors: List of colors for each mask
        
        Returns:
            np.ndarray: Image with mask overlay
        """
        if colors is None:
            colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)]
        
        overlay = image.copy()
        
        for i, mask in enumerate(masks):
            color = colors[i % len(colors)]
            overlay[mask > 0] = color
        
        # Blend with original image
        alpha = 0.6
        result = cv2.addWeighted(image, 1 - alpha, overlay, alpha, 0)
        
        return result

class ModelUtils:
    """Utility functions for model operations."""
    
    @staticmethod
    def load_model(model_path: str, device: str = 'auto') -> Any:
        """
        Load YOLOv8 model from file.
        
        Args:
            model_path: Path to model file
            device: Device to load model on
        
        Returns:
            Loaded model
        """
        from ultralytics import YOLO
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        model = YOLO(model_path)
        
        if device == 'auto':
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        model.to(device)
        return model
    
    @staticmethod
    def postprocess_results(results: Any, 
                          confidence_threshold: float = 0.3,
                          iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Post-process YOLOv8 results.
        
        Args:
            results: Raw model results
            confidence_threshold: Confidence threshold for detections
            iou_threshold: IoU threshold for NMS
        
        Returns:
            List of processed detections
        """
        detections = []
        
        for result in results:
            if result.masks is not None:
                boxes = result.boxes
                masks = result.masks
                
                for i in range(len(boxes)):
                    confidence = float(boxes.conf[i])
                    
                    if confidence >= confidence_threshold:
                        # Get bounding box
                        box = boxes.xyxy[i].cpu().numpy()
                        
                        # Get mask
                        mask = masks.data[i].cpu().numpy()
                        
                        detection = {
                            'bbox': {
                                'x1': float(box[0]),
                                'y1': float(box[1]),
                                'x2': float(box[2]),
                                'y2': float(box[3])
                            },
                            'confidence': confidence,
                            'mask': mask,
                            'area': float(np.sum(mask > 0)),
                            'class': 'acacia'
                        }
                        
                        detections.append(detection)
        
        return detections
    
    @staticmethod
    def calculate_coverage_percentage(detections: List[Dict[str, Any]], 
                                    image_shape: Tuple[int, int]) -> float:
        """
        Calculate Acacia coverage percentage in image.
        
        Args:
            detections: List of detections
            image_shape: Image shape (height, width)
        
        Returns:
            float: Coverage percentage
        """
        if not detections:
            return 0.0
        
        total_area = image_shape[0] * image_shape[1]
        acacia_area = sum(det['area'] for det in detections)
        
        coverage_percentage = (acacia_area / total_area) * 100
        return min(coverage_percentage, 100.0)  # Cap at 100%

class DataUtils:
    """Data handling utilities."""
    
    @staticmethod
    def create_yolo_annotation(image_path: str, 
                             detections: List[Dict[str, Any]], 
                             output_path: str) -> None:
        """
        Create YOLO format annotation file.
        
        Args:
            image_path: Path to image file
            detections: List of detections
            output_path: Output annotation file path
        """
        image = cv2.imread(image_path)
        h, w = image.shape[:2]
        
        with open(output_path, 'w') as f:
            for det in detections:
                bbox = det['bbox']
                
                # Convert to YOLO format (normalized center coordinates)
                x_center = (bbox['x1'] + bbox['x2']) / 2 / w
                y_center = (bbox['y1'] + bbox['y2']) / 2 / h
                width = (bbox['x2'] - bbox['x1']) / w
                height = (bbox['y2'] - bbox['y1']) / h
                
                # Write annotation (class_id x_center y_center width height)
                f.write(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")
    
    @staticmethod
    def split_dataset(data_dir: str, 
                     train_ratio: float = 0.7,
                     val_ratio: float = 0.2,
                     test_ratio: float = 0.1) -> Dict[str, List[str]]:
        """
        Split dataset into train/val/test sets.
        
        Args:
            data_dir: Dataset directory
            train_ratio: Training set ratio
            val_ratio: Validation set ratio
            test_ratio: Test set ratio
        
        Returns:
            dict: Split dataset paths
        """
        if abs(train_ratio + val_ratio + test_ratio - 1.0) > 1e-6:
            raise ValueError("Ratios must sum to 1.0")
        
        # Get all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(Path(data_dir).glob(f"**/*{ext}"))
            image_files.extend(Path(data_dir).glob(f"**/*{ext.upper()}"))
        
        image_files = [str(f) for f in image_files]
        np.random.shuffle(image_files)
        
        # Calculate split indices
        n_total = len(image_files)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)
        
        # Split dataset
        splits = {
            'train': image_files[:n_train],
            'val': image_files[n_train:n_train + n_val],
            'test': image_files[n_train + n_val:]
        }
        
        return splits

# Example usage
def preprocess_image_for_inference(image_path: str) -> np.ndarray:
    """
    Preprocess image for model inference.
    
    Args:
        image_path: Path to input image
    
    Returns:
        np.ndarray: Preprocessed image
    """
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    # Convert BGR to RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Resize and normalize
    preprocessor = ImagePreprocessor()
    processed = preprocessor.resize_image(image)
    processed = preprocessor.normalize_image(processed)
    
    return processed
