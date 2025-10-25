import os
from dotenv import load_dotenv
from ultralytics import YOLO
from huggingface_hub import login

# --- NEW: Load environment variables from .env file ---
# This makes the script work locally by reading your .env file.
# The path is constructed to find the .env file in the `backend` folder,
# which is three directories up from this script.
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# --- 1. Get variables from environment ---
# Now os.environ.get() can read the variables loaded from your .env file.
hf_token = os.environ.get("HF_API_TOKEN")
hub_model_id = os.environ.get("HUGGINGFACE_MODEL_ID")

# Check if variables were loaded correctly
if not hf_token:
    raise ValueError("Hugging Face token (HF_API_TOKEN) not found. Please set it in your .env file.")
if not hub_model_id:
    raise ValueError("Model ID (HUGGINGFACE_MODEL_ID) not found. Please set it in your .env file.")

# --- 2. Authenticate ---
print("Logging in to Hugging Face Hub...")
login(token=hf_token)

# --- 3. Clone dataset ---
# Replace with your dataset repo if needed
dataset_repo_url = "https://huggingface.co/datasets/duartepcruz/acacia-dataset"
script_dir = os.path.dirname(os.path.abspath(__file__))
local_dataset_path = os.path.join(script_dir, "reorganized_dataset")

# Check if dataset already exists to avoid re-cloning
if not os.path.exists(local_dataset_path):
    print(f"Cloning dataset from {dataset_repo_url}...")
    os.system(f'git clone {dataset_repo_url} "{local_dataset_path}"')

else:
    print(f"Dataset directory '{local_dataset_path}' already exists. Skipping clone.")

data_yaml_path = os.path.join(local_dataset_path, "data.yaml")

# --- 4. Load and Train ---
model = YOLO("yolov8n-seg.pt")  # Load pretrained segmentation model
print(f"Starting training with dataset: {data_yaml_path}")

results = model.train(
    data=data_yaml_path,
    epochs=1,
    imgsz=640,
    name="acacia_seg_model"
)
print("Training finished.")

# --- 5. Export and Upload ---
# The path to the best model is available in the results object
best_model_path = os.path.join(results.save_dir, 'weights', 'best.pt')
print(f"Loading best model from: {best_model_path}")

# Load the best performing model from training
model = YOLO(best_model_path)

print(f"Exporting model to Hub repo: {hub_model_id}...")
# The 'huggingface' format automatically handles creating the model card and pushing
model.export(
    format="huggingface",
    hub_model_id=hub_model_id
)

print("Successfully exported model and demo!")
print(f"Visit your new model repo at: https://huggingface.co/{hub_model_id}")