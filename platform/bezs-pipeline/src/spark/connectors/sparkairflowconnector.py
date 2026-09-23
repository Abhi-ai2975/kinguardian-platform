"""
sparkairflowconnector.py
====================================
Purpose:
    Provides a Spark connector optimized for Airflow environments.
    Leverages existing Spark sessions and configures S3 access dynamically.
"""
import logging
from pyspark.sql import SparkSession
from .sparkconnector import SparkConnector
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SparkAirflowConnector(SparkConnector):
    """
    Purpose:
        Extends SparkConnector for Airflow-specific Spark session management.
        Uses existing Spark sessions and applies S3 configuration at runtime.
    """
    def connect(self) -> SparkSession:
        """
        Purpose:
            Gets existing Spark session and configures S3 access.

        Args:
            None

        Returns:
            SparkSession: An existing Spark session with S3 configuration applied.
        """
        # 1. Get the session (already has JARs from SparkSubmit)
        spark = SparkSession.builder.getOrCreate()
        logger.info("Retrieved existing Spark session for Airflow connector")
            
        # 2. Set S3 configurations using the correct keys from CredentialFactory
        if self.config:
            logger.debug("Configuring S3 access for Airflow Spark session")
            h_conf = spark.sparkContext._jsc.hadoopConfiguration()
            
            # Map 'login' to access key and 'password' to secret key
            h_conf.set("fs.s3a.access.key", self.config.login or "")
            h_conf.set("fs.s3a.secret.key", self.config.password or "")
            h_conf.set("fs.s3a.endpoint", self.config.host or "s3.amazonaws.com")
            h_conf.set("fs.s3a.region", self.config.region_name or "")
            
            # Essential for Spark 4.1 + S3A
            h_conf.set("fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
            h_conf.set("fs.s3a.aws.credentials.provider", "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
            logger.info("S3 configuration applied to Spark session")
            
        return spark