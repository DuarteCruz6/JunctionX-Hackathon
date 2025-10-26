import os
from PIL import Image
import numpy as np
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
NO_ACACIA_FOLDER = SCRIPT_DIR / "data/train/images_not_acacias"
OUTPUT_DIR = SCRIPT_DIR / "data/train/masks_not_acacias"

# Create labels folder if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Function to create a white mask
def create_white_mask(image_path, save_path):
    """Creates a completely white mask with the same dimensions as the input image."""
    with Image.open(image_path) as img:
        width, height = img.size
        # Create an array filled with 255 (white)
        mask = np.full((height, width), 255, dtype=np.uint8)
        mask_img = Image.fromarray(mask)
        mask_img.save(save_path)

# Process non-acacia images
for filename in os.listdir(NO_ACACIA_FOLDER):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        src_path = os.path.join(NO_ACACIA_FOLDER, filename)
        # It's good practice to keep the mask name consistent with the image name
        mask_filename = f"{os.path.splitext(filename)[0]}.png"
        save_path = os.path.join(OUTPUT_DIR, mask_filename)
        create_white_mask(src_path, save_path)

print(f"White masks created in '{OUTPUT_DIR}' for {len(os.listdir(NO_ACACIA_FOLDER))} images.")