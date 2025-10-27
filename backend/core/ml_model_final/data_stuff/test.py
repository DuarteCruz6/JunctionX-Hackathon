from pathlib import Path
from PIL import Image
import numpy as np

labels_path = Path("/Users/duartecruz/Desktop/junctionX hackathon/TheThreeMusketers/backend/core/ml_model_final/data_stuff/reorganized_dataset/labels/train")
masks_acacia_path = Path("/Users/duartecruz/Desktop/junctionX hackathon/TheThreeMusketers/backend/core/ml_model_final/data_stuff/data/train/masks_acacias")
masks_no_acacia_path = Path("/Users/duartecruz/Desktop/junctionX hackathon/TheThreeMusketers/backend/core/ml_model_final/data_stuff/data/train/masks_not_acacias")
acacia_count = sum(1 for item in masks_acacia_path.iterdir() if item.is_file())
no_acacia_count = sum(1 for item in masks_no_acacia_path.iterdir() if item.is_file())

zero = 0
one = 0
other = 0

for mask_file in labels_path.glob("*.png"):
    mask = np.array(Image.open(mask_file))
    if 0 in np.unique(mask): zero+=1
    if 1 in np.unique(mask): one+=1
    if (0 not in np.unique(mask) and 1 not in np.unique(mask)): other+=1

print("images with 0:",zero,"out of",acacia_count+no_acacia_count)
print("images with 1:",one,"out of",acacia_count)
print("images with other:",other,"out of",acacia_count+no_acacia_count)