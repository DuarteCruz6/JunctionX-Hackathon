import os
import yaml
from ultralytics import YOLO
import torch
from pathlib import Path
import shutil
from typing import Dict, List, Any

class AcaciaModelTrainer:
    """YOLOv8-seg model trainer for Acacia detection."""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "acacia_config.yaml"
        self.model = None
        self.training_results = None
    
    def create_dataset_config(self, 
                            train_images: str,
                            val_images: str,
                            test_images: str = None,
                            num_classes: int = 1) -> str:
        """
        Create YAML configuration file for YOLOv8 training.
        
        Args:
            train_images: Path to training images
            val_images: Path to validation images
            test_images: Path to test images (optional)
            num_classes: Number of classes (1 for Acacia only)
        
        Returns:
            str: Path to created config file
        """
        
        config = {
            'path': str(Path(train_images).parent),  # Dataset root directory
            'train': str(Path(train_images).name),   # Training images folder
            'val': str(Path(val_images).name),       # Validation images folder
            'nc': num_classes,                       # Number of classes
            'names': ['acacia']                     # Class names
        }
        
        if test_images:
            config['test'] = str(Path(test_images).name)
        
        # Write config file
        with open(self.config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"Dataset configuration saved to: {self.config_path}")
        return self.config_path
    
    def prepare_model(self, model_size: str = 'n') -> None:
        """
        Initialize YOLOv8-seg model.
        
        Args:
            model_size: Model size ('n', 's', 'm', 'l', 'x')
        """
        model_name = f'yolov8{model_size}-seg.pt'
        self.model = YOLO(model_name)
        print(f"Initialized YOLOv8-seg model: {model_name}")
    
    def train(self,
              epochs: int = 100,
              batch_size: int = 16,
              img_size: int = 640,
              learning_rate: float = 0.01,
              device: str = 'auto') -> Dict[str, Any]:
        """
        Train the YOLOv8-seg model for Acacia detection.
        
        Args:
            epochs: Number of training epochs
            batch_size: Batch size for training
            img_size: Input image size
            learning_rate: Learning rate
            device: Device to use ('cpu', 'cuda', 'auto')
        
        Returns:
            dict: Training results
        """
        
        if not self.model:
            raise ValueError("Model not initialized. Call prepare_model() first.")
        
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        
        print("Starting Acacia detection model training...")
        print(f"Epochs: {epochs}, Batch size: {batch_size}, Image size: {img_size}")
        
        # Training parameters
        train_args = {
            'data': self.config_path,
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': img_size,
            'lr0': learning_rate,
            'device': device,
            'project': 'acacia_training',
            'name': 'yolov8_seg_acacia',
            'save': True,
            'save_period': 10,  # Save checkpoint every 10 epochs
            'patience': 20,     # Early stopping patience
            'verbose': True,
            'plots': True,      # Generate training plots
            'val': True,        # Run validation
            'cache': True,      # Cache images for faster training
        }
        
        # Start training
        self.training_results = self.model.train(**train_args)
        
        print("Training completed!")
        return self.training_results
    
    def validate(self, data_path: str = None) -> Dict[str, Any]:
        """
        Validate the trained model.
        
        Args:
            data_path: Path to validation dataset config
        
        Returns:
            dict: Validation results
        """
        
        if not self.model:
            raise ValueError("Model not initialized.")
        
        data_config = data_path or self.config_path
        
        print("Running model validation...")
        val_results = self.model.val(data=data_config)
        
        print("Validation completed!")
        return val_results
    
    def export_model(self, format: str = 'onnx', optimize: bool = True) -> str:
        """
        Export trained model to different formats.
        
        Args:
            format: Export format ('onnx', 'torchscript', 'tflite', etc.)
            optimize: Whether to optimize the exported model
        
        Returns:
            str: Path to exported model
        """
        
        if not self.model:
            raise ValueError("Model not initialized.")
        
        print(f"Exporting model to {format} format...")
        
        export_args = {
            'format': format,
            'optimize': optimize,
            'imgsz': 640,
        }
        
        exported_path = self.model.export(**export_args)
        print(f"Model exported to: {exported_path}")
        
        return exported_path
    
    def upload_to_huggingface(self, 
                             repo_name: str,
                             hf_token: str,
                             model_path: str = None) -> bool:
        """
        Upload trained model to Hugging Face Hub.
        
        Args:
            repo_name: Hugging Face repository name
            hf_token: Hugging Face API token
            model_path: Path to model file (uses best.pt if None)
        
        Returns:
            bool: True if successful
        """
        
        try:
            from huggingface_hub import HfApi, Repository
            
            # Use best model if no path specified
            if not model_path:
                model_path = "acacia_training/yolov8_seg_acacia/weights/best.pt"
            
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            # Initialize HF API
            api = HfApi(token=hf_token)
            
            # Create repository
            api.create_repo(repo_name, exist_ok=True)
            
            # Upload model file
            api.upload_file(
                path_or_fileobj=model_path,
                path_in_repo="pytorch_model.bin",
                repo_id=repo_name,
                commit_message="Add Acacia detection model"
            )
            
            print(f"Model uploaded to Hugging Face: {repo_name}")
            return True
            
        except Exception as e:
            print(f"Failed to upload to Hugging Face: {e}")
            return False
    
    def get_training_summary(self) -> Dict[str, Any]:
        """
        Get summary of training results.
        
        Returns:
            dict: Training summary
        """
        
        if not self.training_results:
            return {"error": "No training results available"}
        
        # Extract key metrics
        summary = {
            "best_epoch": self.training_results.results_dict.get('best_epoch', 'N/A'),
            "best_fitness": self.training_results.results_dict.get('best_fitness', 'N/A'),
            "training_time": getattr(self.training_results, 'training_time', 'N/A'),
            "model_path": getattr(self.training_results, 'save_dir', 'N/A'),
            "metrics": self.training_results.results_dict
        }
        
        return summary

# Example usage and training script
def main():
    """Main training script for Acacia detection model."""
    
    # Initialize trainer
    trainer = AcaciaModelTrainer()
    
    # Create dataset configuration
    # Update these paths to your actual dataset locations
    train_images = "data/train/images"
    val_images = "data/val/images"
    
    config_path = trainer.create_dataset_config(
        train_images=train_images,
        val_images=val_images,
        num_classes=1
    )
    
    # Prepare model
    trainer.prepare_model(model_size='n')  # Use nano model for faster training
    
    # Train model
    training_results = trainer.train(
        epochs=50,      # Reduced for hackathon
        batch_size=8,   # Smaller batch size
        img_size=640,
        learning_rate=0.01,
        device='auto'
    )
    
    # Validate model
    val_results = trainer.validate()
    
    # Export model
    exported_path = trainer.export_model(format='onnx')
    
    # Get training summary
    summary = trainer.get_training_summary()
    print("Training Summary:", summary)
    
    # Upload to Hugging Face (optional)
    hf_token = os.getenv('HF_API_TOKEN')
    if hf_token:
        success = trainer.upload_to_huggingface(
            repo_name="forest-guardian-acacia-detection",
            hf_token=hf_token
        )
        print(f"Hugging Face upload: {'Success' if success else 'Failed'}")

if __name__ == "__main__":
    main()
