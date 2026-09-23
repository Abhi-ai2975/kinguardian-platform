"""
rdbms.py
====================================
Purpose:
    Demonstrates RDBMS data loading using factory pattern.
    Shows complete pipeline from data loading to database insertion.
"""
import logging
import json
import sys

from src.components.credentials import CredentialFactory
from src.components.connectors import ConnectorFactory
from src.components.loaders import LoaderFactory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """
    Purpose:
        Executes the complete RDBMS data loading pipeline.
    
    Args:
        None
    
    Returns:
        None
    """
    logger.info("Starting RDBMS data loading example")
    
    # 1. Load Data
    try:
        with open('examples/loaders/data.json', 'r') as f:
            sample_data = json.load(f)
        logger.info(f"Loaded {len(sample_data)} records from data.json")
    except FileNotFoundError:
        logger.error("data.json not found.")
        sys.exit(1)

    # 2. Get Credentials & Connector
    logger.debug("Retrieving RDBMS credentials and connector")
    creds = CredentialFactory.get_provider("local", "rdbms").get_credentials()
    logger.info(f"Credentials: {creds}")

    connector = ConnectorFactory.get_connector("rdbms", creds)
    logger.info(f"Connector: {connector}")

    # 3. Define Loader Config
    # This tells the RDBMS Loader where the data goes
    loader_config = {
        "table_name": "rdbmsload", 
        "columns": ["id", "text_content", "metadata", "embedding", "created_at"]
    }
    logger.debug("Loader configuration prepared")

    # 4. Get Loader via Factory
    # Note: Ensure your LoaderFactory passes the connector AND loader_config
    loader = LoaderFactory.get_loader("rdbms", connector, loader_config)
    logger.info("RDBMS loader created via factory")

    # 5. EXECUTE THE INGESTION (Crucial Step)
    try:
        logger.info("Starting data ingestion to RDBMS")
        # This triggers the __call__ method in the RDBMSLoader
        rows_inserted = loader(sample_data) 
        logger.info(f"Ingestion successful! {rows_inserted} rows added.")
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        sys.exit(1)
    
    logger.info("RDBMS data loading example completed successfully")

if __name__ == "__main__":
    main()