import os
from dotenv import load_dotenv
from ultralytics import YOLO
from huggingface_hub import login, snapshot_download
from huggingface_hub import HfApi, HfFolder, Repository

# --- 1. Load environment variables ---
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

hf_token = os.environ.get("HF_API_TOKEN")
hub_model_id = os.environ.get("HUGGINGFACE_MODEL_ID")

if not hf_token:
    raise ValueError("❌ Hugging Face token (HF_API_TOKEN) not found in .env.")
if not hub_model_id:
    raise ValueError("❌ Model ID (HUGGINGFACE_MODEL_ID) not found in .env.")

# --- 2. Authenticate ---
print("🔐 Logging in to Hugging Face Hub...")
login(token=hf_token)

# --- 3. Export model ---
api = HfApi()
api.upload_file(
    path_or_fileobj="runs/segment/acacia_seg_model8/weights/best.pt",
    path_in_repo="best.pt",
    repo_id=hub_model_id,
    token=hf_token
)