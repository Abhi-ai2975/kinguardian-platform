import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

"""
base.py
====================================
Purpose:
    Defines the abstract base class for all credential providers.
    Ensures a consistent interface across different storage backends (Airflow, YAML, etc.).
"""

class CredentialProvider(ABC):
    """
    Purpose:
        An Abstract Base Class (ABC) that enforces the implementation of 
        credential retrieval logic in its subclasses.
    """

    @abstractmethod
    def get_credentials(self) -> dict:
        """
        Purpose:
            Abstract method to fetch and return credentials as a dictionary.

        Returns:
            dict: A standardized dictionary containing connection details.
            
        Raises:
            NotImplementedError: If the subclass does not implement this method.
        """
        raise NotImplementedError("Subclasses must implement get_credentials")