from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.middlewares.auth import verify_firebase_token
from app.utils.s3_storage import upload_to_s3
from app.utils.firebase_db import save_image_metadata
import uuid
import os
from typing import Optional

router = APIRouter()

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_firebase_token)
):
    """
    Upload an image for Acacia detection analysis.
    
    Args:
        file: Image file (JPEG, PNG, TIFF)
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with upload status and image ID
    """
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file.content_type} not supported. Use JPEG, PNG, or TIFF."
        )
    
    # Validate file size (max 50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 50MB."
        )
    
    try:
        # Generate unique image ID
        image_id = str(uuid.uuid4())
        
        # Create filename with extension
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"{image_id}.{file_extension}"
        
        # Upload to S3
        s3_url = await upload_to_s3(file_content, filename)
        
        # Save metadata to Firebase
        metadata = {
            "image_id": image_id,
            "user_id": user_id,
            "filename": file.filename,
            "s3_url": s3_url,
            "file_size": len(file_content),
            "content_type": file.content_type,
            "status": "uploaded",
            "created_at": None  # Will be set by Firebase
        }
        
        await save_image_metadata(image_id, metadata)
        
        return {
            "success": True,
            "image_id": image_id,
            "s3_url": s3_url,
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("/upload/{image_id}/status")
async def get_upload_status(
    image_id: str,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Get the status of an uploaded image.
    
    Args:
        image_id: Unique image identifier
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with image status and metadata
    """
    try:
        from app.utils.firebase_db import get_image_metadata
        
        metadata = await get_image_metadata(image_id, user_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )
        
        return {
            "success": True,
            "image_id": image_id,
            "status": metadata.get("status", "unknown"),
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )
