# TheThreeMusketers
Repository containing the code for JunctionX Lisbon Hackathon.

---

# Forest Guardian: Acacia Detection & Mapping

Realtime detection and mapping of invasive Acacia trees in forests using YOLOv8-seg.

## Project Description

Forest Guardian is a hackathon project that detects invasive Acacia trees in forest images using a fine-tuned YOLOv8-seg model.

Users can upload satellite or drone images through a web interface, and the system returns segmentation masks highlighting Acacia patches, along with confidence scores.

The goal is to provide a scalable, fast, and interactive tool for forest monitoring and environmental management.

## Prerequisites

Before running the project, ensure you have the following installed:

### Required Software
- **Docker & Docker Compose** (recommended for quick setup)
- **Node.js** (v16 or higher) - for frontend development
- **Python** (v3.8 or higher) - for backend development
- **Redis** - for async task processing
- **Git** - for version control

### Required Accounts & Services
- **AWS Account** - for S3 storage
- **Hugging Face Account** - for ML model hosting
- **Firebase Project** - for authentication and database

### Required API Keys
- AWS Access Key ID & Secret Access Key
- Hugging Face API Token
- Firebase Service Account Key

## Quick Start (Docker - Recommended)

The easiest way to run the project is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd TheThreeMusketers

# Set up environment variables
./setup.sh
# Edit backend/.env with your actual API keys and credentials

# Start all services with Docker Compose
./start_docker.sh
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Redis**: localhost:6379

## Manual Setup (Development)

If you prefer to run services manually for development:

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
./setup.sh
# Edit backend/.env with your actual credentials

# Start Redis server (in separate terminal)
redis-server

# Start backend services
./start_backend.sh
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at http://localhost:3000

### 3. Environment Configuration

Create a `.env` file in the project root with the following variables:

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
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## How to Run the Project

### Option 1: Docker Compose (Easiest)

```bash
# Start all services
docker-compose up --build

# Or use the provided script
./start_docker.sh
```

### Option 2: Manual Development Setup

1. **Start Redis**:
   ```bash
   redis-server
   ```

2. **Start Backend** (in backend directory):
   ```bash
   ./start_backend.sh
   ```

3. **Start Frontend** (in frontend directory):
   ```bash
   npm start
   ```

### Option 3: Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production mode
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Testing the Setup

1. **Health Check**: Visit http://localhost:8000/health
2. **API Documentation**: Visit http://localhost:8000/docs
3. **Frontend**: Visit http://localhost:3000
4. **Upload Test**: Use the web interface to upload an image and test the detection pipeline

## Troubleshooting

### Common Issues

1. **Redis Connection Error**:
   ```bash
   # Start Redis server
   redis-server
   
   # Or with Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Firebase Authentication Error**:
   - Ensure `FIREBASE_CREDENTIALS` file exists
   - Check Firebase project configuration
   - Verify service account permissions

3. **S3 Upload Failures**:
   - Verify AWS credentials in `.env`
   - Check S3 bucket permissions
   - Ensure bucket exists and is accessible

4. **ML Model Errors**:
   - Verify Hugging Face token
   - Check model name and availability
   - Ensure model is public or you have access

5. **Port Already in Use**:
   ```bash
   # Kill processes using ports
   lsof -ti:3000 | xargs kill -9  # Frontend
   lsof -ti:8000 | xargs kill -9  # Backend
   lsof -ti:6379 | xargs kill -9  # Redis
   ```

### Development Tips

- Use `docker-compose logs -f` to view all service logs
- Check `backend/logs/` for detailed error logs
- Use browser developer tools to debug frontend issues
- Test API endpoints with curl or Postman

### Getting Help

- Check the backend README for detailed API documentation
- Review Docker Compose logs for service-specific errors
- Ensure all environment variables are properly set

## Project Structure

```
TheThreeMusketers/
├── backend/                 # FastAPI backend
│   ├── app/                # Main application code
│   │   ├── controllers/    # API endpoints
│   │   ├── middlewares/    # Authentication & middleware
│   │   └── utils/          # Utility functions
│   ├── core/               # Core functionality
│   │   ├── ml_model/       # ML model training
│   │   └── tasks/          # Celery background tasks
│   ├── requirements.txt    # Python dependencies
│   └── start_backend.sh    # Backend startup script
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile.dev      # Development Dockerfile
├── docker-compose.yml      # Docker services configuration
├── setup.sh               # Environment setup script
└── start_docker.sh        # Docker startup script
```

## Architecture Overview

### Frontend:
- React + Tailwind
- React Query for async calls
- Displays uploaded images and segmentation masks

### Backend:
- Python + FastAPI
- Firebase Auth for authentication and Firebase Firestore for metadata (might be updated to PostgreSQL + SQLAlchemy)
- AWS S3 for image storage
- Celery + Redis for asynchronous processing

### ML Model:
- YOLOv8-seg (Ultralytics), fine-tuned on Acacia dataset
- Hosted on Hugging Face
- Backend communicates via Hugging Face API

## Demo / Data Flow

0. User authenticates via the frontend and the backend does the connection to Firebase Auth.
1. User uploads an image via the frontend.
2. Backend stores the image in S3 and records metadata in Firebase Firestore (might change to PostgreSQL + SQLAlchemy).
3. Image is sent to YOLOv8-seg model hosted on Hugging Face.
4. Model returns segmentation mask and confidence scores.
5. Backend saves the results to S3.
6. Frontend fetches results and displays segmented Acacia regions interactively.

## ML Pipeline

[Satellite / Drone / LiDAR Data] 
       │
       │  (preprocessing)
       ▼
+---------------------------+
|   Data Alignment & Fusion |
|   - Resample Sentinel-2  |
|   - Process LiDAR/DEM    |
|   - Combine spectral +   |
|     structural channels  |
+---------------------------+
       │
       │  (ML Inference)
       ▼
+---------------------------+
|    YOLOv8-Seg Model       |
|   - Input: preprocessed   |
|     imagery               |
|   - Output: segmentation  |
|     masks & confidence    |
+---------------------------+
       │
       │  (Postprocessing)
       ▼
+---------------------------+
|  Geo-referenced Outputs   |
|   - Masked imagery        |
|   - Coverage stats        |
|   - GeoJSON polygons      |
+---------------------------+
       │
       │  (Temporal Tracking)
       ▼
+---------------------------+
|   Time Series Analysis    |
|   - Compare with past     |
|     images                |
|   - Detect spread/growth  |
|   - Update prediction map |
+---------------------------+
       │
       ▼
[Frontend / Dashboard / Map Visualization]
- Interactive maps (Leaflet / Mapbox)
- Confidence overlays
- User queries by date & region


## Tech Stack

- **Frontend:** React, Tailwind, React Query  
- **Backend:** Python, FastAPI, Firebase Auth, Firebase Firestore (might change to PostgreSQL + SQLAlchemy), AWS S3, Celery + Redis for async tasks
- **ML Model:** YOLOv8-seg (Ultralytics), Hugging Face API

## Results
- Add results here

## Future Improvements:
- Interactive map overlays with Leaflet or Mapbox
- User history dashboard and analytics
- Change Firebase Firestore to PostgreSQL + SQLAlchemy
- Add future improvements here

## License
MIT License
