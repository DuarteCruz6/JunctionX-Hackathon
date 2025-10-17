# TheThreeMusketers
Repository containing the code for JunctionX Lisbon Hackathon.

---

# Forest Guardian: Acacia Detection & Mapping

Realtime detection and mapping of invasive Acacia trees in forests using YOLOv8-seg.

## Project Description

Forest Guardian is a hackathon project that detects invasive Acacia trees in forest images using a fine-tuned YOLOv8-seg model.

Users can upload satellite or drone images through a web interface, and the system returns segmentation masks highlighting Acacia patches, along with confidence scores.

The goal is to provide a scalable, fast, and interactive tool for forest monitoring and environmental management.

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
