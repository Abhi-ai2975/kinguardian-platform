import logging
from opensearchpy import helpers
from .base import BaseLoader
from .schemas import IngestorConfig

logger = logging.getLogger(__name__)

"""
ingestor.py
====================================
Purpose:
    Contains the logic for sending data to Elasticsearch using 
    either single-index or bulk-index strategies.
"""

class OpensearchIngestor(BaseLoader):
    """
    Purpose:
        Parent class to handle common connection management and index 
        initialization (settings/mappings).
    """
    def __init__(self, connection, config):
        """
        Purpose: Initializes the ingestor with an ES connection and config.

        Args:
            connection (Elasticsearch): The active ES client.
            config (dict): YAML configuration for index settings and mappings.
        """
        self.connection = connection
        self.config = IngestorConfig(**config)

    def create(self) -> None:
        """
        Purpose: Ensures the target index exists with proper mappings.

        Returns:
            None
        """
        name = self.config.index_name
        body = {
            "settings": self.config.settings,
            "mappings": self.config.mappings
        }
        if not self.connection.indices.exists(index=name):
            logger.info(f"Index '{name}' does not exist. Creating with provided mappings.")
            self.connection.indices.create(index=name, body=body)
        else:
            logger.debug(f"Index '{name}' already exists.")

    def __call__(self, data):
        """
        Purpose: The entry point for loading. Ensures index setup before ingestion.

        Args:
            data (Any): Data to be loaded.
        """
        self.create()
        return self.load(data)

class OpensearchSingleIngestor(OpensearchIngestor):
    """
    Purpose: Loads data row-by-row. Useful for small datasets or streaming.
    """
    def load(self, data):
        """
        Args:
            data (Iterator): Stream of records.
        """
        logger.info("Starting single-row ingestion.")
        count = 0
        for action in data:
            self.connection.index(
                index=action["_index"],
                body=action["_source"]
            )
            count += 1
        logger.info(f"Successfully indexed {count} documents individually.")

class OpensearchBulkIngestor(OpensearchIngestor):
    """
    Purpose: Loads data in efficient batches using the Elasticsearch helpers.
    """
    def load(self, data):
        """
        Args:
            data (Iterator): Stream of records.
        """
        logger.info("Starting bulk ingestion.")
        try:
            # Set stats_only=False to get the full list of errors
            success, failed = helpers.bulk(self.connection, data, stats_only=False)
            logger.info(f"Bulk indexing complete. Success: {success}, Failed: {len(failed)}")
        except helpers.BulkIndexError as e:
            # THIS IS CRITICAL: Loop through errors to see the REAL cause
            for i, item in enumerate(e.errors):
                # Just show the first few to avoid log spam
                if i < 3:
                    logger.error(f"Sample Failure: {item}")
            raise  # Re-raise so Airflow knows the task failed