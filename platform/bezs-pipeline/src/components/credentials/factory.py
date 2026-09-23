import logging
from .airflow import AirflowCredentials
from .local.credentials import LocalCredentialProvider 

logger = logging.getLogger(__name__)

"""
factory.py
====================================
Purpose:
    Implements a Factory to decide which credential storage backend to use.
    Supports switching between cloud/orchestrator (Airflow) and local environments.
"""

class CredentialFactory:
    """
    Purpose:
        Orchestrator for credential providers. It selects the appropriate 
        class based on the execution 'mode'.
    """

    @staticmethod
    def get_provider(mode: str, conn_id: str):
        """
        Purpose:
            Returns an instance of a CredentialProvider based on the mode.

        Args:
            mode (str): The source of credentials ('airflow' or 'local').
            conn_id (str): The identifier for the specific connection.

        Returns:
            CredentialProvider: An initialized provider instance.

        Raises:
            ValueError: If an unsupported mode is provided.
        """
        mode = mode.lower().strip()
        logger.info(f"CredentialFactory selecting provider for mode: {mode}")

        if mode == "airflow":
            return AirflowCredentials(conn_id)
        
        elif mode == "local":
            return LocalCredentialProvider(conn_id)
        
        else:
            error_msg = f"Unknown mode: {mode}. Use 'airflow' or 'local'."
            logger.error(error_msg)
            raise ValueError(error_msg)