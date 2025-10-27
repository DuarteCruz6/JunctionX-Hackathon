import os
import time
import logging
from typing import Dict, Any
from gradio_client import Client, handle_file

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Enable debug logs
ch = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)
logger.addHandler(ch)


class HuggingFaceML:
    """Gradio Client ML integration for Acacia detection using YOLOv8."""

    def __init__(self):
        self.space_url = os.getenv('HUGGINGFACE_SPACE_URL')
        if not self.space_url:
            raise ValueError("HUGGINGFACE_SPACE_URL environment variable is required")

        self.api_token = os.getenv('HF_API_TOKEN')

        # Initialize Gradio Client
        logger.debug(f"Initializing Gradio client for {self.space_url}")
        self.client = Client(self.space_url, hf_token=self.api_token)

        # API endpoint
        self.api_name = "/predict"
        logger.debug(f"Client initialized with API endpoint {self.api_name}")

    async def run_inference(self, image_url: str) -> Dict[str, Any]:
        """Run inference on an image URL."""
        start_time = time.time()
        stage_times = {}

        try:
            logger.info(f"Starting ML inference for image URL: {image_url}")

            # Prepare file for Gradio client
            prep_start = time.time()
            file_handle = handle_file(image_url)
            stage_times['preparation'] = time.time() - prep_start
            logger.debug(f"Prepared image handle in {stage_times['preparation']:.2f}s")

            # Run inference (synchronously, wrapped in async)
            inf_start = time.time()
            loop = asyncio.get_event_loop()
            raw_results = await loop.run_in_executor(None, lambda: self.client.predict(
                image=file_handle,
                api_name=self.api_name
            ))
            stage_times['api_call'] = time.time() - inf_start
            logger.debug(f"Inference call completed in {stage_times['api_call']:.2f}s")

            # Process results
            process_start = time.time()
            processed_results = self._process_results(raw_results, start_time)
            stage_times['processing'] = time.time() - process_start
            logger.debug(f"Processing completed in {stage_times['processing']:.2f}s")

            total_time = time.time() - start_time
            processed_results['performance_metrics'] = {
                'total_time': total_time,
                'stage_times': stage_times
            }
            logger.info(f"ML inference completed successfully in {total_time:.2f}s")

            return processed_results

        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"ML inference failed after {total_time:.2f}s: {e} Stage times: {stage_times}")
            raise Exception(f"ML inference failed: {str(e)}")

    async def run_inference_from_file(self, file_content: bytes) -> Dict[str, Any]:
        """Run inference on raw image bytes."""
        start_time = time.time()
        stage_times = {}

        try:
            logger.info(f"Starting ML inference for file content ({len(file_content)} bytes)")

            # Prepare file handle
            prep_start = time.time()
            file_handle = handle_file(file_content)
            stage_times['preparation'] = time.time() - prep_start
            logger.debug(f"Prepared image handle in {stage_times['preparation']:.2f}s")

            # Run inference
            inf_start = time.time()
            loop = asyncio.get_event_loop()
            raw_results = await loop.run_in_executor(None, lambda: self.client.predict(
                image=file_handle,
                api_name=self.api_name
            ))
            stage_times['api_call'] = time.time() - inf_start
            logger.debug(f"Inference call completed in {stage_times['api_call']:.2f}s")

            # Process results
            process_start = time.time()
            processed_results = self._process_results(raw_results, start_time)
            stage_times['processing'] = time.time() - process_start
            logger.debug(f"Processing completed in {stage_times['processing']:.2f}s")

            total_time = time.time() - start_time
            processed_results['performance_metrics'] = {
                'total_time': total_time,
                'stage_times': stage_times
            }
            logger.info(f"ML inference completed successfully in {total_time:.2f}s")

            return processed_results

        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"ML inference failed after {total_time:.2f}s: {e} Stage times: {stage_times}")
            raise Exception(f"ML inference failed: {str(e)}")

    def _process_results(self, raw_results: Any, start_time: float) -> Dict[str, Any]:
        """Process Gradio raw results into old-style structured output."""
        logger.debug(f"Processing raw results: {raw_results}")
        detections = []
        if raw_results:
            # Gradio output returns 'path' or 'url' for the image
            detections.append({
                "raw_output": raw_results,
                "label": "acacia",
                "confidence": None,
                "bbox": None,
                "mask": None
            })

        total_time = time.time() - start_time
        return {
            "detections": detections,
            "num_detections": len(detections),
            "average_confidence": None,
            "coverage_percentage": None,
            "processing_time": round(total_time, 2),
            "model_version": self.space_url
        }


# Global ML instance
ml_model = HuggingFaceML()

# Convenience functions
async def run_acacia_detection(image_url: str) -> Dict[str, Any]:
    return await ml_model.run_inference(image_url)

async def run_acacia_detection_from_file(file_content: bytes) -> Dict[str, Any]:
    return await ml_model.run_inference_from_file(file_content)
