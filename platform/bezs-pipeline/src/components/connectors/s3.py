import boto3
from .schemas.s3 import S3Config

class S3Connector:
    def __init__(self, config: dict):
        self.config = S3Config(**config)
        self._client = None

    def connect(self):
        """
        Creates and returns an S3 client with custom endpoint.
        """
        session = boto3.Session(
            aws_access_key_id=self.config.login,     # Map login here
            aws_secret_access_key=self.config.password, # Map password here
            region_name=self.config.region_name
        )
        # Use config.host as endpoint
        self._client = session.client(
            's3', 
            endpoint_url=f"https://{self.config.host}"
        )
        return self._client