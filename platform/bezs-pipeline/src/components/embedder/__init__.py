import logging

from .factory import EmbedderFactory
from .txtai import TxtaiEmbeddings
from .jina import JinaEmbeddingsService
from .schemas import EmbeddingsConfig, JinaEmbeddingRequest, JinaEmbeddingResponse


# Define the public API for the package
__all__ = [
    "EmbedderFactory",
    "TxtaiEmbeddings",
    "JinaEmbeddingsService",
    "EmbeddingsConfig",
    "JinaEmbeddingRequest",
    "JinaEmbeddingResponse"
]

# Set a default logger for the package to prevent "No handler found" warnings
logging.getLogger(__name__).addHandler(logging.NullHandler())