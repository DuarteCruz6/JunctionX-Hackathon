from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import time
import logging
from dotenv import load_dotenv

# Setup logging
import os
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Configure logging
log_format = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')

# Main application log file (INFO and above)
main_handler = RotatingFileHandler(
    os.path.join(logs_dir, 'app.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
main_handler.setLevel(logging.INFO)
main_handler.setFormatter(log_format)

# Error log file (ERROR and above)
error_handler = RotatingFileHandler(
    os.path.join(logs_dir, 'error.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(log_format)

# Debug log file (DEBUG and above)
debug_handler = RotatingFileHandler(
    os.path.join(logs_dir, 'debug.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
debug_handler.setLevel(logging.DEBUG)
debug_handler.setFormatter(log_format)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(log_format)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.addHandler(main_handler)
root_logger.addHandler(error_handler)
root_logger.addHandler(debug_handler)
root_logger.addHandler(console_handler)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import our modules
from app.controllers import upload, predict, reports
from app.middlewares.auth import verify_firebase_token

app = FastAPI(
    title="Forest Guardian API",
    description="Acacia Detection & Mapping API for Forest Monitoring",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(predict.router, prefix="/api/v1", tags=["predict"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])

@app.get("/")
async def root():
    logger.debug("Root endpoint accessed")
    return {"message": "Forest Guardian API - Acacia Detection System"}

@app.get("/health")
async def health_check():
    logger.debug("Health check endpoint accessed")
    return {"status": "healthy", "service": "forest-guardian-api"}

if __name__ == "__main__":
    logger.info("Starting Forest Guardian API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)