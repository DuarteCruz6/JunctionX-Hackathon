import firebase_admin
from firebase_admin import firestore
from typing import Dict, Optional, Any, Union, List
import os
from datetime import datetime
import time
import logging
import json
import uuid

# Get module logger
logger = logging.getLogger(__name__)

def convert_firestore_datetime(obj):
    """
    Convert Firestore datetime objects to serializable format.
    
    Args:
        obj: Object that may contain Firestore datetime objects
    
    Returns:
        Object with Firestore datetime objects converted to ISO strings
    """
    if hasattr(obj, 'timestamp'):
        # This is a Firestore DatetimeWithNanoseconds object
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: convert_firestore_datetime(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_firestore_datetime(item) for item in obj]
    else:
        return obj

class FirebaseDB:
    """Firebase Firestore database utility."""
    
    def __init__(self):
        self.db = firestore.client()
        self.collections = {
            'images': 'images',
            'users': 'users',
            'predictions': 'predictions',
            'submissions': 'submissions'
        }
    
    async def save_image_metadata(self, image_id: str, metadata: Dict[str, Any]) -> bool:
        """
        Save image metadata to Firestore.
        
        Args:
            image_id: Unique image identifier
            metadata: Image metadata dictionary
        
        Returns:
            bool: True if successful
        """
        start_time = time.time()
        metadata_size = len(json.dumps(metadata).encode('utf-8'))
        
        try:
            logger.info(
                f"Starting Firestore write - "
                f"Collection: {self.collections['images']} "
                f"ID: {image_id} "
                f"Size: {metadata_size/1024:.1f}KB"
            )
            
            # Add timestamp
            metadata['created_at'] = datetime.utcnow()
            
            # Save to images collection
            doc_ref = self.db.collection(self.collections['images']).document(image_id)
            write_start = time.time()
            doc_ref.set(metadata)
            write_time = time.time() - write_start
            
            total_time = time.time() - start_time
            logger.info(
                f"Firestore write successful - "
                f"ID: {image_id} "
                f"Duration: {total_time:.2f}s "
                f"Write Time: {write_time:.2f}s"
            )
            
            return True
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(
                f"Firestore write failed - "
                f"ID: {image_id} "
                f"Duration: {total_time:.2f}s "
                f"Error: {str(e)}"
            )
            raise Exception(f"Failed to save image metadata: {str(e)}")
    
    async def get_image_metadata(self, image_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get image metadata from Firestore.
        
        Args:
            image_id: Unique image identifier
            user_id: User ID for authorization
        
        Returns:
            dict: Image metadata or None if not found
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting Firestore read - ID: {image_id} User: {user_id}")
            
            # Fetch document
            doc_ref = self.db.collection(self.collections['images']).document(image_id)
            fetch_start = time.time()
            doc = doc_ref.get()
            fetch_time = time.time() - fetch_start
            
            if not doc.exists:
                total_time = time.time() - start_time
                logger.warning(
                    f"Document not found - "
                    f"ID: {image_id} "
                    f"Duration: {total_time:.2f}s"
                )
                return None
            
            # Process metadata
            process_start = time.time()
            metadata = doc.to_dict()
            
            # Convert Firestore datetime objects to serializable format
            metadata = convert_firestore_datetime(metadata)
            
            # Check if user owns this image
            if metadata.get('user_id') != user_id:
                total_time = time.time() - start_time
                logger.warning(
                    f"Unauthorized access attempt - "
                    f"ID: {image_id} "
                    f"Requested by: {user_id} "
                    f"Owner: {metadata.get('user_id')} "
                    f"Duration: {total_time:.2f}s"
                )
                return None
            
            process_time = time.time() - process_start
            total_time = time.time() - start_time
            metadata_size = len(json.dumps(metadata).encode('utf-8'))
            
            logger.info(
                f"Firestore read successful - "
                f"ID: {image_id} "
                f"Size: {metadata_size/1024:.1f}KB "
                f"Duration: {total_time:.2f}s "
                f"(Fetch: {fetch_time:.2f}s, Process: {process_time:.2f}s)"
            )
            
            return metadata
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(
                f"Firestore read failed - "
                f"ID: {image_id} "
                f"Duration: {total_time:.2f}s "
                f"Error: {str(e)}"
            )
            raise Exception(f"Failed to get image metadata: {str(e)}")
    
    async def update_prediction_results(self, image_id: str, results: Dict[str, Any]) -> bool:
        """
        Update image with prediction results.
        
        Args:
            image_id: Unique image identifier
            results: Prediction results dictionary
        
        Returns:
            bool: True if successful
        """
        try:
            # Add timestamp for updates
            results['updated_at'] = datetime.utcnow()
            
            doc_ref = self.db.collection(self.collections['images']).document(image_id)
            doc_ref.update(results)
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to update prediction results: {str(e)}")
    
    async def get_user_images(self, user_id: str, limit: int = 50) -> list:
        """
        Get all images for a specific user.
        
        Args:
            user_id: Firebase user ID
            limit: Maximum number of images to return
        
        Returns:
            list: List of image metadata dictionaries
        """
        try:
            images_ref = self.db.collection(self.collections['images'])
            # Query without ordering to avoid composite index requirement
            query = images_ref.where('user_id', '==', user_id).limit(limit)
            
            docs = query.stream()
            images = []
            
            for doc in docs:
                image_data = doc.to_dict()
                image_data['image_id'] = doc.id
                images.append(image_data)
            
            # Sort in Python instead of Firestore to avoid index requirement
            images.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            return images
            
        except Exception as e:
            raise Exception(f"Failed to get user images: {str(e)}")
    
    async def save_prediction_log(self, image_id: str, user_id: str, prediction_data: Dict[str, Any]) -> bool:
        """
        Save prediction log for analytics.
        
        Args:
            image_id: Unique image identifier
            user_id: Firebase user ID
            prediction_data: Prediction data dictionary
        
        Returns:
            bool: True if successful
        """
        try:
            log_data = {
                'image_id': image_id,
                'user_id': user_id,
                'prediction_data': prediction_data,
                'created_at': datetime.utcnow()
            }
            
            doc_ref = self.db.collection(self.collections['predictions']).document()
            doc_ref.set(log_data)
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to save prediction log: {str(e)}")
    
    async def create_submission(self, submission_data: Dict[str, Any]) -> str:
        """
        Create a new submission record.
        
        Args:
            submission_data: Submission metadata dictionary
        
        Returns:
            str: Submission ID
        """
        try:
            submission_id = str(uuid.uuid4())
            submission_data['submission_id'] = submission_id
            submission_data['created_at'] = datetime.utcnow()
            submission_data['updated_at'] = datetime.utcnow()
            
            doc_ref = self.db.collection(self.collections['submissions']).document(submission_id)
            doc_ref.set(submission_data)
            
            logger.info(f"Created submission: {submission_id}")
            return submission_id
            
        except Exception as e:
            raise Exception(f"Failed to create submission: {str(e)}")
    
    async def update_submission(self, submission_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update submission metadata.
        
        Args:
            submission_id: Submission identifier
            update_data: Fields to update
        
        Returns:
            bool: True if successful
        """
        try:
            update_data['updated_at'] = datetime.utcnow()
            
            doc_ref = self.db.collection(self.collections['submissions']).document(submission_id)
            doc_ref.update(update_data)
            
            logger.info(f"Updated submission: {submission_id}")
            return True
            
        except Exception as e:
            raise Exception(f"Failed to update submission: {str(e)}")
    
    async def get_user_submissions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get user's submissions ordered by most recent first.
        
        Args:
            user_id: Firebase user ID
            limit: Maximum number of submissions to return
        
        Returns:
            list: List of submission dictionaries
        """
        try:
            submissions_ref = self.db.collection(self.collections['submissions'])
            # Query without ordering to avoid composite index requirement
            query = submissions_ref.where('user_id', '==', user_id).limit(limit)
            
            docs = query.stream()
            submissions = []
            
            for doc in docs:
                submission_data = doc.to_dict()
                submission_data['submission_id'] = doc.id
                submissions.append(submission_data)
            
            # Sort in Python instead of Firestore to avoid index requirement
            def get_sort_key(submission):
                created_at = submission.get('created_at')
                if hasattr(created_at, 'timestamp'):
                    # Firestore datetime object
                    return created_at.timestamp()
                elif isinstance(created_at, str):
                    # ISO string
                    try:
                        return datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp()
                    except:
                        return 0
                elif isinstance(created_at, datetime):
                    # Python datetime object
                    return created_at.timestamp()
                else:
                    return 0
            
            submissions.sort(key=get_sort_key, reverse=True)
            
            logger.info(f"Retrieved {len(submissions)} submissions for user: {user_id}")
            return submissions
            
        except Exception as e:
            raise Exception(f"Failed to get user submissions: {str(e)}")
    
    async def get_submission_with_images(self, submission_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get submission with all its images.
        
        Args:
            submission_id: Submission identifier
            user_id: Firebase user ID for authorization
        
        Returns:
            dict: Submission with images or None if not found
        """
        try:
            # Get submission
            submission_doc = self.db.collection(self.collections['submissions']).document(submission_id).get()
            
            if not submission_doc.exists:
                return None
            
            submission_data = submission_doc.to_dict()
            
            # Verify ownership
            if submission_data.get('user_id') != user_id:
                logger.warning(f"Unauthorized access to submission {submission_id} by user {user_id}")
                return None
            
            # Get all images for this submission
            image_ids = submission_data.get('image_ids', [])
            images = []
            
            for image_id in image_ids:
                image_doc = self.db.collection(self.collections['images']).document(image_id).get()
                if image_doc.exists:
                    image_data = image_doc.to_dict()
                    image_data['image_id'] = image_id
                    images.append(image_data)
            
            submission_data['images'] = images
            submission_data['submission_id'] = submission_id
            
            return submission_data
            
        except Exception as e:
            raise Exception(f"Failed to get submission with images: {str(e)}")

# Global Firebase DB instance
firebase_db = FirebaseDB()

# Convenience functions
async def save_image_metadata(image_id: str, metadata: Dict[str, Any]) -> bool:
    """Save image metadata to Firestore."""
    return await firebase_db.save_image_metadata(image_id, metadata)

async def get_image_metadata(image_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Get image metadata from Firestore."""
    return await firebase_db.get_image_metadata(image_id, user_id)

async def update_prediction_results(image_id: str, results: Dict[str, Any]) -> bool:
    """Update prediction results in Firestore."""
    return await firebase_db.update_prediction_results(image_id, results)

async def get_user_images(user_id: str, limit: int = 50) -> list:
    """Get user's images from Firestore."""
    return await firebase_db.get_user_images(user_id, limit)

async def save_prediction_log(image_id: str, user_id: str, prediction_data: Dict[str, Any]) -> bool:
    """Save prediction log to Firestore."""
    return await firebase_db.save_prediction_log(image_id, user_id, prediction_data)

async def create_submission(submission_data: Dict[str, Any]) -> str:
    """Create a new submission record."""
    return await firebase_db.create_submission(submission_data)

async def update_submission(submission_id: str, update_data: Dict[str, Any]) -> bool:
    """Update submission metadata."""
    return await firebase_db.update_submission(submission_id, update_data)

async def get_user_submissions(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get user's submissions from Firestore."""
    return await firebase_db.get_user_submissions(user_id, limit)

async def get_submission_with_images(submission_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Get submission with all its images."""
    return await firebase_db.get_submission_with_images(submission_id, user_id)
