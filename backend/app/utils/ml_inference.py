import requests
import os
import json
import time
from typing import Dict, List, Any, Optional
import base64
from PIL import Image
import io

class HuggingFaceML:
    """Hugging Face ML model integration for Acacia detection."""
    
    def __init__(self):
        self.api_token = os.getenv('HF_API_TOKEN')
        self.model_name = os.getenv('HF_MODEL_NAME', 'HUGGINGFACE_MODEL_ID')
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        
        if not self.api_token:
            raise ValueError("HF_API_TOKEN environment variable is required")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    async def run_inference(self, image_url: str) -> Dict[str, Any]:
        """
        Run Acacia detection inference on an image.
        
        Args:
            image_url: URL or path to the image
        
        Returns:
            dict: Prediction results with detections and confidence scores
        """
        try:
            # Download image from S3 URL
            image_content = await self._download_image(image_url)
            
            # Prepare the request
            payload = {
                "inputs": image_content,
                "parameters": {
                    "confidence_threshold": 0.3,
                    "return_mask": True,
                    "return_confidence": True
                }
            }
            
            # Make API request
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                results = response.json()
                return self._process_results(results)
            
            elif response.status_code == 503:
                # Model is loading, wait and retry
                return await self._handle_model_loading()
            
            else:
                raise Exception(f"Hugging Face API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            raise Exception(f"ML inference failed: {str(e)}")
    
    async def _download_image(self, image_url: str) -> str:
        """
        Download image and convert to base64.
        
        Args:
            image_url: Image URL
        
        Returns:
            str: Base64 encoded image
        """
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            return image_base64
            
        except Exception as e:
            raise Exception(f"Failed to download image: {str(e)}")
    
    async def _handle_model_loading(self) -> Dict[str, Any]:
        """
        Handle model loading by waiting and retrying.
        
        Returns:
            dict: Prediction results after model loads
        """
        max_retries = 5
        retry_delay = 10  # seconds
        
        for attempt in range(max_retries):
            try:
                time.sleep(retry_delay)
                
                # Try a simple request to check if model is ready
                response = requests.get(
                    f"{self.api_url}/status",
                    headers=self.headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    # Model is ready, retry inference
                    return await self.run_inference(self.last_image_url)
                
            except Exception as e:
                print(f"Model loading attempt {attempt + 1} failed: {e}")
                continue
        
        raise Exception("Model failed to load after multiple attempts")
    
    def _process_results(self, raw_results: List[Dict]) -> Dict[str, Any]:
        """
        Process raw ML results into structured format.
        
        Args:
            raw_results: Raw results from Hugging Face API
        
        Returns:
            dict: Processed results with statistics
        """
        detections = []
        total_confidence = 0
        
        for result in raw_results:
            if result.get('label') == 'acacia' and result.get('score', 0) > 0.3:
                detection = {
                    'label': result.get('label', 'acacia'),
                    'confidence': round(result.get('score', 0), 3),
                    'bbox': result.get('box', {}),
                    'mask': result.get('mask', None)
                }
                detections.append(detection)
                total_confidence += detection['confidence']
        
        # Calculate statistics
        num_detections = len(detections)
        avg_confidence = total_confidence / max(num_detections, 1)
        
        # Estimate coverage percentage (simplified)
        coverage_percentage = min(num_detections * 2.5, 100)  # Rough estimate
        
        return {
            'detections': detections,
            'num_detections': num_detections,
            'average_confidence': round(avg_confidence, 3),
            'coverage_percentage': round(coverage_percentage, 2),
            'processing_time': time.time(),
            'model_version': self.model_name,
            'confidence_threshold': 0.3
        }
    
    async def test_model_connection(self) -> bool:
        """
        Test connection to Hugging Face model.
        
        Returns:
            bool: True if connection successful
        """
        try:
            response = requests.get(
                f"{self.api_url}/status",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
            
        except Exception:
            return False

# Global ML instance
ml_model = HuggingFaceML()

# Convenience function
async def run_acacia_detection(image_url: str) -> Dict[str, Any]:
    """
    Run Acacia detection on an image.
    
    Args:
        image_url: URL to the image
    
    Returns:
        dict: Detection results
    """
    return await ml_model.run_inference(image_url)

# Test function for development
async def test_ml_pipeline():
    """Test the ML pipeline with a sample image."""
    try:
        # Test with a sample image URL (replace with actual test image)
        test_url = "https://example.com/test_forest_image.jpg"
        results = await run_acacia_detection(test_url)
        print("ML Pipeline Test Results:", json.dumps(results, indent=2))
        return True
        
    except Exception as e:
        print(f"ML Pipeline Test Failed: {e}")
        return False
