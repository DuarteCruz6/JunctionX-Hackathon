import os
from PIL import Image
import numpy as np

# Paths
no_acacia_folder = "C:/Users/danim/OneDrive/Ambiente de Trabalho/JunctionX-Hackathon/backend/core/ml_model_new/dataset/images/val"
labels_folder = "C:/Users/danim/OneDrive/Ambiente de Trabalho/JunctionX-Hackathon/backend/core/ml_model_new/dataset/labels/val"

# Create labels folder if it doesn't exist
os.makedirs(labels_folder, exist_ok=True)

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
for filename in os.listdir(no_acacia_folder):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        src_path = os.path.join(no_acacia_folder, filename)
        # It's good practice to keep the mask name consistent with the image name
        mask_filename = f"{os.path.splitext(filename)[0]}.png"
        save_path = os.path.join(labels_folder, mask_filename)
        create_white_mask(src_path, save_path)

print(f"White masks created in '{labels_folder}' for {len(os.listdir(no_acacia_folder))} images.")