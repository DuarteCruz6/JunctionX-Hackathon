import os
from ultralytics import YOLO
from huggingface_hub import login

# --- 1. Get variables from Space Settings ---
# These are loaded automatically from your Space's Secrets and Variables
hf_token = os.environ.get("HF_API_TOKEN")
hub_model_id = os.environ.get("HUGGINGFACE_MODEL_ID")

if not hf_token:
    raise ValueError("Hugging Face token (HF_API_TOKEN) not found. Please set it in your Space Secrets.")
if not hub_model_id:
    raise ValueError("Model ID (HUGGINGFACE_MODEL_ID) not found. Please set it in your Space Variables.")

# --- 2. Authenticate ---
print("Logging in to Hugging Face Hub...")
login(token=hf_token)

# --- 3. Clone dataset ---
# Replace with your dataset repo
dataset_repo_url = "https://huggingface.co/datasets/duartepcruz/acacia-dataset"
local_dataset_path = "cloned-dataset"
os.system(f"git clone {dataset_repo_url} {local_dataset_path}")
data_yaml_path = os.path.join(local_dataset_path, "data.yaml")

# --- 4. Load and Train ---
model = YOLO("yolov8n-seg.pt")
print(f"Starting training with dataset: {data_yaml_path}")
results = model.train(
    data=data_yaml_path,
    epochs=100,
    imgsz=640,
    name="acacia_seg_model"
)
print("Training finished.")

# --- 5. Export and Upload ---
print(f"Exporting model to Hub repo: {hub_model_id}...")
best_model_path = os.path.join("runs/segment/acacia_seg_model", "weights/best.pt")
model = YOLO(best_model_path)

# Use the HUB_MODEL_ID from your Space Variables
model.export(
    format="huggingface",
    push=True,
    hub_model_id=hub_model_id
)

print(f"Successfully exported model and demo!")
print(f"Visit your new Space at: https://huggingface.co/spaces/{hub_model_id}")