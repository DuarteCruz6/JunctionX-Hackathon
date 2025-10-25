import os
import shutil
import random
import glob

# --- Configuration ---
# Adjust these paths and settings as needed.

# 1. The main directory of your current dataset
SOURCE_DIR = 'C:/Users/danim/OneDrive/Ambiente de Trabalho/JunctionX-Hackathon/backend/core/ml_model_new/dataset'

# 2. The destination directory for the shuffled dataset (will be created)
DEST_DIR = 'reorganized_dataset'

# 3. The ratio for the validation set (e.g., 0.2 means 20% for validation)
VAL_SPLIT_RATIO = 0.2

# 4. A random seed for reproducible shuffling
RANDOM_SEED = 42

# --- End of Configuration ---


def main():
    """
    Main function to run the data reorganization.
    """
    print("🚀 Starting dataset reorganization...")
    random.seed(RANDOM_SEED)

    # Define source paths
    source_img_dir = os.path.join(SOURCE_DIR, 'images')
    source_lbl_dir = os.path.join(SOURCE_DIR, 'labels')

    if not os.path.isdir(source_img_dir):
        print(f"❌ Error: Source directory not found: '{source_img_dir}'")
        print("Please make sure the SOURCE_DIR variable is set correctly.")
        return

    # --- 1. Gather all existing image-label pairs ---
    print("🔍 Finding all image-label pairs...")
    all_file_pairs = []
    
    # Search for images in both 'test' and 'val' subdirectories
    image_paths = glob.glob(os.path.join(source_img_dir, '**', '*.*'), recursive=True)
    
    for img_path in image_paths:
        # Construct the corresponding label path
        # It replaces 'images' with 'labels' in the path string
        try:
            lbl_path = img_path.replace(source_img_dir, source_lbl_dir, 1)
        except ValueError:
            print(f"⚠️ Warning: Could not derive label path for {img_path}")
            continue

        # Ensure the corresponding label file exists before adding the pair
        if os.path.exists(lbl_path):
            all_file_pairs.append((img_path, lbl_path))
        else:
            print(f"⚠️ Warning: Missing label for image '{os.path.basename(img_path)}'. Skipping.")

    total_files = len(all_file_pairs)
    print(f"✅ Found {total_files} complete image-label pairs.")
    if total_files == 0:
        print("❌ Error: No files found. Please check your SOURCE_DIR path. Exiting.")
        return

    # --- 2. Shuffle the data ---
    print("\n🔀 Shuffling data to mix all samples...")
    random.shuffle(all_file_pairs)

    # --- 3. Split into new test and validation sets ---
    split_index = int(total_files * (1 - VAL_SPLIT_RATIO))
    test_pairs = all_file_pairs[:split_index]
    val_pairs = all_file_pairs[split_index:]
    print(f"📊 Splitting data: {len(test_pairs)} for test, {len(val_pairs)} for validation.")

    # --- 4. Create destination directories ---
    print(f"📁 Creating destination directories in '{DEST_DIR}'...")
    dest_img_test_path = os.path.join(DEST_DIR, 'images', 'test')
    dest_lbl_test_path = os.path.join(DEST_DIR, 'labels', 'test')
    dest_img_val_path = os.path.join(DEST_DIR, 'images', 'val')
    dest_lbl_val_path = os.path.join(DEST_DIR, 'labels', 'val')

    for path in [dest_img_test_path, dest_lbl_test_path, dest_img_val_path, dest_lbl_val_path]:
        os.makedirs(path, exist_ok=True)
        
    # --- 5. Copy files to the new shuffled structure ---
    def copy_files(pairs, dest_img, dest_lbl, set_name):
        print(f"\n📄 Copying {set_name} files...")
        if not pairs:
            print(f"No files to copy for the {set_name} set.")
            return
            
        for img_src, lbl_src in pairs:
            # Get just the filename to build the destination path
            filename = os.path.basename(img_src)
            shutil.copy(img_src, os.path.join(dest_img, filename))
            shutil.copy(lbl_src, os.path.join(dest_lbl, filename))
        print(f"Copied {len(pairs)} pairs to the '{set_name}' set.")

    copy_files(test_pairs, dest_img_test_path, dest_lbl_test_path, "test")
    copy_files(val_pairs, dest_img_val_path, dest_lbl_val_path, "validation")

    print("\n✨ Reorganization complete! ✨")
    print("\nFinal structure:")
    print(f"  - Test Images: {len(os.listdir(dest_img_test_path))} files in '{dest_img_test_path}'")
    print(f"  - Test Labels: {len(os.listdir(dest_lbl_test_path))} files in '{dest_lbl_test_path}'")
    print(f"  - Val Images:  {len(os.listdir(dest_img_val_path))} files in '{dest_img_val_path}'")
    print(f"  - Val Labels:  {len(os.listdir(dest_lbl_val_path))} files in '{dest_lbl_val_path}'")

if __name__ == '__main__':
    main()