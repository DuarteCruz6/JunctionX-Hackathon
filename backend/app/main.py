from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our modules
from app.controllers import upload, predict
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

@app.get("/")
async def root():
    return {"message": "Forest Guardian API - Acacia Detection System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "forest-guardian-api"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)