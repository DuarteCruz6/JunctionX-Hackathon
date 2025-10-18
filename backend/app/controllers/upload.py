from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.middlewares.auth import verify_firebase_token
from app.utils.s3_storage import upload_to_s3
from app.utils.firebase_db import save_image_metadata
import uuid
import os
from typing import Optional, List
from PIL import Image
import io
import logging

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...),
    user_id: str = Depends(verify_firebase_token)
):
    """
    Upload multiple images for Acacia detection analysis.
    Each file must have a date in its metadata, otherwise an error is returned for those files.
    
    Args:
        files: List of Image files (JPEG, PNG, TIFF)
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with upload status and list of images IDs
    """
    allowed_types = ["image/jpeg", "image/png", "image/tiff"]
    max_size = 50 * 1024 * 1024  # 50MB
    error_files = []
    results = []

    for file in files:
        logger.info(f"Processing file: {file.filename} (type: {file.content_type})")
        # Validate file type
        if file.content_type not in allowed_types:
            logger.warning(f"File {file.filename} has unsupported type: {file.content_type}")
            error_files.append({"filename": file.filename, "reason": f"File type {file.content_type} not supported."})
            continue

        file_content = await file.read()
        if len(file_content) > max_size:
            logger.warning(f"File {file.filename} is too large: {len(file_content)} bytes")
            error_files.append({"filename": file.filename, "reason": "File too large. Maximum size is 50MB."})
            continue

        # Try to extract date from metadata
        date_value = None
        try:
            image = Image.open(io.BytesIO(file_content))
            exif_data = image.getexif()
            # Common EXIF date tags
            for tag in [36867, 306, 36868]:  # DateTimeOriginal, DateTime, DateTimeDigitized
                if tag in exif_data:
                    date_value = exif_data.get(tag)
                    break
        except Exception as ex:
            logger.error(f"Failed to extract EXIF from {file.filename}: {ex}")

        if not date_value:
            logger.warning(f"File {file.filename} missing date in metadata.")
            error_files.append({"filename": file.filename, "reason": "Missing date in metadata."})
            continue

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
                "date": date_value,
                "created_at": None
            }
            
            await save_image_metadata(image_id, metadata)
            logger.info(f"File {file.filename} uploaded successfully as {image_id}")
            
            results.append({
                "success": True,
                "image_id": image_id,
                "s3_url": s3_url,
                "filename": file.filename,
                "date": date_value,
                "message": "Image uploaded successfully"
            })
            
        except Exception as e:
            logger.error(f"Upload failed for {file.filename}: {e}")
            error_files.append({"filename": file.filename, "reason": f"Upload failed: {str(e)}"})

    if error_files:
        logger.warning(f"Some files could not be processed: {error_files}")
        raise HTTPException(
            status_code=400,
            detail={"error": "Some files could not be processed.", "files": error_files}
        )

    logger.info(f"All files processed successfully. {len(results)} files uploaded.")
    return {"success": True, "results": results}


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
        
        logger.info(f"Checking upload status for image_id: {image_id} (user: {user_id})")
        metadata = await get_image_metadata(image_id, user_id)
        
        if not metadata:
            logger.warning(f"Image not found: {image_id}")
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            ) 
        logger.info(f"Status for image_id {image_id}: {metadata.get('status', 'unknown')}")
        
        return {
            "success": True,
            "image_id": image_id,
            "status": metadata.get("status", "unknown"),
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Failed to get status for {image_id}: {e}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )
