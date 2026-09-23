"""
spark.py
====================================
Purpose:
    Demonstrates complete Spark data processing pipeline.
    Shows extraction, transformation, embedding, and loading workflow.
"""
import logging
import yaml
from pyspark.sql import SparkSession

from src.components.credentials.factory import CredentialFactory
from src.spark.connectors.factory import ConnectorFactory
from src.spark.extractors.factory import ExtractorFactory
from src.spark.transformers.factory import TransformerFactory
from src.spark.embedders.factory import EmbedderFactory
from src.spark.loaders.factory import LoaderFactory
from src.components.utils import load_yml

# Path to our updated YAML
CONFIG_PATH = "/home/logi/github/alphaesai/aiplatform/dags/structure/aws/config/config.yml"
config = load_yml(CONFIG_PATH)

logger = logging.getLogger(__name__)

def spark_pipeline():
    """
    Purpose:
        Executes the complete Spark data processing pipeline.
    
    Args:
        None
    
    Returns:
        None
    """
    logger.info("Starting Spark data processing pipeline")
    
    # 1. CREDENTIAL
    logger.info("Fetching S3 credentials from Local Connection.")
    creds = CredentialFactory.get_provider(mode="local", conn_id="s3").get_credentials()

    # 2. CONNECTOR
    logger.debug("Creating Spark connector and establishing session")
    connector = ConnectorFactory.create("spark", creds)
    spark = connector.connect()
    logger.info("Spark session established successfully")

    # 3. EXTRACT
    logger.info("Starting data extraction from S3")
    extractor = ExtractorFactory.create("table", spark, config['extractor'])
    df = extractor.extract()
    logger.info(f"Data extracted successfully, schema: {df.schema}")

    # 4. TRANSFORM (Cleaning & Structing)
    logger.info("Starting data transformation")
    transformer = TransformerFactory.create("table", df, config['transformation'])
    df_transformed = transformer.transform()
    logger.info(f"Data transformed successfully, schema: {df_transformed.schema}")

    # 5. EMBED (Vectorizing via mapInPandas)
    logger.info("Starting text embedding process")
    embedder = EmbedderFactory.create("spark", df_transformed, config['embedding'])
    df_embedded = embedder.embed()
    logger.info(f"Embedding completed successfully, schema: {df_embedded.schema}")

    # Debug: Show result
    logger.info("Displaying embedding results")
    print("Embedding completed!")
    print(f"DataFrame schema: {df_embedded.schema}")
    print(f"Sample data:")
    df_embedded.show(1, truncate=80)

    # 6. LOAD (Push to Elasticsearch)
    logger.info("Starting data loading to Elasticsearch")
    loader = LoaderFactory.create("elasticsearch", df_embedded, config['elasticsearch'])
    loader.load(df_embedded)
    logger.info("Data loaded to Elasticsearch successfully")
    print("Pipeline completed successfully! Data loaded to Elasticsearch!")

    spark.stop()
    logger.info("Spark session stopped")
    logger.info("Spark data processing pipeline completed successfully")

if __name__ == "__main__":
    spark_pipeline()