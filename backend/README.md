# Forest Guardian Backend

🌲 **Acacia Detection & Mapping API** for Forest Monitoring

## Overview

This backend provides a FastAPI-based REST API for detecting and mapping invasive Acacia trees in forest images using YOLOv8-seg machine learning models.

## Features

- 🖼️ **Image Upload**: Support for JPEG, PNG, TIFF images up to 50MB
- 🤖 **ML Inference**: YOLOv8-seg model integration via Hugging Face API
- 🔐 **Authentication**: Firebase Auth integration
- ☁️ **Cloud Storage**: AWS S3 for image and result storage
- 📊 **Database**: Firebase Firestore for metadata storage
- ⚡ **Async Processing**: Celery + Redis for background tasks
- 📈 **Analytics**: Detailed detection statistics and coverage metrics

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name

# Hugging Face Configuration
HF_API_TOKEN=your_huggingface_token
HF_MODEL_NAME=your-username/forest-guardian-yolov8-seg

# Firebase Configuration
FIREBASE_CREDENTIALS=junctionx-hackathon-firebase-adminsdk-fbsvc-b9ad2c64f0.json

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Start Services

```bash
# Start Redis server (in separate terminal)
redis-server

# Start all backend services
./start_backend.sh
```

Or manually:
```bash
# Start Celery worker
celery -A core.tasks.celery_tasks.celery_app worker --loglevel=info &

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Test the API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## API Endpoints

### Authentication
All endpoints require Firebase authentication via `Authorization: Bearer <token>` header.

### Upload Image
```http
POST /api/v1/upload
Content-Type: multipart/form-data
Authorization: Bearer <firebase_token>

Body: image file
```

**Response:**
```json
{
  "success": true,
  "image_id": "uuid-string",
  "s3_url": "https://s3.amazonaws.com/...",
  "message": "Image uploaded successfully"
}
```

### Run Prediction
```http
POST /api/v1/predict/{image_id}
Authorization: Bearer <firebase_token>
```

**Response:**
```json
{
  "success": true,
  "image_id": "uuid-string",
  "status": "processed",
  "results": {
    "detections": [
      {
        "label": "acacia",
        "confidence": 0.85,
        "bbox": {"x1": 100, "y1": 200, "x2": 300, "y3": 400},
        "mask": "base64-encoded-mask",
        "area": 40000
      }
    ],
    "num_detections": 1,
    "average_confidence": 0.85,
    "coverage_percentage": 2.5
  },
  "results_url": "https://s3.amazonaws.com/..."
}
```

### Get Results
```http
GET /api/v1/predict/{image_id}/results
Authorization: Bearer <firebase_token>
```

### Get Statistics
```http
GET /api/v1/predict/{image_id}/stats
Authorization: Bearer <firebase_token>
```

## Project Structure

```
backend/
├── app/
│   ├── controllers/          # API endpoints
│   │   ├── upload.py        # Image upload endpoints
│   │   └── predict.py       # ML prediction endpoints
│   ├── middlewares/         # Authentication & middleware
│   │   └── auth.py          # Firebase auth middleware
│   ├── utils/               # Utility functions
│   │   ├── s3_storage.py    # AWS S3 integration
│   │   ├── firebase_db.py   # Firestore integration
│   │   └── ml_inference.py  # Hugging Face ML integration
│   └── main.py              # FastAPI application
├── core/
│   ├── ml_model/            # ML model training & utilities
│   │   ├── train.py         # YOLOv8 training script
│   │   ├── utils.py         # ML utilities
│   │   └── preprocess.py    # Data preprocessing
│   └── tasks/               # Celery background tasks
│       └── celery_tasks.py  # Async processing tasks
├── requirements.txt         # Python dependencies
├── start_backend.sh         # Startup script
└── test_backend.py         # Structure test script
```

## ML Model Integration

### Training a Custom Model

```bash
# Prepare dataset
python core/ml_model/preprocess.py --input_dir data/raw --output_dir data/processed

# Train model
python core/ml_model/train.py

# Upload to Hugging Face
python -c "
from core.ml_model.train import AcaciaModelTrainer
trainer = AcaciaModelTrainer()
trainer.upload_to_huggingface('your-username/acacia-detection', 'your_hf_token')
"
```

### Using Pre-trained Model

The system is configured to use a Hugging Face hosted model. Update `HF_MODEL_NAME` in your `.env` file:

```env
HF_MODEL_NAME=your-username/forest-guardian-yolov8-seg
```

## Development

### Running Tests

```bash
# Test backend structure
python test_backend.py

# Test specific components
python -c "from app.utils.ml_inference import test_ml_pipeline; test_ml_pipeline()"
```

### Docker Support

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Debugging

Enable debug mode in `.env`:
```env
DEBUG=True
LOG_LEVEL=DEBUG
```

## Hackathon Notes

### For JunctionX Hackathon:

1. **Quick Demo Setup**:
   - Use the provided Firebase credentials
   - Set up a simple S3 bucket for testing
   - Use a pre-trained YOLOv8 model on Hugging Face

2. **Key Features to Highlight**:
   - Real-time Acacia detection
   - Confidence scoring
   - Coverage percentage calculation
   - Scalable async processing

3. **Performance Optimizations**:
   - Image resizing for faster processing
   - Confidence threshold tuning
   - Batch processing capabilities

## Troubleshooting

### Common Issues

1. **Firebase Auth Errors**:
   - Verify `FIREBASE_CREDENTIALS` file exists
   - Check Firebase project configuration

2. **S3 Upload Failures**:
   - Verify AWS credentials
   - Check S3 bucket permissions

3. **ML Model Errors**:
   - Verify Hugging Face token
   - Check model name and availability

4. **Redis Connection Issues**:
   - Ensure Redis server is running
   - Check `REDIS_URL` configuration

### Logs

```bash
# View Celery logs
celery -A core.tasks.celery_tasks.celery_app worker --loglevel=debug

# View FastAPI logs
uvicorn app.main:app --log-level debug
```

## License

MIT License - see LICENSE file for details.

---

🌲 **Forest Guardian** - Protecting forests from invasive species through AI-powered detection and mapping.
