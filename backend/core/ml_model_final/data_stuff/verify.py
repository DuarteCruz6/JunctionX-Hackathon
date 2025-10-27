from pathlib import Path
from PIL import Image
import numpy as np

# --- Paths ---
images_train_path = Path("/Users/duartecruz/Desktop/junctionX hackathon/TheThreeMusketers/backend/core/ml_model_final/data_stuff/reorganized_dataset/images/train")
labels_train_path = Path("/Users/duartecruz/Desktop/junctionX hackathon/TheThreeMusketers/backend/core/ml_model_final/data_stuff/reorganized_dataset/labels/train")

# --- Counters ---
valid_masks = 0
invalid_masks = 0
masks_missing_image = 0
masks_corrected = 0

for mask_file in labels_train_path.glob("*.png"):
    mask_name = mask_file.stem
    corresponding_image = images_train_path / f"{mask_name}.png"

    if not corresponding_image.exists():
        masks_missing_image += 1
        continue

    # Open mask
    mask = Image.open(mask_file)

    # Convert RGBA or RGB to L (8-bit grayscale)
    if mask.mode != "L":
        mask = mask.convert("L")
        mask.save(mask_file)
        masks_corrected += 1

    mask_array = np.array(mask)
    unique_vals = np.unique(mask_array)

    # Check if values are only 0 and 1
    if not all(v in [0, 1] for v in unique_vals):
        invalid_masks += 1
        print(f"⚠️ Invalid mask values in: {mask_file} -> {unique_vals}")
    else:
        valid_masks += 1

print("\n✅ Validation Summary:")
print(f"Valid masks: {valid_masks}")
print(f"Invalid masks: {invalid_masks}")
print(f"Masks without corresponding image: {masks_missing_image}")
print(f"Masks auto-converted to 8-bit grayscale: {masks_corrected}")
