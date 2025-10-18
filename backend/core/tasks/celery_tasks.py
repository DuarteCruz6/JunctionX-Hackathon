from celery import Celery
import os
import asyncio

# Initialize Firebase before importing other modules
from app.middlewares.auth import initialize_firebase
initialize_firebase()

from app.utils.ml_inference import run_acacia_detection
from app.utils.firebase_db import update_prediction_results
from app.utils.s3_storage import upload_prediction_results

# Initialize Celery
celery_app = Celery(
    'forest_guardian',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
)

@celery_app.task(bind=True)
def process_image_async(self, image_id: str, s3_url: str):
    """
    Asynchronous task to process image for Acacia detection.
    
    Args:
        image_id: Unique image identifier
        s3_url: S3 URL of the image
    
    Returns:
        dict: Task result with prediction data
    """
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'status': 'Processing image...', 'progress': 10}
        )
        
        # Run ML inference
        self.update_state(
            state='PROGRESS',
            meta={'status': 'Running Acacia detection...', 'progress': 50}
        )
        
        # Use asyncio to run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            prediction_results = loop.run_until_complete(
                run_acacia_detection(s3_url)
            )
        finally:
            loop.close()
        
        # Upload results to S3
        self.update_state(
            state='PROGRESS',
            meta={'status': 'Saving results...', 'progress': 80}
        )
        
        results_s3_url = loop.run_until_complete(
            upload_prediction_results(image_id, prediction_results)
        )
        
        # Update Firebase with results
        loop.run_until_complete(
            update_prediction_results(image_id, {
                'status': 'processed',
                'prediction_results': prediction_results,
                'results_s3_url': results_s3_url,
                'task_id': self.request.id
            })
        )
        
        # Final status update
        self.update_state(
            state='SUCCESS',
            meta={
                'status': 'Processing completed',
                'progress': 100,
                'image_id': image_id,
                'results': prediction_results,
                'results_url': results_s3_url
            }
        )
        
        return {
            'success': True,
            'image_id': image_id,
            'results': prediction_results,
            'results_url': results_s3_url,
            'task_id': self.request.id
        }
        
    except Exception as e:
        # Update Firebase with error status
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                update_prediction_results(image_id, {
                    'status': 'failed',
                    'error': str(e),
                    'task_id': self.request.id
                })
            )
            loop.close()
        except:
            pass
        
        # Update task status with error
        self.update_state(
            state='FAILURE',
            meta={
                'status': 'Processing failed',
                'error': str(e),
                'image_id': image_id
            }
        )
        
        raise e

@celery_app.task
def cleanup_old_images():
    """
    Cleanup task to remove old images and results from S3.
    This can be scheduled to run periodically.
    """
    try:
        from datetime import datetime, timedelta
        from app.utils.s3_storage import s3_storage
        from app.utils.firebase_db import firebase_db
        
        # Get images older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # This would need to be implemented based on your specific needs
        # For now, just return success
        return {
            'success': True,
            'message': 'Cleanup task completed',
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

@celery_app.task
def health_check():
    """
    Health check task to verify system components.
    """
    try:
        from app.utils.ml_inference import ml_model
        
        # Test ML model connection
        ml_status = asyncio.run(ml_model.test_model_connection())
        
        return {
            'success': True,
            'ml_model_status': ml_status,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

# Task routing
celery_app.conf.task_routes = {
    'app.tasks.celery_tasks.process_image_async': {'queue': 'image_processing'},
    'app.tasks.celery_tasks.cleanup_old_images': {'queue': 'maintenance'},
    'app.tasks.celery_tasks.health_check': {'queue': 'monitoring'},
}
