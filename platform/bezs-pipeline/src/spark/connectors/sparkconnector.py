"""
sparkconnector.py
====================================
Purpose:
    Provides a connector for Apache Spark sessions with S3 integration.
    Supports dynamic package configuration and AWS credentials management.
"""
import logging
from pyspark.sql import SparkSession
from .schemas.sparkconnector import SparkConnectorConfig

logger = logging.getLogger(__name__)

class SparkConnector:   
    """
    Purpose:
        Manages the lifecycle of a Spark session with S3 connectivity.
        Handles AWS credentials and package configuration for Spark operations.
    """
    _instance = None  # Singleton instance

    def __init__(self, config: dict):
        """
        Purpose:
            Initializes the SparkConnector with Spark configuration.

        Args:
            config (dict): Spark parameters including 'host', 'login',
            'password', 'region_name', 'app_name', and 'packages'.
        """
        self.config = SparkConnectorConfig(**config)
        self._spark = None
        logger.debug("SparkConnector initialized for host: %s", self.config.host)

    def connect(self) -> SparkSession:
        """
        Purpose:
            Creates and returns a Spark session with S3 configuration.

        Args:
            None

        Returns:
            SparkSession: An active Spark session configured for S3 access.

        Raises:
            Exception: If Spark session creation fails.
        """
        # Singleton check: Don't create a new session if one exists
        if self._spark:
            return self._spark

        logger.info("Initializing Spark Session via SparkConnector")
        try:
            # Move these to your YAML config under 'spark_packages'
            # Change the default_packages list to match the 3.3.4 versions
            default_packages = [
                "org.apache.hadoop:hadoop-aws:3.3.4",
                "com.amazonaws:aws-java-sdk-bundle:1.12.262",
                "org.elasticsearch:elasticsearch-spark-30_2.12:8.15.1"
            ]
            
            packages = self.config.packages or default_packages

            raw_host = self.config.host or ""
            clean_host = raw_host.replace("https://", "").replace("http://", "").rstrip("/")

            builder = SparkSession.builder.appName(self.config.app_name or "S3SparkConnector") \
                .config("spark.jars.packages", ",".join(packages)) \
                .config("spark.hadoop.fs.s3a.access.key", self.config.login) \
                .config("spark.hadoop.fs.s3a.secret.key", self.config.password) \
                .config("spark.hadoop.fs.s3a.region", self.config.region_name) \
                .config("spark.hadoop.fs.s3a.endpoint", self.config.host) \
                .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
                .config("spark.hadoop.fs.s3a.aws.credentials.provider", "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider") \
                .config("spark.hadoop.fs.s3a.committer.name", "magic") \
                .config("spark.hadoop.fs.s3a.committer.magic.enabled", "true") \
                .config("spark.hadoop.fs.s3a.fast.upload", "true")

            if clean_host and "amazonaws.com" not in clean_host:
                builder.config("spark.hadoop.fs.s3a.path.style.access", "true")
            
            self._spark = builder.getOrCreate()
            return self._spark

        except Exception as e:
            logger.exception("Spark session creation failed.")
            raise
