import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any
from ..schemas import ArxivDownloaderConfig

logger = logging.getLogger(__name__)

"""
downloader.py
====================================
Purpose:
    Handles the physical downloading of PDF files from arXiv. 
    Manages local storage, directory creation, and streaming transfers 
    to optimize memory usage.
"""

class ArxivDownloader:
    """
    Purpose:
        Infrastructure Layer - Arxiv PDF Downloader.
        Uses a shared connector to maintain a single HTTP session across 
        multiple download tasks.
    """

    def __init__(self, connection, config: ArxivDownloaderConfig):
        """
        Purpose:
            Initializes the downloader, ensures the destination directory exists, 
            and sets up operational limits.

        Args:
            connection: Shared connection object providing the HTTP client.
            config (ArxivDownloaderConfig): Schema-validated configuration object.
        """
        self.connection = connection
        
        # Folder setup
        self.download_dir = Path(config.download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)

        # Operational settings from config
        self.rate_limit_delay = config.rate_limit_delay
        self.max_retries = config.max_retries
        self.retry_backoff = config.retry_backoff
        
        self._last_request_time: Optional[float] = None

        logger.info(f"PDF Downloader initialized | Target: {self.download_dir}")

    async def _rate_limit(self):
        """
        Purpose:
            Internal helper to respect arXiv's polite usage policy.
            Calculates the necessary wait time based on the last request timestamp.
        """
        if self._last_request_time is not None:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.rate_limit_delay:
                wait = self.rate_limit_delay - elapsed
                await asyncio.sleep(wait)
        self._last_request_time = time.time()

    async def download(self, paper: Dict, force: bool = False) -> Optional[Path]:
        """
        Purpose:
            Downloads a PDF for a given paper if it doesn't already exist.
            Uses a retry mechanism with exponential backoff for resilience.

        Args:
            paper (Dict): Dictionary containing 'pdf_url' and 'arxiv_id'.
            force (bool): If True, redownloads the file even if it exists locally.

        Returns:
            Optional[Path]: Path object to the downloaded file, or None if failed.
        """
        pdf_url = paper.get("pdf_url")
        arxiv_id = paper.get("arxiv_id")

        if not pdf_url or not arxiv_id:
            logger.error("Missing pdf_url or arxiv_id")
            return None

        pdf_path = self.download_dir / f"{arxiv_id}.pdf"

        # Cache check
        if pdf_path.exists() and not force:
            logger.info(f"Using cached PDF: {pdf_path.name}")
            return pdf_path

        await self._rate_limit()
        
        # Use the SHARED client from the connector
        client = await self.connection()

        logger.info(f"Downloading: {arxiv_id}")

        for attempt in range(1, self.max_retries + 1):
            try:
                # Streaming the download to save memory
                async with client.stream("GET", pdf_url) as response:
                    response.raise_for_status()
                    
                    with open(pdf_path, "wb") as f:
                        async for chunk in response.aiter_bytes():
                            f.write(chunk)

                logger.info(f"Download successful: {pdf_path.name}")
                return pdf_path

            except Exception as e:
                if attempt == self.max_retries:
                    logger.error(f"Failed {arxiv_id} after {attempt} retries: {e}")
                    return None

                wait = self.retry_backoff * attempt
                logger.warning(f"Retry {attempt}/{self.max_retries} in {wait}s...")
                await asyncio.sleep(wait)

        return None
    