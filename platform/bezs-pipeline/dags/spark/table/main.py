import logging
import yaml
import sys
import os
import json
from pyspark.sql import SparkSession

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../'))

from src.components.credentials.factory import CredentialFactory
from src.spark.connectors.factory import ConnectorFactory
from src.spark.extractors.factory import ExtractorFactory
from src.spark.transformers.factory import TransformerFactory
from src.spark.embedders.factory import EmbedderFactory
from src.spark.loaders.factory import LoaderFactory
from src.components.utils import load_yml

logger = logging.getLogger(__name__)

def spark_pipeline(config_path, credentials):
    """
    Spark pipeline function that can be called from Airflow DAG
    """
    # Load configuration
    config = load_yml(config_path)
    
    # 1. CREDENTIAL (Using credentials passed from DAG)
    logger.info("Using credentials passed from DAG.")
    creds = credentials

    # 2. CONNECTOR
    connector = ConnectorFactory.create("sparkairflowconnector", creds)
    spark = connector.connect()

    try:
        # 3. EXTRACT
        extractor = ExtractorFactory.create("sparkairflowextractor", spark, config['extractor'])
        df = extractor.extract()

        # 4. TRANSFORM (Cleaning & Structing)
        transformer = TransformerFactory.create("table", df, config['transformation'])
        df_transformed = transformer.transform()

        # 5. EMBED (Vectorizing via mapInPandas)
        embedder = EmbedderFactory.create("spark", df_transformed, config['embedding'])
        df_embedded = embedder.embed()
        
        # Debug: Show result
        print("Embedding completed!")
        print(f"DataFrame schema: {df_embedded.schema}")
        print(f"Sample data:")
        df_embedded.show(1, truncate=80)

        # 6. LOAD (Push to Elasticsearch)
        loader = LoaderFactory.create("elasticsearch", df_embedded, config['elasticsearch'])
        loader.load(df_embedded)
        print("Pipeline completed successfully! Data loaded to Elasticsearch!")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    # For local testing - create dummy credentials
    config_path = "/home/logi/github/alphaesai/aiplatform/dags/spark/table/config.yml"
    dummy_credentials = {
        'access_key': 'test_key',
        'secret_key': 'test_secret',
        'session_token': ''
    }
    spark_pipeline(config_path, dummy_credentials)