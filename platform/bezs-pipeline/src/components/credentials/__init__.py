import logging

"""
Credentials Package
===================
Purpose:
    Handles abstraction of credential retrieval from various sources.
"""

from .factory import CredentialFactory
from .base import CredentialProvider
from .airflow import AirflowCredentials

__all__ = [
    "CredentialFactory",
    "CredentialProvider",
    "AirflowCredentials"
]

# Set a default logger for the package
logging.getLogger(__name__).addHandler(logging.NullHandler())