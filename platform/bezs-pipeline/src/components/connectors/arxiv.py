import httpx
import logging
from typing import Optional, Dict, Any
from .base import BaseConnector
from .schemas import ArxivConfig

logger = logging.getLogger(__name__)

"""
arxiv.py
====================================
Purpose:
    Handles asynchronous HTTP connections to the Arxiv API using httpx.
"""

class ArxivConnector(BaseConnector):
    """
    Purpose:
        Responsible for managing the lifecycle of an AsyncClient for 
        efficient, persistent HTTP requests to Arxiv.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Purpose:
            Initialize ArxivConnector settings.

        Args:
            config (Dict): 
                'base_url' (str): API endpoint.
                'timeout_seconds' (int): Request timeout.
        """
        # Validate the incoming dictionary using Pydantic
        self.config = ArxivConfig(**config)
        
        # Access attributes safely from the validated object
        self.base_url = self.config.base_url
        self.timeout = self.config.timeout
        self._client: Optional[httpx.AsyncClient] = None
        
        logger.info(f"ArxivConnector initialized for {self.base_url}")

    async def __call__(self) -> httpx.AsyncClient:
        """
        Purpose:
            Allows async access to the connector to retrieve the HTTP client.

        Returns:
            httpx.AsyncClient (connection object): The active async client.
        """
        return await self.connect()

    async def connect(self) -> httpx.AsyncClient:
        """
        Purpose:
            Creates or reuses an httpx.AsyncClient for persistent sessions.

        Args:
            None

        Returns:
            httpx.AsyncClient (connection object): Active HTTP client instance.
        """
        if self._client is None:
            logger.info("Creating new HTTP client session for Arxiv.")
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)
        else:
            logger.debug("Reusing existing Arxiv HTTP client session.")
        
        return self._client

    async def close(self):
        """
        Purpose:
            Gracefully shuts down the async client and releases resources.

        Args:
            None
            
        Returns:
            None
        """
        if self._client:
            logger.info("Closing Arxiv HTTP client session.")
            await self._client.aclose()
            self._client = None
        else:
            logger.debug("Close called but no HTTP client session exists.")