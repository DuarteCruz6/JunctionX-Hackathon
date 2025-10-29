from ultralytics.data.converter import convert_segment_masks_to_yolo_seg
import os
from pathlib import Path


# Define paths based on your data.yaml and dataset structure
SCRIPT_DIR = Path(__file__).parent
DATASET_DIR = SCRIPT_DIR / "reorganized_dataset"
train_masks_dir = os.path.join(DATASET_DIR, "labels", "train")
val_masks_dir = os.path.join(DATASET_DIR, "labels", "val")

# Define output directories for YOLO segment labels
train_output_dir = os.path.join(DATASET_DIR, "labels", "train") # Overwrite masks with labels
val_output_dir = os.path.join(DATASET_DIR, "labels", "val")   # Overwrite masks with labels

# Number of classes
num_classes = 1

print("Converting training masks to YOLO segmentation format...")
convert_segment_masks_to_yolo_seg(masks_dir=train_masks_dir, output_dir=train_output_dir, classes=num_classes)
print("✅ Training masks converted.")

print("Converting validation masks to YOLO segmentation format...")
convert_segment_masks_to_yolo_seg(masks_dir=val_masks_dir, output_dir=val_output_dir, classes=num_classes)
print("✅ Validation masks converted.")

print("\nConversion complete. You can now try retraining your model.")