import pytest
import httpx
import asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any

from src.custom.embedder.jina import JinaEmbeddingsService

# --- Fixtures ---

@pytest.fixture
def jina_config() -> Dict[str, Any]:
    """Standard configuration for Jina tests."""
    return {
        "model": "jina-embeddings-v3",
        "dimensions": 1024,
        "tasks": {
            "passage": "retrieval_passages",
            "query": "retrieval_query"
        },
        "max_retries": 3,
        "base_backoff": 0.001,  # Fast retries for testing
        "batch_size": 2
    }

@pytest.fixture
def mock_connector():
    """
    Mocks the JinaConnector.
    Crucially, it returns a client with a base_url so that relative 
    paths in the source code (like 'embeddings') are resolved correctly.
    """
    connector = MagicMock()
    # The trailing slash in base_url is important for httpx joining logic
    client = httpx.AsyncClient(base_url="https://api.jina.ai/v1/")
    connector.connect = AsyncMock(return_value=client)
    return connector

# --- Tests ---

@pytest.mark.asyncio
async def test_embed_passages_success(httpx_mock, mock_connector, jina_config):
    """Test successful embedding generation for a batch of text."""
    
    # Setup Mock Response for the full resolved URL
    httpx_mock.add_response(
        method="POST",
        url="https://api.jina.ai/v1/embeddings",
        json={
            "model": "jina-embeddings-v3",
            "object": "list",
            "data": [
                {"embedding": [0.1, 0.2]},
                {"embedding": [0.3, 0.4]}
            ],
            "usage": {"total_tokens": 10}
        },
        status_code=200
    )

    service = JinaEmbeddingsService(mock_connector, jina_config)
    
    texts = ["chunk one", "chunk two"]
    result = await service.embed_passages(texts)

    # Assertions
    assert len(result) == 2
    assert result[0] == [0.1, 0.2]
    assert result[1] == [0.3, 0.4]

@pytest.mark.asyncio
async def test_embed_passages_retry_on_429(httpx_mock, mock_connector, jina_config):
    """Test that the service retries when hitting a 429 rate limit."""
    
    # 1st call: Rate Limit, 2nd call: Success
    httpx_mock.add_response(
        method="POST",
        url="https://api.jina.ai/v1/embeddings",
        status_code=429, 
        headers={"Retry-After": "0.01"}
    )
    httpx_mock.add_response(
        method="POST",
        url="https://api.jina.ai/v1/embeddings",
        status_code=200, 
        json={
            "model": "m", 
            "object": "l", 
            "data": [{"embedding": [1.0]}], 
            "usage": {"total_tokens": 5}
        }
    )

    service = JinaEmbeddingsService(mock_connector, jina_config)
    
    result = await service.embed_passages(["Retry test"])

    assert result[0] == [1.0]
    # Verify exactly 2 attempts were made
    assert len(httpx_mock.get_requests()) == 2

@pytest.mark.asyncio
async def test_embed_query_success(httpx_mock, mock_connector, jina_config):
    """Test specialized query embedding generation."""
    
    httpx_mock.add_response(
        method="POST",
        url="https://api.jina.ai/v1/embeddings",
        json={
            "model": "jina-embeddings-v3",
            "object": "list",
            "data": [{"embedding": [0.9, 0.8]}],
            "usage": {"total_tokens": 5}
        },
        status_code=200
    )

    service = JinaEmbeddingsService(mock_connector, jina_config)
    
    result = await service.embed_query("What is Jina?")

    assert result == [0.9, 0.8]

@pytest.mark.asyncio
async def test_max_retries_exceeded(httpx_mock, mock_connector, jina_config):
    """Test that the service eventually gives up after max_retries."""
    
    # Mock 500 errors for all allowed attempts (max_retries = 3)
    for _ in range(3):
        httpx_mock.add_response(
            method="POST",
            url="https://api.jina.ai/v1/embeddings",
            status_code=500
        )

    service = JinaEmbeddingsService(mock_connector, jina_config)
    
    with pytest.raises(RuntimeError, match="Max retries exceeded"):
        await service.embed_passages(["This will fail"])