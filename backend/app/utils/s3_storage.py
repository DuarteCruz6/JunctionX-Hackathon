import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional
import uuid
from datetime import datetime

class S3Storage:
    """AWS S3 storage utility for image and result storage."""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        
        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET environment variable is required")
    
    async def upload_file(self, file_content: bytes, key: str, content_type: str = 'image/jpeg') -> str:
        """
        Upload file content to S3.
        
        Args:
            file_content: File content as bytes
            key: S3 object key
            content_type: MIME type of the file
        
        Returns:
            str: S3 URL of the uploaded file
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                ContentType=content_type,
                ACL='private'  # Private by default for security
            )
            
            # Generate presigned URL for access (valid for 1 hour)
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=3600
            )
            
            return url
            
        except ClientError as e:
            raise Exception(f"S3 upload failed: {str(e)}")
    
    async def download_file(self, key: str) -> bytes:
        """
        Download file content from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            bytes: File content
        """
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
            
        except ClientError as e:
            raise Exception(f"S3 download failed: {str(e)}")
    
    async def delete_file(self, key: str) -> bool:
        """
        Delete file from S3.
        
        Args:
            key: S3 object key
        
        Returns:
            bool: True if successful
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
            
        except ClientError as e:
            raise Exception(f"S3 delete failed: {str(e)}")
    
    def generate_key(self, prefix: str, filename: str) -> str:
        """
        Generate S3 key with timestamp and UUID.
        
        Args:
            prefix: Folder prefix (e.g., 'images', 'results')
            filename: Original filename
        
        Returns:
            str: Generated S3 key
        """
        timestamp = datetime.now().strftime("%Y/%m/%d")
        unique_id = str(uuid.uuid4())
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        
        return f"{prefix}/{timestamp}/{unique_id}.{file_extension}"

# Global S3 instance
s3_storage = S3Storage()

# Convenience functions
async def upload_to_s3(file_content: bytes, filename: str, content_type: str = 'image/jpeg') -> str:
    """
    Upload file to S3 with automatic key generation.
    
    Args:
        file_content: File content as bytes
        filename: Original filename
        content_type: MIME type
    
    Returns:
        str: S3 URL
    """
    key = s3_storage.generate_key('images', filename)
    return await s3_storage.upload_file(file_content, key, content_type)

async def upload_prediction_results(image_id: str, results: dict) -> str:
    """
    Upload prediction results to S3.
    
    Args:
        image_id: Image identifier
        results: Prediction results dictionary
    
    Returns:
        str: S3 URL of results
    """
    import json
    
    # Convert results to JSON
    results_json = json.dumps(results, indent=2)
    results_bytes = results_json.encode('utf-8')
    
    # Generate key for results
    key = s3_storage.generate_key('results', f"{image_id}_results.json")
    
    return await s3_storage.upload_file(
        results_bytes, 
        key, 
        'application/json'
    )

async def download_from_s3(s3_url: str) -> bytes:
    """
    Download file from S3 using presigned URL.
    
    Args:
        s3_url: S3 presigned URL
    
    Returns:
        bytes: File content
    """
    import requests
    
    try:
        response = requests.get(s3_url)
        response.raise_for_status()
        return response.content
        
    except requests.RequestException as e:
        raise Exception(f"Failed to download from S3: {str(e)}")
