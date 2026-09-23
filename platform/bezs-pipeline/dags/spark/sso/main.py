"""
main.py
====================================
Purpose:
    Executes SSO-optimized Spark pipeline for Airflow DAG.
    Handles ETL process with credential integration and error handling.
"""
import sys
import json
import logging
from src.components.utils import load_yml
from src.spark.connectors.factory import ConnectorFactory
from src.spark.extractors.factory import ExtractorFactory
from src.spark.transformers.factory import TransformerFactory
from src.spark.embedders.factory import EmbedderFactory
from src.spark.loaders.factory import LoaderFactory

# Set up logging for the Driver
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PipelineRunner")

def run_pipeline(config_path, creds_json):
    """
    Purpose:
        Executes the complete Spark pipeline with SSO optimization.
    
    Args:
        config_path (str): Path to YAML configuration file.
        creds_json (str): JSON string containing S3 credentials.
    
    Returns:
        None
    
    Raises:
        Exception: If pipeline execution fails.
    """
    logger.info(f"Starting pipeline execution with config: {config_path}")
    
    try:
        # 1. Load YAML Config
        logger.debug("Loading YAML configuration")
        config = load_yml(config_path)
        
        # 2. Parse Credentials from Airflow
        logger.debug("Parsing credentials from Airflow")
        creds = json.loads(creds_json)

        # 3. Merge Credentials
        spark_config = config.get("spark", {})
        spark_config.update(creds)
        logger.info("Configuration and credentials merged successfully")

        # 4. Initialize Spark
        logger.info("Initializing Spark Session...")
        connector = ConnectorFactory.create("spark", spark_config)
        spark = connector.connect()
        logger.info("Spark session established successfully")
        # 5. ETL Execution
        logger.info("Step 1/4: Extracting data...")
        df = ExtractorFactory.create("table", spark, config["extractor"]).extract()
        logger.info(f"Data extracted successfully, schema: {df.schema}")
    
        logger.info("Step 2/4: Transforming data...")
        transformed_df = TransformerFactory.create("table", df, config.get("transformation", {})).transform()
        logger.info(f"Data transformed successfully, schema: {transformed_df.schema}")
    
        logger.info("Step 3/4: Generating Embeddings (This may trigger distributed computation)...")
        embedded_df = EmbedderFactory.create("spark", transformed_df, config["embedding"]).embed()
        logger.info(f"Embeddings generated successfully, schema: {embedded_df.schema}")
    
        # BOTTLENECK REMOVED: No more parquet write. 
        # We pass the 'live' DataFrame directly to the loader.
    
        # 6. Loading
        logger.info("Step 4/4: Loading data into Elasticsearch...")
        # NOTE: Ensure your LoaderFactory.create accepts the DataFrame 'embedded_df' 
        # as an argument to avoid it trying to re-extract data from a path.
        loader = LoaderFactory.create("sparkairflowloader", spark, config["elasticsearch"])
        loader.load(embedded_df)

        logger.info("Pipeline execution completed successfully.")
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}", exc_info=True)
        raise
    finally:
        # Ensure Spark session is properly closed
        if 'spark' in locals():
            spark.stop()
            logger.info("Spark session stopped")

if __name__ == "__main__":
    try:
        run_pipeline(sys.argv[1], sys.argv[2])
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}", exc_info=True)
        sys.exit(1)