from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.middlewares.auth import verify_firebase_token
from app.utils.ml_inference import run_acacia_detection, run_acacia_detection_from_file
from app.utils.firebase_db import get_image_metadata, update_prediction_results
from app.utils.s3_storage import upload_prediction_results
import asyncio
import time
import logging
from typing import Optional
import uuid
import tempfile
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/predict/{image_id}")
async def predict_acacia(
    image_id: str,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Run Acacia detection on an uploaded image.
    
    Args:
        image_id: Unique image identifier
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with prediction results
    """
    start_time = time.time()
    logger.info(f"Starting prediction for image_id: {image_id} (user: {user_id})")
    
    try:
        # Get image metadata
        logger.debug(f"Fetching metadata for image: {image_id}")
        metadata = await get_image_metadata(image_id, user_id)
        if not metadata:
            logger.warning(f"Image not found: {image_id}")
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )
        
        # Check if image is already processed
        if metadata.get("status") == "processed":
            logger.info(f"Image {image_id} already processed, returning cached results")
            return {
                "success": True,
                "image_id": image_id,
                "status": "already_processed",
                "results": metadata.get("prediction_results", {})
            }
        
        # Update status to processing
        logger.debug(f"Updating status to 'processing' for image: {image_id}")
        await update_prediction_results(image_id, {"status": "processing"})
        
        # Run ML inference
        s3_url = metadata.get("s3_url")
        if not s3_url:
            logger.error(f"S3 URL not found for image: {image_id}")
            raise HTTPException(
                status_code=400,
                detail="Image S3 URL not found"
            )
        
        # Run Acacia detection
        logger.info(f"Starting ML inference for image: {image_id}")
        try:
            prediction_results = await run_acacia_detection(s3_url)
            logger.debug(f"ML inference completed for image: {image_id}")
            
            # Upload results to S3
            logger.debug(f"Uploading prediction results to S3 for image: {image_id}")
            results_s3_url = await upload_prediction_results(
                image_id, 
                prediction_results
            )
            
            # Update metadata with results
            logger.debug(f"Updating metadata with results for image: {image_id}")
            results_data = {
                "status": "processed",
                "prediction_results": prediction_results,
                "results_s3_url": results_s3_url,
                "processed_at": None  # Will be set by Firebase
            }
            
            await update_prediction_results(image_id, results_data)
            
        except Exception as ml_error:
            logger.warning(f"ML API failed for image {image_id}, setting failed status: {ml_error}")
            # Set failed status with zero values when ML API fails
            prediction_results = {
                "detections": [],
                "num_detections": 0,
                "average_confidence": 0.0,
                "coverage_percentage": 0.0,
                "processing_time": 0.0,
                "model_version": "unavailable",
                "status": "failed",
                "error": str(ml_error)
            }
            
            # Update metadata with failed results
            results_data = {
                "status": "failed",
                "prediction_results": prediction_results,
                "results_s3_url": None,
                "processed_at": None  # Will be set by Firebase
            }
            
            await update_prediction_results(image_id, results_data)
        
        process_time = time.time() - start_time
        logger.info(
            f"Prediction completed for image: {image_id} "
            f"Duration: {process_time:.2f}s "
            f"Detections: {len(prediction_results.get('detections', []))}"
        )
        
        # Determine status based on ML API result
        if prediction_results.get("status") == "failed":
            return {
                "success": True,
                "image_id": image_id,
                "status": "failed",
                "results": prediction_results,
                "results_url": None
            }
        else:
            return {
                "success": True,
                "image_id": image_id,
                "status": "processed",
                "results": prediction_results,
                "results_url": results_s3_url
            }
        
    except HTTPException:
        process_time = time.time() - start_time
        logger.warning(
            f"HTTP exception in prediction for image: {image_id} "
            f"Duration: {process_time:.2f}s"
        )
        raise
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Prediction failed for image: {image_id} "
            f"Error: {str(e)} "
            f"Duration: {process_time:.2f}s"
        )
        # Update status to failed
        try:
            await update_prediction_results(image_id, {"status": "failed"})
        except Exception as update_error:
            logger.error(f"Failed to update status for failed prediction: {update_error}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

@router.get("/predict/{image_id}/results")
async def get_prediction_results(
    image_id: str,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Get prediction results for an image.
    
    Args:
        image_id: Unique image identifier
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with prediction results
    """
    
    try:
        metadata = await get_image_metadata(image_id, user_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )
        
        status = metadata.get("status", "unknown")
        if status != "processed":
            return {
                "success": True,
                "image_id": image_id,
                "status": status,
                "message": f"Image status: {status}"
            }
        
        results = metadata.get("prediction_results", {})
        results_url = metadata.get("results_s3_url")
        
        return {
            "success": True,
            "image_id": image_id,
            "status": "processed",
            "results": results,
            "results_url": results_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get results: {str(e)}"
        )

@router.get("/predict/{image_id}/stats")
async def get_prediction_stats(
    image_id: str,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Get detailed statistics for Acacia detection results.
    
    Args:
        image_id: Unique image identifier
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with detailed statistics
    """
    
    try:
        metadata = await get_image_metadata(image_id, user_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail="Image not found"
            )
        
        status = metadata.get("status", "unknown")
        if status != "processed":
            raise HTTPException(
                status_code=400,
                detail=f"Image not processed yet. Status: {status}"
            )
        
        results = metadata.get("prediction_results", {})
        
        # Calculate statistics
        stats = {
            "total_detections": len(results.get("detections", [])),
            "confidence_scores": [det.get("confidence", 0) for det in results.get("detections", [])],
            "average_confidence": sum([det.get("confidence", 0) for det in results.get("detections", [])]) / max(len(results.get("detections", [])), 1),
            "coverage_percentage": results.get("coverage_percentage", 0),
            "processing_time": results.get("processing_time", 0)
        }
        
        return {
            "success": True,
            "image_id": image_id,
            "statistics": stats,
            "raw_results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get statistics: {str(e)}"
        )

@router.post("/analyze-anonymous")
async def analyze_image_anonymous(
    file: UploadFile = File(...)
):
    """
    Analyze an image for Acacia detection without saving to Firestore or AWS.
    This endpoint is for anonymous users who don't want to save their data.
    
    Args:
        file: Image file to analyze
    
    Returns:
        JSON response with prediction results (no persistence)
    """
    start_time = time.time()
    logger.info(f"Starting anonymous analysis for file: {file.filename}")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/tiff']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (50MB max)
    max_size = 50 * 1024 * 1024  # 50MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size / (1024 * 1024):.0f}MB"
        )
    
    # Create temporary file for analysis
    temp_file_path = None
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        logger.info(f"Created temporary file: {temp_file_path}")
        
        # Run ML inference directly on the file content
        logger.info(f"Starting ML inference for anonymous analysis")
        try:
            prediction_results = await run_acacia_detection_from_file(file_content)
            logger.debug(f"ML inference completed for anonymous analysis")
        except Exception as ml_error:
            logger.warning(f"ML API failed, returning failed status: {ml_error}")
            # Return failed status with zero values when ML API fails
            prediction_results = {
                "detections": [],
                "num_detections": 0,
                "average_confidence": 0.0,
                "coverage_percentage": 0.0,
                "processing_time": 0.0,
                "model_version": "unavailable",
                "status": "failed",
                "error": str(ml_error)
            }
        
        process_time = time.time() - start_time
        logger.info(
            f"Anonymous analysis completed for file: {file.filename} "
            f"Duration: {process_time:.2f}s "
            f"Detections: {len(prediction_results.get('detections', []))}"
        )
        
        # Determine status based on ML API result
        if prediction_results.get("status") == "failed":
            return {
                "success": True,
                "filename": file.filename,
                "status": "failed",
                "results": prediction_results,
                "processing_time": process_time,
                "message": "Analysis failed due to ML API unavailability. No data was saved."
            }
        else:
            return {
                "success": True,
                "filename": file.filename,
                "status": "analyzed",
                "results": prediction_results,
                "processing_time": process_time,
                "message": "Analysis completed successfully. No data was saved."
            }
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Anonymous analysis failed for file: {file.filename} "
            f"Error: {str(e)} "
            f"Duration: {process_time:.2f}s"
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary file: {cleanup_error}")
