from fastapi import APIRouter, HTTPException, Depends
from app.middlewares.auth import verify_firebase_token
from app.utils.firebase_db import get_user_submissions, get_submission_with_images
from typing import List, Dict, Any
import logging
from datetime import datetime, timedelta
from collections import defaultdict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/reports")
async def get_user_reports(
    user_id: str = Depends(verify_firebase_token)
):
    """
    Get user's submission reports from the submissions table.
    
    Args:
        user_id: Firebase authenticated user ID
    
    Returns:
        JSON response with submission reports
    """
    try:
        logger.info(f"Fetching reports for user: {user_id}")
        
        # Get user submissions directly from submissions table
        submissions = await get_user_submissions(user_id, limit=100)
        
        if not submissions:
            logger.info(f"No submissions found for user: {user_id}")
            return {
                "success": True,
                "reports": [],
                "message": "No submissions found"
            }
        
        logger.info(f"Found {len(submissions)} submissions for user: {user_id}")
        
        # Format the response
        formatted_reports = []
        for i, submission in enumerate(submissions):
            # Get submission with images for detailed report
            submission_with_images = await get_submission_with_images(submission['submission_id'], user_id)
            
            if submission_with_images:
                report = {
                    "id": i + 1,
                    "submission_id": submission["submission_id"],
                    "date": format_date(submission["created_at"]),
                    "time": format_time(submission["created_at"]),
                    "image_count": submission.get("image_count", 0),
                    "total_detected_areas": submission.get("total_detected_areas", 0),
                    "average_confidence": submission.get("average_confidence", 0.0),
                    "status": submission.get("status", "unknown"),
                    "images": format_images_for_report(submission_with_images.get("images", []))
                }
                formatted_reports.append(report)
        
        logger.info(f"Found {len(formatted_reports)} submission reports for user: {user_id}")
        
        return {
            "success": True,
            "reports": formatted_reports,
            "total_reports": len(formatted_reports)
        }
        
    except Exception as e:
        logger.error(f"Failed to get reports for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get reports: {str(e)}"
        )

@router.get("/reports/test")
async def get_test_reports():
    """
    Test endpoint to return sample report data for development.
    """
    try:
        # Sample data structure
        sample_reports = [
            {
                "id": 1,
                "submission_id": "test-session-1",
                "date": "2024-01-15",
                "time": "14:30",
                "image_count": 2,
                "total_detected_areas": 5,
                "average_confidence": 0.85,
                "status": "completed",
                "images": [
                    {
                        "image_id": "test-image-1",
                        "input_name": "forest_001.jpg",
                        "inputImage": "https://via.placeholder.com/400x300/4ade80/ffffff?text=Forest+Image+1",
                        "outputImage": "https://via.placeholder.com/400x300/22c55e/ffffff?text=Processed+1",
                        "status": "processed",
                        "confidence": 0.87,
                        "detectedAreas": 3,
                        "processingTime": 2.3,
                        "species": ["Acacia dealbata"],
                        "created_at": "2024-01-15T14:30:00Z"
                    },
                    {
                        "image_id": "test-image-2", 
                        "input_name": "forest_002.jpg",
                        "inputImage": "https://via.placeholder.com/400x300/4ade80/ffffff?text=Forest+Image+2",
                        "outputImage": "https://via.placeholder.com/400x300/22c55e/ffffff?text=Processed+2",
                        "status": "processed",
                        "confidence": 0.83,
                        "detectedAreas": 2,
                        "processingTime": 1.8,
                        "species": ["Acacia melanoxylon"],
                        "created_at": "2024-01-15T14:31:00Z"
                    }
                ]
            }
        ]
        
        return {
            "success": True,
            "reports": sample_reports,
            "total_reports": len(sample_reports)
        }
        
    except Exception as e:
        logger.error(f"Failed to get test reports: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get test reports: {str(e)}"
        )


def format_date(date_value) -> str:
    """Format date value to YYYY-MM-DD string."""
    if hasattr(date_value, 'strftime'):
        # Firestore datetime or Python datetime
        return date_value.strftime("%Y-%m-%d")
    elif isinstance(date_value, str):
        # ISO string
        try:
            dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            return dt.strftime("%Y-%m-%d")
        except:
            return date_value[:10] if len(date_value) >= 10 else "Unknown"
    else:
        return "Unknown"

def format_time(date_value) -> str:
    """Format date value to HH:MM string."""
    if hasattr(date_value, 'strftime'):
        # Firestore datetime or Python datetime
        return date_value.strftime("%H:%M")
    elif isinstance(date_value, str):
        # ISO string
        try:
            dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            return dt.strftime("%H:%M")
        except:
            return date_value[11:16] if len(date_value) >= 16 else "Unknown"
    else:
        return "Unknown"

def format_images_for_report(images: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format images for the report response."""
    formatted_images = []
    
    for image in images:
        prediction_results = image.get("prediction_results", {})
        
        # Debug logging to see what data we're getting
        logger.debug(f"Image {image.get('image_id')} - Status: {image.get('status')}")
        logger.debug(f"Prediction results keys: {list(prediction_results.keys()) if prediction_results else 'None'}")
        logger.debug(f"Prediction results: {prediction_results}")
        
        formatted_image = {
            "image_id": image.get("image_id"),
            "input_name": image.get("original_filename", "unknown"),
            "inputImage": image.get("s3_url"),  # Original image URL - camelCase for frontend
            "outputImage": image.get("results_s3_url"),  # Processed image URL - camelCase for frontend
            "status": image.get("status", "unknown"),
            "confidence": prediction_results.get("average_confidence", 0.0),
            "detectedAreas": prediction_results.get("num_detections", 0),  # camelCase for frontend
            "processingTime": prediction_results.get("processing_time", 0),  # camelCase for frontend
            "species": extract_species_from_detections(prediction_results.get("detections", [])),
            "created_at": image.get("created_at").isoformat() if image.get("created_at") else None
        }
        
        formatted_images.append(formatted_image)
    
    return formatted_images

def extract_species_from_detections(detections: List[Dict[str, Any]]) -> List[str]:
    """Extract unique species from detection results."""
    species = set()
    for detection in detections:
        label = detection.get("label", "").lower()
        if "acacia" in label:
            # Extract species name from label
            species_name = label.replace("acacia", "").strip()
            if species_name:
                species.add(f"Acacia {species_name}")
            else:
                species.add("Acacia")
        else:
            species.add(label.title())
    
    return list(species)
