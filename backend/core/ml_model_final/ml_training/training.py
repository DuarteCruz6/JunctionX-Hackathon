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

# --- 3. Download dataset from Hugging Face ---
DATASET_REPO_ID = "duartepcruz/acacia_dataset"
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, ".."))  # ml_model_final
local_dataset_path = os.path.join(project_root, "data_stuff", "reorganized_dataset")

if not os.path.exists(local_dataset_path):
    print(f"⬇️ Downloading dataset from '{DATASET_REPO_ID}'...")
    local_dataset_path = snapshot_download(
        repo_id=DATASET_REPO_ID,
        repo_type="dataset",
        token=hf_token,
        local_dir=local_dataset_path
    )
else:
    print(f"📁 Dataset already exists locally at '{local_dataset_path}'. Skipping download.")

# Ensure data.yaml exists
data_yaml_path = os.path.join(local_dataset_path, "data.yaml")
if not os.path.exists(data_yaml_path):
    raise FileNotFoundError(f"❌ data.yaml not found in dataset: {data_yaml_path}")

# --- 4. Train YOLO model ---
print(f"🚀 Starting YOLO training using dataset: {data_yaml_path}")
model = YOLO("yolov8n-seg.pt")  # segmentation model

results = model.train(
    data=data_yaml_path,
    epochs=1,
    imgsz=640,
    name="acacia_seg_model"
)

print("✅ Training finished!")

# --- 5. Export best model and upload to Hugging Face Hub ---
best_model_path = os.path.join(results.save_dir, 'weights', 'best.pt')
if not os.path.exists(best_model_path):
    raise FileNotFoundError("❌ Could not find best.pt file after training.")

print(f"📦 Loading best model from: {best_model_path}")
model = YOLO(best_model_path)

print(f"🚀 Exporting and pushing model to Hugging Face Hub repo: {hub_model_id} ...")
try: model.export(
    format="huggingface",
    hub_model_id=hub_model_id,
    token=hf_token
)
except:
    api = HfApi()
    api.upload_file(
        path_or_fileobj="runs/segment/acacia_seg_model8/weights/best.pt",
        path_in_repo="best.pt",
        repo_id=hub_model_id,
        token=hf_token
    )

print("🎉 Successfully exported and pushed model to Hugging Face Hub!")
print(f"👉 View it here: https://huggingface.co/{hub_model_id}")
