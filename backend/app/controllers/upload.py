from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.middlewares.auth import verify_firebase_token
from app.utils.s3_storage import upload_to_s3
from app.utils.firebase_db import save_image_metadata, create_submission, update_submission
from app.utils.ml_inference import run_acacia_detection
from app.utils.s3_storage import upload_prediction_results
from app.utils.firebase_db import update_prediction_results
from firebase_admin import firestore
import uuid
import os
import asyncio
from typing import Optional, List
from PIL import Image
import io
import logging
import re
from datetime import datetime
from PIL.ExifTags import TAGS as ExifTags
from app.utils.date_extracter import extract_image_date

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
    error_files, results = [], []
    
    # Create submission record first
    submission_id = None
    if files:
        try:
            submission_data = {
                "user_id": user_id,
                "status": "processing",
                "image_count": len(files),
                "total_detected_areas": 0,
                "average_confidence": 0.0,
                "image_ids": [],
                "metadata": {
                    "upload_session": datetime.now().isoformat(),
                    "total_files": len(files)
                }
            }
            submission_id = await create_submission(submission_data)
            logger.info(f"Created submission: {submission_id} for {len(files)} files")
        except Exception as e:
            logger.error(f"Failed to create submission: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create submission: {str(e)}"
            )

    for file in files:
        logger.info(f"Processing file: {file.filename} (type: {file.content_type})")

        # Validate file type
        if file.content_type not in allowed_types:
            error_files.append({"filename": file.filename, "reason": f"Unsupported type: {file.content_type}"})
            continue

        file_content = await file.read()
        if len(file_content) > max_size:
            error_files.append({"filename": file.filename, "reason": "File too large (max 50MB)."})
            continue

        # Try to extract date from metadata
        date_value = extract_image_date(file_content, file.filename)
        logger.info(f"Final date value for {file.filename}: {date_value}")

        # Upload and metadata
        try:
            image_id = str(uuid.uuid4())
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            filename = f"{image_id}.{file_extension}"

            s3_url = await upload_to_s3(file_content, filename)

            metadata = {
                "image_id": image_id,
                "user_id": user_id,
                "filename": file.filename,
                "original_filename": file.filename,
                "s3_url": s3_url,
                "file_size": len(file_content),
                "content_type": file.content_type,
                "status": "uploaded",
                "date": date_value.isoformat(),
                "created_at": datetime.now().isoformat(),
                "submission_id": submission_id
            }

            await save_image_metadata(image_id, metadata)
            logger.info(f"File {file.filename} uploaded successfully as {image_id}")
            
            # Add image to submission
            if submission_id:
                await update_submission(submission_id, {
                    "image_ids": firestore.ArrayUnion([image_id])
                })

            # Auto-process the image after upload
            try:
                logger.info(f"Starting auto-processing for image: {image_id}")
                await process_image_after_upload(image_id, s3_url)
                logger.info(f"Auto-processing completed for image: {image_id}")
            except Exception as e:
                logger.error(f"Auto-processing failed for {image_id}: {e}")
                # Don't fail the upload if processing fails

            results.append({
                "success": True,
                "image_id": image_id,
                "s3_url": s3_url,
                "filename": file.filename,
                "date": date_value.isoformat(),
                "submission_id": submission_id,
                "message": "Image uploaded and processed successfully"
            })

        except Exception as e:
            logger.error(f"Upload failed for {file.filename}: {e}")
            error_files.append({"filename": file.filename, "reason": f"Upload failed: {str(e)}"})

    if error_files:
        logger.warning(f"Some files failed: {error_files}")
        raise HTTPException(
            status_code=400,
            detail={"error": "Some files could not be processed.", "files": error_files}
        )

    logger.info(f"All files processed successfully ({len(results)} uploaded).")
    return {
        "success": True, 
        "submission_id": submission_id,
        "results": results,
        "total_files": len(files),
        "successful_uploads": len(results)
    }


