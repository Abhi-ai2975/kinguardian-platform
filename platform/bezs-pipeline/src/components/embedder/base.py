import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

"""
base.py
====================================
Purpose:
    Defines the abstract interface for all data loaders.
"""

class BaseEmbedder(ABC):
    """
    Purpose:
        Abstract base class that enforces across all 
        embedding strategies.
    """

    def embed(self, text: str):
   
        raise NotImplementedError("Child classes must implement the load method!")