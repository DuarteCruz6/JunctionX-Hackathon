import os
import shutil
import random
from pathlib import Path
import yaml

# --- Configuration ---
SCRIPT_DIR = Path(__file__).parent
SOURCE_DIR = SCRIPT_DIR / "data/train"

DEST_DIR = SCRIPT_DIR / "reorganized_dataset"
VAL_SPLIT_RATIO = 0.2
RANDOM_SEED = 42

# Mapping of image folders to mask folders
CLASS_FOLDERS = {
    'acacias': ('images_acacias', 'masks_acacias')
}

def create_data_yaml(dest_dir: Path, class_names):
    """Create a YOLO-compatible data.yaml file in the given directory."""
    yaml_path = dest_dir / "data.yaml"

    yaml_content = {
        'path': 'TODO: UPDATE THIS VALUE',
        'train': 'images/train',
        'val': 'images/val',
        'nc': len(class_names),
        'names': {i: name for i, name in enumerate(class_names)},
    }

    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    print(f"🧾 Created data.yaml at: {yaml_path}")
    print(f"📄 Contents:\n{yaml.dump(yaml_content)}")


def main():
    print("🚀 Starting dataset reorganization...")
    random.seed(RANDOM_SEED)

    all_file_pairs = []

    # --- 1. Gather all image-label pairs from all classes ---
    print("🔍 Finding all image-label pairs...")
    for cls, (img_folder, mask_folder) in CLASS_FOLDERS.items():
        img_dir = SOURCE_DIR / img_folder
        mask_dir = SOURCE_DIR / mask_folder

        if not img_dir.is_dir() or not mask_dir.is_dir():
            print(f"❌ Error: Missing folder for class '{cls}'")
            continue

        image_paths = list(img_dir.glob('*.*'))
        for img_path in image_paths:
            mask_path = mask_dir / img_path.name
            if mask_path.exists():
                all_file_pairs.append((str(img_path), str(mask_path)))
            else:
                print(f"⚠️ Warning: Missing mask for '{img_path.name}' in class '{cls}'")

    total_files = len(all_file_pairs)
    print(f"✅ Found {total_files} complete image-mask pairs.")
    if total_files == 0:
        print("❌ Error: No files found. Exiting.")
        return

    # --- 2. Shuffle the data ---
    print("\n🔀 Shuffling data...")
    random.shuffle(all_file_pairs)

    # --- 3. Split into test and validation ---
    split_index = int(total_files * (1 - VAL_SPLIT_RATIO))
    test_pairs = all_file_pairs[:split_index]
    val_pairs = all_file_pairs[split_index:]
    print(f"📊 Splitting data: {len(test_pairs)} test, {len(val_pairs)} validation")

    # --- 4. Create destination directories ---
    dest_img_test_path = Path(DEST_DIR) / 'images' / 'train'
    dest_lbl_test_path = Path(DEST_DIR) / 'labels' / 'train'
    dest_img_val_path = Path(DEST_DIR) / 'images' / 'val'
    dest_lbl_val_path = Path(DEST_DIR) / 'labels' / 'val'

    for path in [dest_img_test_path, dest_lbl_test_path, dest_img_val_path, dest_lbl_val_path]:
        path.mkdir(parents=True, exist_ok=True)

    # --- 5. Copy files ---
    def copy_files(pairs, dest_img, dest_lbl, set_name):
        print(f"\n📄 Copying {set_name} files...")
        for img_src, lbl_src in pairs:
            shutil.copy(img_src, dest_img / Path(img_src).name)
            shutil.copy(lbl_src, dest_lbl / Path(lbl_src).name)
        print(f"✅ Copied {len(pairs)} pairs to '{set_name}'")

    copy_files(test_pairs, dest_img_test_path, dest_lbl_test_path, "train")
    copy_files(val_pairs, dest_img_val_path, dest_lbl_val_path, "validation")

    print("\n✨ Reorganization complete! ✨")
    print(f"Train Images: {len(list(dest_img_test_path.iterdir()))}")
    print(f"Train Labels: {len(list(dest_lbl_test_path.iterdir()))}")
    print(f"Val Images:  {len(list(dest_img_val_path.iterdir()))}")
    print(f"Val Labels:  {len(list(dest_lbl_val_path.iterdir()))}")
    
    # --- 6. Create data.yaml ---
    create_data_yaml(DEST_DIR, class_names=list(CLASS_FOLDERS.keys()))


if __name__ == '__main__':
    main()
