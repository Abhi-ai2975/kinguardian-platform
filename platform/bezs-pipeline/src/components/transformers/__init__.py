"""
Transformers Package
====================
Purpose:
    Handles cleaning, data-type standardization, and segmentation 
    of raw data into search-ready formats.
"""

from .factory import TransformerFactory
from .base import BaseTransformer
from .arxiv import DoclingEngine, PDFTransformer, TextChunker
from .schemas import *

__all__ = [
    "TransformerFactory",
    "BaseTransformer",
    "DoclingEngine",
    "PDFTransformer",
    "TextChunker",
]