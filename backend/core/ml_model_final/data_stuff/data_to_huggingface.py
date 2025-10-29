from huggingface_hub import HfApi
from pathlib import Path

HF_USERNAME = "duartepcruz"
REPO_NAME = "acacia_dataset"
SCRIPT_DIR = Path(__file__).parent
DATASET_DIR = SCRIPT_DIR / "reorganized_dataset" # Your dataset folder
README_TEXT = """
---
dataset_info:
  pretty_name: Acacia Dataset
  task_categories:
    - image-segmentation
  license: mit
  annotations_creators:
    - expert-generated
  language:
    - en
---

# 🌿 Acacia Dataset

This dataset contains images of acacia trees and non-acacias, along with corresponding segmentation masks.

## Structure

- `images/test`, `images/val`: RGB images  
- `labels/test`, `labels/val`: segmentation masks  

**Use case:** Semantic segmentation / vegetation classification tasks.
"""

api = HfApi()
repo_id = f"{HF_USERNAME}/{REPO_NAME}"

def create_dataset_repo(private: bool):
    """Create dataset repo if it doesn't exist."""
    try:
        api.create_repo(repo_id=repo_id, repo_type="dataset", private=private)
        print(f"✅ Dataset repo created: {repo_id}")
    except Exception as e:
        print(f"⚠️ Repo might already exist: {e}")
        
        
def upload_dataset():
    """Upload all files in dataset_dir to HF Hub in one commit."""
    api.upload_folder(
        folder_path=str(DATASET_DIR),
        repo_id=repo_id,
        repo_type="dataset",
        path_in_repo="",  # root of the repo
        token=True
    )
    print(f"✅ Entire dataset uploaded in a single commit to: https://huggingface.co/datasets/{repo_id}")
    
def upload_readme(text: str):
    """Create and upload README.md to HF Hub."""
    readme_path = Path("tmp/README.md")
    with open(readme_path, "w") as f:
        f.write(text)

    api.upload_file(
        path_or_fileobj=str(readme_path),
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="dataset",
        token=True
    )
    print("✅ Uploaded README.md")
    
def main():
    print(f"🚀 Uploading dataset to: https://huggingface.co/datasets/{repo_id}")


    # 1️⃣ Create the repo if it doesn't exist
    create_dataset_repo(private = False)

    # 2️⃣ Upload dataset files
    upload_dataset()

    # 3️⃣ Upload README
    upload_readme(README_TEXT)

    print(f"\n🎉 Done! Dataset is available at: https://huggingface.co/datasets/{repo_id}")

# ---------------- Run Script ---------------- #
if __name__ == "__main__":
    main()