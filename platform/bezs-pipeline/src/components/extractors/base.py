import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

"""
base.py
====================================
Purpose:
    Defines the contract for all data extraction logic.
"""

class BaseExtractor(ABC):
    """
    Purpose:
        Abstract Base Class that enforces an 'extract' method for all 
        source-specific extractor implementations.
    """

    @abstractmethod
    def extract(self):
        """
        Purpose:
            Executes the extraction logic for the specific data source.

        Raises:
            NotImplementedError: If the subclass does not implement this method.
        """
        raise NotImplementedError("Subclasses must implement extract()")