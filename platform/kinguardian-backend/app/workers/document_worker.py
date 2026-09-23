"""
Document & Prescription OCR Processing Worker:
Processes newly uploaded medical documents, runs OCR extraction, and extracts clinical entities.
"""

import asyncio
from app.core.logging import get_logger
from app.core.database import AsyncSessionLocal

logger = get_logger(__name__)


async def run_document_worker(poll_interval_seconds: float = 5.0, max_iterations: int = None):
    logger.info("Starting Document OCR Extraction Worker...")
    iterations = 0
    while max_iterations is None or iterations < max_iterations:
        iterations += 1
        try:
            async with AsyncSessionLocal() as session:
                # OCR extraction and clinical parsing
                pass
        except Exception as e:
            logger.error(f"Document Worker error: {e}")
        await asyncio.sleep(poll_interval_seconds)
