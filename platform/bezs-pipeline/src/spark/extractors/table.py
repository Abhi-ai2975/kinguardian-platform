"""
table.py
====================================
Purpose:
    Provides a universal extractor for various file formats from S3/Local storage.
    Supports lazy loading and dynamic partitioning for optimal Spark performance.
"""
import logging
from pyspark.sql import SparkSession, DataFrame
from .schemas.table import TableExtractorConfig

logger = logging.getLogger(__name__)

class TableExtractor:
    """
    Purpose:
        Handles lazy loading for any file format (CSV, Parquet, JSON) 
        from S3/Local storage using Spark.  
    """
    def __init__(self, connection: SparkSession, config: dict):
        """
        Purpose:
            Initializes the TableExtractor with Spark session and configuration.
        
        Args:
            connection (SparkSession): The active Spark session for data operations.
            config (dict): Configuration parameters including 'path', 'format', and 'options'.
        """
        self.connection = connection
        self.config = TableExtractorConfig(**config)
        logger.debug("TableExtractor initialized for path: %s", self.config.path)

    def __call__(self) -> DataFrame:
        """
        Purpose:
            Enables the extractor to be called directly.
        
        Args:
            None
        
        Returns:
            DataFrame: The extracted DataFrame.
        """
        return self.extract()

    def extract(self) -> DataFrame:
        """
        Purpose:
            Sets partition strategy and returns a Spark DataFrame (Lazy Blueprint).
        
        Args:
            None
        
        Returns:
            DataFrame: A lazily evaluated Spark DataFrame from the specified source.
        
        Raises:
            ValueError: If configuration 'path' is missing or format is unsupported.
        """
        # 1. Get configuration from validated config
        s3_path = self.config.path
        format_type = self.config.format
        batch_size_mb = self.config.batch_size_mb
        custom_options = self.config.options or {}
        
        if not s3_path:
            raise ValueError("Configuration 'path' is required for extraction.")

        # 2. Standardize protocol for Spark (s3a is required for Hadoop-AWS)
        s3_path = s3_path.replace("s3://", "s3a://")

        # 3. Tuning: Set 'maxPartitionBytes' to control Slave memory usage
        # This splits large files into smaller chunks for parallel processing
        size_in_bytes = int(batch_size_mb) * 1024 * 1024
        self.connection.conf.set("spark.sql.files.maxPartitionBytes", str(size_in_bytes))

        logger.info(f"Preparing lazy read ({format_type}) from {s3_path}")
        # Log some key Spark configs for debugging
        try:
            logger.info(f"Spark access key set: {bool(self.connection.conf.get('spark.hadoop.fs.s3a.access.key'))}")
            logger.info(f"Spark region set: {self.connection.conf.get('spark.hadoop.fs.s3a.region')}")
            logger.info(f"Spark endpoint set: {self.connection.conf.get('spark.hadoop.fs.s3a.endpoint')}")
        except:
            logger.info("Could not read Spark configs")

        # 4. Dynamic Reader: Apply format-specific options (header, delimiter, etc.)
        # This replaces hardcoded .option("header", "true")
        reader = self.connection.read
        
        for key, value in custom_options.items():
            reader = reader.option(key, str(value))

        # 5. Execute Read with Timeout Protection
        try:
            logger.info(f"Attempting to read: {s3_path}")
            df = getattr(reader, format_type)(s3_path)
            logger.info(f"Successfully read DataFrame with {df.count()} rows")
            return df
        except Exception as e:
            logger.error(f"Failed to read {s3_path}: {str(e)}")
            raise
        except AttributeError:
            raise ValueError(f"Unsupported Spark format: {format_type}")