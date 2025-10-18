import os
import cv2
import numpy as np
from pathlib import Path
import json
import shutil
from typing import List, Dict, Tuple, Any
import argparse
from PIL import Image
import xml.etree.ElementTree as ET

class AcaciaDataPreprocessor:
    """Data preprocessing pipeline for Acacia detection dataset."""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
        
        # Create output directories
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / 'images').mkdir(exist_ok=True)
        (self.output_dir / 'labels').mkdir(exist_ok=True)
        (self.output_dir / 'masks').mkdir(exist_ok=True)
    
    def discover_dataset(self) -> Dict[str, List[Path]]:
        """
        Discover images and annotations in the dataset.
        
        Returns:
            dict: Dictionary with 'images' and 'annotations' keys
        """
        images = []
        annotations = []
        
        # Find all image files
        for ext in self.supported_formats:
            images.extend(self.input_dir.rglob(f"*{ext}"))
            images.extend(self.input_dir.rglob(f"*{ext.upper()}"))
        
        # Find annotation files (XML, JSON, TXT)
        annotation_extensions = {'.xml', '.json', '.txt', '.csv'}
        for ext in annotation_extensions:
            annotations.extend(self.input_dir.rglob(f"*{ext}"))
        
        return {
            'images': images,
            'annotations': annotations
        }
    
    def convert_pascal_voc_to_yolo(self, xml_file: Path, image_file: Path) -> List[str]:
        """
        Convert Pascal VOC XML annotation to YOLO format.
        
        Args:
            xml_file: Path to XML annotation file
            image_file: Path to corresponding image file
        
        Returns:
            List of YOLO format annotation strings
        """
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Get image dimensions
        size = root.find('size')
        img_width = int(size.find('width').text)
        img_height = int(size.find('height').text)
        
        annotations = []
        
        for obj in root.findall('object'):
            # Check if it's an Acacia
            class_name = obj.find('name').text.lower()
            if 'acacia' not in class_name:
                continue
            
            # Get bounding box
            bbox = obj.find('bndbox')
            xmin = int(bbox.find('xmin').text)
            ymin = int(bbox.find('ymin').text)
            xmax = int(bbox.find('xmax').text)
            ymax = int(bbox.find('ymax').text)
            
            # Convert to YOLO format
            x_center = (xmin + xmax) / 2 / img_width
            y_center = (ymin + ymax) / 2 / img_height
            width = (xmax - xmin) / img_width
            height = (ymax - ymin) / img_height
            
            # YOLO format: class_id x_center y_center width height
            annotation = f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
            annotations.append(annotation)
        
        return annotations
    
    def convert_coco_to_yolo(self, json_file: Path) -> Dict[str, List[str]]:
        """
        Convert COCO JSON annotation to YOLO format.
        
        Args:
            json_file: Path to COCO JSON annotation file
        
        Returns:
            Dictionary mapping image filenames to YOLO annotations
        """
        with open(json_file, 'r') as f:
            coco_data = json.load(f)
        
        # Create mappings
        images = {img['id']: img for img in coco_data['images']}
        categories = {cat['id']: cat for cat in coco_data['categories']}
        
        # Find Acacia category
        acacia_category_id = None
        for cat_id, cat in categories.items():
            if 'acacia' in cat['name'].lower():
                acacia_category_id = cat_id
                break
        
        if acacia_category_id is None:
            print("Warning: No Acacia category found in COCO dataset")
            return {}
        
        # Group annotations by image
        image_annotations = {}
        for ann in coco_data['annotations']:
            if ann['category_id'] != acacia_category_id:
                continue
            
            image_id = ann['image_id']
            image_info = images[image_id]
            
            # Get bounding box (COCO format: [x, y, width, height])
            bbox = ann['bbox']
            x, y, w, h = bbox
            
            # Convert to YOLO format
            img_width = image_info['width']
            img_height = image_info['height']
            
            x_center = (x + w / 2) / img_width
            y_center = (y + h / 2) / img_height
            width = w / img_width
            height = h / img_height
            
            # YOLO format: class_id x_center y_center width height
            annotation = f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
            
            filename = image_info['file_name']
            if filename not in image_annotations:
                image_annotations[filename] = []
            image_annotations[filename].append(annotation)
        
        return image_annotations
    
    def resize_and_normalize_image(self, image_path: Path, target_size: Tuple[int, int] = (640, 640)) -> np.ndarray:
        """
        Resize image while maintaining aspect ratio and normalize.
        
        Args:
            image_path: Path to input image
            target_size: Target size (width, height)
        
        Returns:
            np.ndarray: Processed image
        """
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize while maintaining aspect ratio
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Create padded image
        padded = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        padded[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        return padded
    
    def create_segmentation_masks(self, image_path: Path, annotations: List[str]) -> np.ndarray:
        """
        Create segmentation masks from bounding box annotations.
        
        Args:
            image_path: Path to image file
            annotations: List of YOLO format annotations
        
        Returns:
            np.ndarray: Segmentation mask
        """
        # Load image to get dimensions
        image = cv2.imread(str(image_path))
        h, w = image.shape[:2]
        
        # Create empty mask
        mask = np.zeros((h, w), dtype=np.uint8)
        
        for ann in annotations:
            parts = ann.strip().split()
            if len(parts) != 5:
                continue
            
            # Parse YOLO annotation
            x_center = float(parts[1])
            y_center = float(parts[2])
            width = float(parts[3])
            height = float(parts[4])
            
            # Convert to pixel coordinates
            x1 = int((x_center - width / 2) * w)
            y1 = int((y_center - height / 2) * h)
            x2 = int((x_center + width / 2) * w)
            y2 = int((y_center + height / 2) * h)
            
            # Ensure coordinates are within image bounds
            x1 = max(0, min(x1, w-1))
            y1 = max(0, min(y1, h-1))
            x2 = max(0, min(x2, w-1))
            y2 = max(0, min(y2, h-1))
            
            # Fill mask
            mask[y1:y2, x1:x2] = 255
        
        return mask
    
    def process_dataset(self, 
                       annotation_format: str = 'auto',
                       target_size: Tuple[int, int] = (640, 640),
                       create_masks: bool = True) -> Dict[str, Any]:
        """
        Process the entire dataset.
        
        Args:
            annotation_format: Annotation format ('pascal_voc', 'coco', 'yolo', 'auto')
            target_size: Target image size
            create_masks: Whether to create segmentation masks
        
        Returns:
            dict: Processing statistics
        """
        dataset_info = self.discover_dataset()
        images = dataset_info['images']
        annotations = dataset_info['annotations']
        
        print(f"Found {len(images)} images and {len(annotations)} annotation files")
        
        processed_images = 0
        processed_annotations = 0
        errors = []
        
        # Process each image
        for image_path in images:
            try:
                # Copy and resize image
                image_name = image_path.name
                output_image_path = self.output_dir / 'images' / image_name
                
                processed_image = self.resize_and_normalize_image(image_path, target_size)
                cv2.imwrite(str(output_image_path), cv2.cvtColor(processed_image, cv2.COLOR_RGB2BGR))
                
                # Find corresponding annotation
                annotation_file = None
                for ann_path in annotations:
                    if ann_path.stem == image_path.stem:
                        annotation_file = ann_path
                        break
                
                if annotation_file:
                    # Process annotation based on format
                    if annotation_format == 'auto':
                        if annotation_file.suffix == '.xml':
                            annotation_format = 'pascal_voc'
                        elif annotation_file.suffix == '.json':
                            annotation_format = 'coco'
                        elif annotation_file.suffix == '.txt':
                            annotation_format = 'yolo'
                    
                    yolo_annotations = []
                    
                    if annotation_format == 'pascal_voc':
                        yolo_annotations = self.convert_pascal_voc_to_yolo(annotation_file, image_path)
                    elif annotation_format == 'coco':
                        coco_annotations = self.convert_coco_to_yolo(annotation_file)
                        yolo_annotations = coco_annotations.get(image_name, [])
                    elif annotation_format == 'yolo':
                        with open(annotation_file, 'r') as f:
                            yolo_annotations = f.readlines()
                    
                    # Save YOLO annotation
                    if yolo_annotations:
                        label_name = image_path.stem + '.txt'
                        output_label_path = self.output_dir / 'labels' / label_name
                        
                        with open(output_label_path, 'w') as f:
                            f.write('\n'.join(yolo_annotations))
                        
                        processed_annotations += 1
                        
                        # Create segmentation mask if requested
                        if create_masks:
                            mask = self.create_segmentation_masks(image_path, yolo_annotations)
                            mask_name = image_path.stem + '_mask.png'
                            output_mask_path = self.output_dir / 'masks' / mask_name
                            cv2.imwrite(str(output_mask_path), mask)
                
                processed_images += 1
                
                if processed_images % 100 == 0:
                    print(f"Processed {processed_images} images...")
                
            except Exception as e:
                errors.append(f"Error processing {image_path}: {str(e)}")
                print(f"Error processing {image_path}: {str(e)}")
        
        # Create dataset configuration
        self.create_dataset_config()
        
        stats = {
            'total_images': len(images),
            'processed_images': processed_images,
            'processed_annotations': processed_annotations,
            'errors': len(errors),
            'error_details': errors
        }
        
        print(f"Processing complete: {processed_images}/{len(images)} images processed")
        print(f"Annotations processed: {processed_annotations}")
        print(f"Errors: {len(errors)}")
        
        return stats
    
    def create_dataset_config(self):
        """Create YOLOv8 dataset configuration file."""
        config = {
            'path': str(self.output_dir.absolute()),
            'train': 'images',
            'val': 'images',  # For hackathon, use same data for validation
            'nc': 1,
            'names': ['acacia']
        }
        
        config_path = self.output_dir / 'dataset.yaml'
        with open(config_path, 'w') as f:
            import yaml
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"Dataset configuration saved to: {config_path}")

