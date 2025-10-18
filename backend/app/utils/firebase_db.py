import firebase_admin
from firebase_admin import firestore
from typing import Dict, Optional, Any
import os
from datetime import datetime

class FirebaseDB:
    """Firebase Firestore database utility."""
    
    def __init__(self):
        self.db = firestore.client()
        self.collections = {
            'images': 'images',
            'users': 'users',
            'predictions': 'predictions'
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
        try:
            # Add timestamp
            metadata['created_at'] = datetime.utcnow()
            
            # Save to images collection
            doc_ref = self.db.collection(self.collections['images']).document(image_id)
            doc_ref.set(metadata)
            
            return True
            
        except Exception as e:
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
        try:
            doc_ref = self.db.collection(self.collections['images']).document(image_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            metadata = doc.to_dict()
            
            # Check if user owns this image
            if metadata.get('user_id') != user_id:
                return None
            
            return metadata
            
        except Exception as e:
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
            query = images_ref.where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = query.stream()
            images = []
            
            for doc in docs:
                image_data = doc.to_dict()
                image_data['image_id'] = doc.id
                images.append(image_data)
            
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
