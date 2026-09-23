import asyncio
import logging
import random
from typing import List, Dict, Any

import httpx

from .schemas import (
    JinaEmbeddingRequest,
    JinaEmbeddingResponse,
)
from src.components.connectors import JinaConnector

logger = logging.getLogger(__name__)

"""
jina.py
====================================
Purpose:
    Infrastructure service for interacting with the Jina AI Embeddings API. 
    Handles the conversion of text chunks into high-dimensional vectors 
    while managing network resilience and rate limits.
"""

class JinaEmbeddingsService:
    """
    Generates embeddings for passages and queries using
    Jina Embeddings v3 via a shared JinaConnector.
    """

    def __init__(self, connection, config: Dict[str, Any]):
        """
        Initialize embeddings service.

        Args:
            connection : 
                Initialized HTTP connector for Jina API.
            config : dict
                Required keys:
                - max_retries (int)
                - base_backoff (float)
                - model (str)
                - dimensions (int)
                - tasks (dict)
        """
        self.connection = connection
        
        self.max_retries: int = config.get("max_retries", 5)
        self.base_backoff: float = config.get("base_backoff", 1.0)  # secondsbase_backoff is the initial delay (in seconds) applied before the very first retry attempt.
        
        # Embedding config
        self.model = config["model"]
        self.dimensions = config["dimensions"]
        self.tasks = config["tasks"]
        self.batch_size = config.get("batch_size", 100)
   
    async def _post(
        self,
        client: httpx.AsyncClient,
        url: str,
        payload: dict,
        ) -> dict:
        """
        Execute POST request with retry, exponential backoff,
        jitter, and Retry-After support.

        Args:
            client : httpx.AsyncClient
                The active HTTP client session.
            url : str
                API endpoint path.
            payload : dict
                The request body.

        Returns:
            dict
                The parsed JSON response.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.post(url, json=payload)

                # Rate Limits: The server says "You are sending requests too fast!"
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    delay = (float(retry_after) if retry_after else self.base_backoff * (2 ** (attempt - 1)))

                    logger.warning("Rate limited (429). Retry %d/%d in %.2fs", attempt, self.max_retries, delay)
                    await asyncio.sleep(delay)
                    continue

                response.raise_for_status()
                return response.json()

            # network lag: The server took too long to answer
            except httpx.TimeoutException:
                delay = self._compute_backoff(attempt)
                logger.warning("Timeout. Retry %d/%d in %.2fs", attempt, self.max_retries, delay)
                await asyncio.sleep(delay)

            # 500-599 (Server Error) & 400-499 (Client Error)
            except httpx.HTTPStatusError as e:
                status = e.response.status_code

                if 500 <= status < 600:
                    delay = self._compute_backoff(attempt)
                    logger.warning("Server error %s. Retry %d/%d in %.2fs", status, attempt, self.max_retries, delay,)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Non-retriable HTTP error: %s", status)
                    raise

            # Network Failures: Wi-Fi dropped or the DNS failed.
            except httpx.HTTPError as e:
                delay = self._compute_backoff(attempt)
                logger.warning("Network error. Retry %d/%d in %.2fs | %s", attempt, self.max_retries, delay, e)
                await asyncio.sleep(delay)

        raise RuntimeError("Max retries exceeded for embeddings request")

    def _compute_backoff(self, attempt: int) -> float:
        """
        Compute exponential backoff with jitter to avoid 'thundering herd' issues.
        Jitter is just intentional randomness added to a wait timer.

        Args:
            attempt : int
                The current retry attempt number.

        Returns:
            float
                Wait time in seconds.
        """
        base = self.base_backoff * (2 ** (attempt - 1))
        jitter = random.uniform(0, base * 0.3)
        return base + jitter

    
    async def embed_passages(
        self,
        texts: List[str],
        batch_size: int = 100,
        ) -> List[List[float]]:
        """
        Generate embeddings for text passages in batches.

        Args:
            texts : list[str]
                Text passages to embed.
            batch_size : int
                Number of passages per API request.

        Returns:
            list[list[float]]
                List of embedding vectors.
        """
        client = await self.connection.connect()
        embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            payload = JinaEmbeddingRequest(
                model=self.model,
                task=self.tasks["passage"],
                dimensions=self.dimensions,
                input=batch,
                late_chunking=False,
                embedding_type="float"
            )

            response_json = await self._post(client, "embeddings", payload.model_dump())

            result = JinaEmbeddingResponse(**response_json)
            embeddings.extend([item["embedding"] for item in result.data])

            logger.debug("Embedded %d passages", len(batch))

        logger.info("Generated %d passage embeddings", len(embeddings))
        return embeddings   

    async def embed_query(self, query: str) -> List[float]:
        """
        Generate a specialized embedding for a search query.

        Args:
            query : str
                Query text.

        Returns:
            list[float]
                Single query embedding vector.
        """
        client = await self.connection.connect()

        payload = JinaEmbeddingRequest(
            model=self.model,
            task=self.tasks["query"],
            dimensions=self.dimensions,
            input=[query],
            late_chunking=False,
            embedding_type="float"
        )

        response_json = await self._post(client, "embeddings", payload.model_dump())

        result = JinaEmbeddingResponse(**response_json)
        return result.data[0]["embedding"]