async def process_image_after_upload(image_id: str, s3_url: str):
    """
    Process an image after upload by running ML inference.
    
    Args:
        image_id: Unique image identifier
        s3_url: S3 URL of the uploaded image
    """
    try:
        # Update status to processing
        await update_prediction_results(image_id, {"status": "processing"})
        
        # Run ML inference
        logger.info(f"Running ML inference for image: {image_id}")
        prediction_results = await run_acacia_detection(s3_url)
        
        # Upload results to S3
        results_s3_url = await upload_prediction_results(image_id, prediction_results)
        
        # Update metadata with results
        results_data = {
            "status": "processed",
            "prediction_results": prediction_results,
            "results_s3_url": results_s3_url,
            "processed_at": datetime.now().isoformat()
        }
        
        await update_prediction_results(image_id, results_data)
        logger.info(f"Image {image_id} processed successfully with {prediction_results.get('num_detections', 0)} detections")
        
        # Update submission statistics
        await update_submission_statistics(image_id, prediction_results)
        
    except Exception as e:
        logger.error(f"Failed to process image {image_id}: {e}")
        # Update status to failed
        await update_prediction_results(image_id, {"status": "failed", "error": str(e)})
        raise


async def update_submission_statistics(image_id: str, prediction_results: dict):
    """
    Update submission statistics when an image is processed.
    
    Args:
        image_id: Image identifier
        prediction_results: ML prediction results
    """
    try:
        from app.utils.firebase_db import get_image_metadata, get_user_submissions
        
        # Get image metadata to find submission_id
        image_metadata = await get_image_metadata(image_id, None)  # We'll get user_id from image
        if not image_metadata:
            logger.warning(f"Could not find image metadata for {image_id}")
            return
            
        submission_id = image_metadata.get('submission_id')
        if not submission_id:
            logger.warning(f"No submission_id found for image {image_id}")
            return
            
        # Get submission to calculate new statistics
        user_id = image_metadata.get('user_id')
        submissions = await get_user_submissions(user_id, limit=100)
        submission = next((s for s in submissions if s.get('submission_id') == submission_id), None)
        
        if not submission:
            logger.warning(f"Could not find submission {submission_id}")
            return
            
        # Calculate new statistics
        total_detected_areas = sum(
            img.get("prediction_results", {}).get("num_detections", 0) 
            for img in submission.get('images', [])
        ) + prediction_results.get('num_detections', 0)
        
        confidences = [
            img.get("prediction_results", {}).get("average_confidence", 0)
            for img in submission.get('images', [])
            if img.get("prediction_results", {}).get("average_confidence", 0) > 0
        ] + [prediction_results.get('average_confidence', 0)]
        
        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Update submission
        await update_submission(submission_id, {
            "total_detected_areas": total_detected_areas,
            "average_confidence": average_confidence
        })
        
        logger.info(f"Updated submission {submission_id} statistics")
        
    except Exception as e:
        logger.error(f"Failed to update submission statistics for {image_id}: {e}")


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

        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )


@router.get("/download/{image_id}")
async def download_image(
    image_id: str,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Download an image by its ID. This endpoint proxies the S3 download
    to bypass CORS restrictions.
    
    Args:
        image_id: Unique image identifier
        user_id: Firebase authenticated user ID
    
    Returns:
        Image file with proper headers for download
    """
    try:
        from app.utils.firebase_db import get_image_metadata
        from app.utils.s3_storage import download_from_s3
        from fastapi.responses import Response
        
        logger.info(f"Downloading image {image_id} for user {user_id}")
        
        # Get image metadata to verify ownership and get S3 URL
        metadata = await get_image_metadata(image_id, user_id)
        
        if not metadata:
            logger.warning(f"Image not found: {image_id}")
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )
        
        # Get the S3 URL from metadata
        s3_url = metadata.get('s3_url')
        if not s3_url:
            logger.error(f"No S3 URL found for image {image_id}")
            raise HTTPException(
                status_code=404,
                detail="Image file not found"
            )
        
        # Download the image from S3
        logger.info(f"Downloading from S3: {s3_url}")
        image_content = await download_from_s3(s3_url)
        
        # Get original filename or create one
        original_filename = metadata.get('original_filename', 'image.jpg')
        if not original_filename.endswith(('.jpg', '.jpeg', '.png', '.tiff')):
            original_filename += '.jpg'
        
        # Determine content type based on file extension
        content_type = 'image/jpeg'  # default
        if original_filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif original_filename.lower().endswith('.tiff'):
            content_type = 'image/tiff'
        
        logger.info(f"Successfully downloaded image {image_id}, size: {len(image_content)} bytes")
        
        # Return the image with proper headers for download
        return Response(
            content=image_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={original_filename}",
                "Content-Length": str(len(image_content))
            }
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Failed to download image {image_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download image: {str(e)}"
        )

