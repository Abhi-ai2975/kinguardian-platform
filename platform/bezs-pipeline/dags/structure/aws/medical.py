import warnings
import logging

# Warnings and Logging setup
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", module="skops")
logging.getLogger("skops").setLevel(logging.ERROR)

from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator
from typing import Any, Dict, List

# Internal imports
from src.components.credentials.factory import CredentialFactory
from src.components.connectors.factory import ConnectorFactory
from src.components.extractors.factory import ExtractorFactory
from src.components.transformers.factory import TransformerFactory
from src.components.embedder.factory import EmbedderFactory
from src.components.utils import load_yml
# from src.components.loaders.factory import LoaderFactory

logger = logging.getLogger(__name__)

def s3credentials(**kwargs: Any) -> Dict[str, Any]:
    """
    Retrieves s3 credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: Database connection parameters (host, user, pass, etc).
    """
    logger.info("Fetching s3 credentials.")
    return CredentialFactory.get_provider(mode="airflow", conn_id="s3").get_credentials()

# def escredential_task(**kwargs: Any) -> Dict[str, Any]:
#     """
#     Retrieves Elasticsearch credentials via the CredentialFactory.
#     args:
#     **kwargs: Airflow context arguments.
#     returns:
#     Dict[str, Any]: ES connection parameters.
#     """
#     logger.info("Fetching Elasticsearch credentials.")
#     return CredentialFactory.get_provider(mode="airflow", conn_id="elasticsearch").get_credentials()

def process_medical_data(**kwargs):
    # 1. Setup Spark & Credentials
    # Note: Fixed task_id to match 'escredentials_task' defined in the DAG
    creds = kwargs['ti'].xcom_pull(task_ids='s3credentials_task')
    es_creds = kwargs['ti'].xcom_pull(task_ids='escredentials_task')

    spark = ConnectorFactory.get_connector(connector_type="s3", config=creds)()
    config = load_yml("dags/structure/aws/config/config.yml")

    # Prepare merged config for the loader
    es_config = config.get('loader', {})
    full_es_config = {**es_creds, **es_config}

    # 2. Extract
    df = ExtractorFactory.get_extractor(
        extractor_type="spark",
        connection=spark,
        config=config['extraction']
    )() 

    # 3. Transform
    transformed_df = TransformerFactory.get_transformer(
        transformer_type="table",
        data=df,
        config=config.get('transformation', {})
    )()

    # 4. Embed 
    embedder_obj = EmbedderFactory.get_embedder(
        embedder_type="spark",
        data=transformed_df,
        config=config.get('embedding', {})
    )
    
    # Generate the DataFrame plan
    # We call .persist() so the vectors stay in RAM after the first action
    final_df = embedder_obj(spark).persist()
    
    # # 5. Initialize Loader
    # # We pass 'final_df' here so the Loader has the data reference
    # espark_loader = LoaderFactory.get_loader(
    #     load_type="spark",
    #     data=final_df,
    #     config=full_es_config
    # )

    # # 6. Execution (Triggering the Actions)
    # logger.info("--- Starting Distributed Execution ---")
    
    # # First Action: Show some data (This triggers the S3 -> Transform -> Embed flow)
    # final_df.show(5)
    
    # # Second Action: Load to ES (This uses the already computed vectors in RAM)
    # logger.info("Pushing vectors to Elasticsearch...")
    # espark_loader() 

    # # 7. Cleanup
    # final_df.unpersist()
    # logger.info("Pipeline complete. Memory cleared.")

default_args = {
    'owner': 'alpha_team',
    'retries': 0
}

with DAG(
    's3_health_pipeline',
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False
) as dag:

    s3_creds_task = PythonOperator(
        task_id='s3credentials_task', # Used as task_ids in xcom_pull
        python_callable=s3credentials
    )

    # es_creds_task = PythonOperator(
    #     task_id='escredentials_task', # Used as task_ids in xcom_pull
    #     python_callable=escredential_task
    # )

    s3_extractor_task = PythonOperator(
        task_id='s3_extractor_task',
        python_callable=process_medical_data
    )

    # Establish the dependency so XCom has data to pull
    s3_creds_task >> s3_extractor_task

    # es_creds_task >> s3_extractor_task