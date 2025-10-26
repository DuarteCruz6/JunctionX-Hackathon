import os
from pathlib import Path

# --- CONFIGURATION ---
# IMPORTANT: Please set the two folder paths below.

# Folder 1: The folder where files will be deleted FROM.
# Folder 2: The reference folder. Files in here are used for the check.
# Example for Windows: "C:\\Users\\YourName\\Desktop\\Images_To_Clean"
# Example for macOS/Linux: "/home/yourname/pictures/to_clean"
SCRIPT_DIR = Path(__file__).parent
folder_to_check_0 = SCRIPT_DIR / "data/train/images_acacias"
reference_folder_0 = SCRIPT_DIR / "data/train/masks_acacias"
folder_to_check_1 = SCRIPT_DIR / "data/train/images_not_acacias"
reference_folder_1 = SCRIPT_DIR / "data/train/masks_not_acacias"

# --- SAFETY SWITCH ---
# Set to False to actually delete files.
# When True, the script will only print what it WOULD delete.
# ALWAYS RUN WITH dry_run = True FIRST!
dry_run = True

# --- SCRIPT LOGIC (No need to edit below this line) ---

def sync_and_delete_files(folder_to_clean, reference_folder):
    """
    Deletes files from folder_to_clean if a file with the same name
    does not exist in reference_folder.
    """
    print("--- File Sync Deletion Script ---")
    if dry_run:
        print("--- RUNNING IN DRY RUN MODE (no files will be deleted) ---")
    else:
        print("--- WARNING: SCRIPT IS LIVE (files will be deleted) ---")
    print("-" * 35)

    # 1. Validate paths
    if not os.path.isdir(folder_to_clean):
        print(f"Error: The folder to clean '{folder_to_clean}' does not exist.")
        return
    if not os.path.isdir(reference_folder):
        print(f"Error: The reference folder '{reference_folder}' does not exist.")
        return

    # 2. Get all filenames from the reference folder and store them in a set for fast lookup.
    try:
        reference_files = set(os.listdir(reference_folder))
        print(f"Found {len(reference_files)} files in the reference folder.")
    except OSError as e:
        print(f"Error reading reference folder: {e}")
        return

    # 3. Iterate through the folder to be cleaned.
    files_to_delete = []
    files_to_keep = []

    print(f"\nScanning '{os.path.basename(folder_to_clean)}'...")
    for filename in os.listdir(folder_to_clean):
        full_path = os.path.join(folder_to_clean, filename)

        # Ensure we are only checking files, not subdirectories
        if os.path.isfile(full_path):
            # 4. Check if the filename does NOT exist in the reference set.
            if filename not in reference_files:
                files_to_delete.append(filename)
            else:
                files_to_keep.append(filename)

    # 5. Report and execute deletions
    print("-" * 35)
    print(f"Scan complete. Found {len(files_to_keep)} matching files to keep.")
    print(f"Found {len(files_to_delete)} non-matching files to delete.")
    print("-" * 35)

    if not files_to_delete:
        print("Nothing to delete. Folders are in sync.")
    else:
        for filename in files_to_delete:
            file_path_to_delete = os.path.join(folder_to_clean, filename)
            action_prefix = "[Dry Run] Would delete:" if dry_run else "DELETING:"
            print(f"{action_prefix} {file_path_to_delete}")

            if not dry_run:
                try:
                    os.remove(file_path_to_delete)
                except OSError as e:
                    print(f"  -> ERROR: Could not delete file. Reason: {e}")

    


if __name__ == "__main__":
    sync_and_delete_files(folder_to_check_0, reference_folder_0)
    sync_and_delete_files(folder_to_check_1, reference_folder_1)
    sync_and_delete_files(reference_folder_0, folder_to_check_0)
    sync_and_delete_files(reference_folder_1, folder_to_check_1)
    print("\n--- Script finished. ---")