def main():
    """Main preprocessing script."""
    parser = argparse.ArgumentParser(description='Preprocess Acacia detection dataset')
    parser.add_argument('--input_dir', required=True, help='Input dataset directory')
    parser.add_argument('--output_dir', required=True, help='Output processed dataset directory')
    parser.add_argument('--format', default='auto', choices=['auto', 'pascal_voc', 'coco', 'yolo'],
                       help='Annotation format')
    parser.add_argument('--size', default=640, type=int, help='Target image size')
    parser.add_argument('--no_masks', action='store_true', help='Skip mask creation')
    
    args = parser.parse_args()
    
    # Initialize preprocessor
    preprocessor = AcaciaDataPreprocessor(args.input_dir, args.output_dir)
    
    # Process dataset
    stats = preprocessor.process_dataset(
        annotation_format=args.format,
        target_size=(args.size, args.size),
        create_masks=not args.no_masks
    )
    
    # Print statistics
    print("\nProcessing Statistics:")
    print(f"Total images: {stats['total_images']}")
    print(f"Processed images: {stats['processed_images']}")
    print(f"Processed annotations: {stats['processed_annotations']}")
    print(f"Errors: {stats['errors']}")
    
    if stats['errors'] > 0:
        print("\nError details:")
        for error in stats['error_details']:
            print(f"  - {error}")

if __name__ == "__main__":
    main()
