"""
__init__.py
====================================
Purpose:
    Exports Spark embedder classes and configuration schemas.
    Provides convenient access to Spark text embedding components.
"""
from .sparkembedder import SparkEmbedder
from .schemas import SparkEmbedderConfig

__all__ = ["SparkEmbedder", "SparkEmbedderConfig"]