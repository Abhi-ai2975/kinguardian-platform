import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

"""
base.py
====================================
Purpose:
    Defines the abstract interface for all data loaders.
"""

class BaseLoader(ABC):
    """
    Purpose:
        Abstract base class that enforces a 'load' method across all 
        ingestion strategies (Single, Bulk, etc.).
    """

    @abstractmethod
    def load(self, data):
        """
        Purpose:
            Enforces the implementation of the load method in child classes.
        
        Args:
            data (Any): The data or iterator to be loaded into the destination.
            
        Returns:
            None
        """
        raise NotImplementedError("Child classes must implement the load method!")