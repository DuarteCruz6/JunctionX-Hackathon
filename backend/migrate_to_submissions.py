#!/usr/bin/env python3
"""
Migration script to convert existing image-based reports to submission-based reports.

This script:
1. Reads all existing images from the images collection
2. Groups them by user and upload session (5-minute window)
3. Creates submission records for each group
4. Updates image records with submission_id references
5. Provides rollback capability

Usage:
    python migrate_to_submissions.py --dry-run  # Preview changes
    python migrate_to_submissions.py --execute   # Apply changes
    python migrate_to_submissions.py --rollback  # Rollback changes
"""

import asyncio
import argparse
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)
logger = logging.getLogger(__name__)

# Import our modules
from app.utils.firebase_db import (
    get_user_images, create_submission, update_submission,
    save_image_metadata, get_user_submissions
)
from firebase_admin import firestore

class SubmissionMigrator:
    """Handles migration from image-based to submission-based reports."""
    
    def __init__(self):
        self.db = firestore.client()
        self.migration_log = []
    
    async def migrate_all_users(self, dry_run: bool = True):
        """Migrate all users' data to submission-based structure."""
        logger.info(f"Starting migration {'(DRY RUN)' if dry_run else '(EXECUTING)'}")
        
        # Get all unique user IDs from images collection
        images_ref = self.db.collection('images')
        docs = images_ref.stream()
        
        user_images = defaultdict(list)
        for doc in docs:
            image_data = doc.to_dict()
            user_id = image_data.get('user_id')
            if user_id:
                image_data['image_id'] = doc.id
                user_images[user_id].append(image_data)
        
        logger.info(f"Found {len(user_images)} users with images")
        
        total_submissions = 0
        for user_id, images in user_images.items():
            submissions_created = await self.migrate_user_images(user_id, images, dry_run)
            total_submissions += submissions_created
            logger.info(f"User {user_id}: Created {submissions_created} submissions")
        
        logger.info(f"Migration complete: {total_submissions} total submissions created")
        return total_submissions
    
    async def migrate_user_images(self, user_id: str, images: List[Dict[str, Any]], dry_run: bool = True) -> int:
        """Migrate a single user's images to submissions."""
        logger.info(f"Migrating {len(images)} images for user {user_id}")
        
        # Group images by session (5-minute window)
        submissions = self.group_images_by_session(images)
        logger.info(f"Grouped into {len(submissions)} submission sessions")
        
        submissions_created = 0
        for submission_images in submissions:
            if not dry_run:
                submission_id = await self.create_submission_from_images(user_id, submission_images)
                await self.update_images_with_submission_id(submission_images, submission_id)
                self.migration_log.append({
                    'user_id': user_id,
                    'submission_id': submission_id,
                    'image_count': len(submission_images),
                    'created_at': datetime.now().isoformat()
                })
            else:
                logger.info(f"DRY RUN: Would create submission with {len(submission_images)} images")
            
            submissions_created += 1
        
        return submissions_created
    
    def group_images_by_session(self, images: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Group images by submission session based on upload time."""
        if not images:
            return []
        
        # Sort images by creation time
        sorted_images = sorted(images, key=lambda x: x.get("created_at", datetime.min))
        
        submissions = []
        current_session = []
        session_start_time = None
        
        for image in sorted_images:
            image_time = image.get("created_at")
            if not image_time:
                continue
                
            # Convert to datetime if it's a string
            if isinstance(image_time, str):
                try:
                    image_time = datetime.fromisoformat(image_time.replace('Z', '+00:00'))
                except:
                    continue
            
            # If this is the first image or within 5 minutes of session start
            if not session_start_time or (image_time - session_start_time).total_seconds() <= 300:
                current_session.append(image)
                if not session_start_time:
                    session_start_time = image_time
            else:
                # Start a new session
                if current_session:
                    submissions.append(current_session)
                current_session = [image]
                session_start_time = image_time
        
        # Add the last session
        if current_session:
            submissions.append(current_session)
        
        return submissions
    
    async def create_submission_from_images(self, user_id: str, images: List[Dict[str, Any]]) -> str:
        """Create a submission record from a list of images."""
        if not images:
            raise ValueError("Cannot create submission from empty image list")
        
        # Calculate submission statistics
        total_detected_areas = sum(
            img.get("prediction_results", {}).get("num_detections", 0) 
            for img in images
        )
        
        confidences = [
            img.get("prediction_results", {}).get("average_confidence", 0)
            for img in images
            if img.get("prediction_results", {}).get("average_confidence", 0) > 0
        ]
        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Determine overall status
        statuses = [img.get("status", "unknown") for img in images]
        if all(status == "processed" for status in statuses):
            status = "completed"
        elif any(status == "processing" for status in statuses):
            status = "processing"
        elif any(status == "failed" for status in statuses):
            status = "failed"
        else:
            status = "pending"
        
        # Create submission data
        submission_data = {
            "user_id": user_id,
            "status": status,
            "image_count": len(images),
            "total_detected_areas": total_detected_areas,
            "average_confidence": average_confidence,
            "image_ids": [img["image_id"] for img in images],
            "metadata": {
                "migrated_from_images": True,
                "migration_date": datetime.now().isoformat(),
                "original_session_start": images[0].get("created_at")
            }
        }
        
        submission_id = await create_submission(submission_data)
        logger.info(f"Created submission {submission_id} with {len(images)} images")
        return submission_id
    
    async def update_images_with_submission_id(self, images: List[Dict[str, Any]], submission_id: str):
        """Update image records with submission_id reference."""
        for image in images:
            image_id = image["image_id"]
            try:
                # Update the image document with submission_id
                doc_ref = self.db.collection('images').document(image_id)
                doc_ref.update({
                    'submission_id': submission_id,
                    'migration_updated_at': datetime.now()
                })
                logger.debug(f"Updated image {image_id} with submission_id {submission_id}")
            except Exception as e:
                logger.error(f"Failed to update image {image_id}: {e}")
    
    async def rollback_migration(self):
        """Rollback migration by removing submission records and submission_id references."""
        logger.info("Starting rollback of migration")
        
        # Remove all submissions
        submissions_ref = self.db.collection('submissions')
        docs = submissions_ref.stream()
        
        deleted_count = 0
        for doc in docs:
            submission_data = doc.to_dict()
            if submission_data.get('metadata', {}).get('migrated_from_images'):
                doc.reference.delete()
                deleted_count += 1
                logger.info(f"Deleted submission {doc.id}")
        
        # Remove submission_id from images
        images_ref = self.db.collection('images')
        docs = images_ref.where('submission_id', '!=', None).stream()
        
        updated_count = 0
        for doc in docs:
            doc.reference.update({
                'submission_id': firestore.DELETE_FIELD,
                'migration_updated_at': firestore.DELETE_FIELD
            })
            updated_count += 1
            logger.info(f"Removed submission_id from image {doc.id}")
        
        logger.info(f"Rollback complete: Deleted {deleted_count} submissions, updated {updated_count} images")
    
    def save_migration_log(self):
        """Save migration log to file."""
        import json
        log_file = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_file, 'w') as f:
            json.dump(self.migration_log, f, indent=2)
        logger.info(f"Migration log saved to {log_file}")

async def main():
    parser = argparse.ArgumentParser(description='Migrate to submission-based reports')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', help='Preview changes without executing')
    group.add_argument('--execute', action='store_true', help='Execute migration')
    group.add_argument('--rollback', action='store_true', help='Rollback migration')
    
    args = parser.parse_args()
    
    migrator = SubmissionMigrator()
    
    try:
        if args.dry_run:
            await migrator.migrate_all_users(dry_run=True)
            logger.info("Dry run completed - no changes were made")
        elif args.execute:
            await migrator.migrate_all_users(dry_run=False)
            migrator.save_migration_log()
            logger.info("Migration executed successfully")
        elif args.rollback:
            await migrator.rollback_migration()
            logger.info("Rollback completed successfully")
    
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
