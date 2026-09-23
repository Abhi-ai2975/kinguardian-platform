import logging
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from .schemas import GmailConfig
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

"""
gmail.py
====================================
Purpose:
    Handles authentication and service creation for the Google Gmail API 
    using OAuth2 credentials.
"""

class GmailConnector:
    """
    Purpose:
        A connector to manage the Gmail API service instance. 
        It uses authorized user info to build a discovery service.
    """

    def __init__(self, config: dict):
        """
        Purpose:
            Initializes the GmailConnector with OAuth2 configuration.

        Args:
            config (dict): Must contain 'token_dict' with valid OAuth2 tokens.
        """
        self.config = GmailConfig(**config)
        self._service = None

    def __call__(self):
        """
        Purpose:
            Returns the Gmail service instance when called.

        Returns:
            googleapiclient.discovery.Resource: The Gmail API service object.
        """
        return self.connect()

    def connect(self):
        """
        Purpose:
            Builds the Gmail API service if it hasn't been initialized yet.
            Uses the 'gmail.readonly' scope by default.

        Args:
            None

        Returns:
            googleapiclient.discovery.Resource: The active Gmail service.
        """
        if not self._service:
            logger.info("Initializing Gmail API service...")
            try:
                # 1. Convert Pydantic object to Dict
                # from_authorized_user_info needs a dict, not a class instance
                info = self.config.model_dump()
                
                # 2. Initialize Credentials
                creds = Credentials.from_authorized_user_info(
                    info,
                    scopes=self.config.scopes
                )

                # 3. Automatic Refresh Logic
                # This is what handles the 'expiry' being in 2025
                if not creds or not creds.valid:
                    if creds and creds.expired and creds.refresh_token:
                        logger.info("Gmail Token expired. Refreshing using refresh_token...")
                        creds.refresh(Request())
                    else:
                        raise Exception("Credentials invalid and no refresh token available.")

                # 4. Build the service
                self._service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
                logger.info("Gmail service successfully built.")
                
            except Exception as e:
                logger.exception("Failed to build Gmail service.")
                raise
        return self._service