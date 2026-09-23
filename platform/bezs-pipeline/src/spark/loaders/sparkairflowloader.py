"""
sparkairflowloader.py
====================================
Purpose:
    Provides Elasticsearch data loading optimized for Airflow environments.
    Extends Elasticsearch functionality with Airflow-specific optimizations.
"""
import logging
import requests
import os
from pyspark.sql import DataFrame
from pyspark.sql.functions import size, col

logger = logging.getLogger(__name__)

class SparkAirflowLoader:
    """
    Purpose:
        Manages Elasticsearch data loading optimized for Airflow environments.
        Handles absolute paths and network configuration for SparkSubmit context.
    """
    def __init__(self, spark, config: dict):
        """
        Purpose:
            Initializes the SparkAirflowLoader with Spark session and config.
        
        Args:
            spark: The active Spark session for data operations.
            config (dict): Configuration parameters including index_name, host, port, and SSL settings.
        """
        self.spark = spark
        self.config = config
        self.index_name = config['index_name']
        
        # 1. Force Absolute Paths (Crucial for SparkSubmit context)
        self.jks_path = os.path.abspath(config.get("ssl_jks_path", ""))
        self.pem_path = os.path.abspath(config.get("ssl_pem_path", ""))
        self.jks_pw = config.get("jks_password", "changeit")
        
        # 2. Network - Use 127.0.0.1 instead of localhost for Spark 4.x stability
        self.host = config.get("host", "127.0.0.1")
        self.port = config.get("port", 9200)
        self.use_ssl = str(config.get("use_ssl", "true")).lower() == "true"
        self.protocol = "https" if self.use_ssl else "http"
        
        # 3. Auth
        self.username = config.get("username")
        self.password = config.get("password")
        self.auth = (self.username, self.password) if self.username else None

        # Validate Files immediately on Driver
        if self.use_ssl and not os.path.exists(self.jks_path):
            raise FileNotFoundError(f"CRITICAL: JKS file not found at {self.jks_path}")
        
        logger.debug("SparkAirflowLoader initialized for index: %s", self.index_name)

    def _prepare_index(self):
        """
        Purpose:
            Prepares Elasticsearch index using Python Requests.
        
        Args:
            None
        
        Returns:
            None
        """
        index_url = f"{self.protocol}://{self.host}:{self.port}/{self.index_name}"
        verify_ssl = self.pem_path if self.use_ssl else False
        
        logger.info(f"Pre-flight check: {index_url}")
        try:
            resp = requests.head(index_url, auth=self.auth, verify=verify_ssl, timeout=10)
            if resp.status_code != 200:
                logger.info(f"Creating index {self.index_name}...")
                payload = {
                    "settings": self.config.get("settings", {}),
                    "mappings": self.config.get("mappings", {})
                }
                requests.put(index_url, json=payload, auth=self.auth, verify=verify_ssl).raise_for_status()
        except Exception as e:
            logger.error(f"Failed to reach ES from Driver: {e}")
            raise

    def load(self, df: DataFrame):
        """
        Purpose:
            Loads DataFrame into Elasticsearch using distributed Spark processing.
        
        Args:
            df (DataFrame): The Spark DataFrame containing data to load.
        
        Returns:
            None
        """
        logger.info("Starting Airflow-optimized Elasticsearch load for index: %s", self.index_name)
        self._prepare_index()

        vector_col = self.config.get("vector_column", "row_vector")
        # Filter rows that failed embedding
        df_clean = df.filter(size(col(vector_col)) > 0)
        
        logger.debug("Filtered DataFrame to %d rows with non-empty vectors", df_clean.count())

        es_options = {
            "es.nodes": self.host,
            "es.port": str(self.port),
            "es.resource": f"{self.index_name}/_doc", # Fixed format
            "es.mapping.id": "id", # Ensure your df has an 'id' column!
            "es.write.operation": "index",
            
            # Connectivity
            "es.nodes.wan.only": "true", 
            "es.nodes.discovery": "false",
            "es.protocol": self.protocol,
            
            # SSL Security
            "es.net.ssl": "true" if self.use_ssl else "false",
            "es.net.ssl.truststore.location": f"file://{self.jks_path}",
            "es.net.ssl.truststore.pass": self.jks_pw,
            "es.net.ssl.cert.allow.self.signed": "true",
            "es.net.http.auth.user": self.username or "",
            "es.net.http.auth.pass": self.password or "",

            # Performance
            "es.batch.size.entries": "500",      # Reduced for vector stability
            "es.batch.write.retry.count": "5",
            "es.http.timeout": "10m"             # Long timeout for vector distance calc
        }

        
        logger.info(f"Commencing Spark write to ES at {self.host}...")
        (df_clean.write
            .format("org.elasticsearch.spark.sql")
            .options(**es_options)
            .mode(self.config.get("write_mode", "append"))
            .save())
        
        logger.info("Airflow-optimized Elasticsearch load completed successfully")

    def __call__(self, df: DataFrame):
        """
        Purpose:
            Enables the loader to be called directly.
        
        Args:
            df (DataFrame): The Spark DataFrame containing data to load.
        
        Returns:
            None
        """
        self.load(df)