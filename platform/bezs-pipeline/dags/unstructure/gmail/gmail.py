"""
Module: Gmail Data Pipeline DAG
Purpose: Orchestrates Gmail data flow: Credentials -> Extraction -> Transformation -> Embedding -> Loading.
"""

import warnings
import logging

# Standard ignore for common Airflow and library warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
# Specific ignore for the skops/txtai noise
warnings.filterwarnings("ignore", module="skops")

# Set external loggers to ERROR only to reduce noise
logging.getLogger("skops").setLevel(logging.ERROR)

from airflow import DAG
from datetime import datetime
from airflow.providers.standard.operators.python import PythonOperator
from typing import Any, Dict, List

# Factory & Utility Imports
from src.components.credentials.factory import CredentialFactory
from src.components.connectors.factory import ConnectorFactory
from src.components.extractors.factory import ExtractorFactory
from src.components.transformers.factory import TransformerFactory
from src.components.loaders.factory import LoaderFactory
from src.components.embedder.factory import EmbedderFactory
from src.components.utils.reader import load_yml, load_pickle

logger = logging.getLogger(__name__)

# --- Task Functions ---

def credentials_task(**kwargs: Any) -> Dict[str, Any]:
    """
    Fetches Gmail credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: The credential dictionary including token paths.
    """
    logger.info("Retrieving Gmail credentials.")
    return CredentialFactory.get_provider(mode="airflow", conn_id="gmailv2").get_credentials()

def es_credentials_task(**kwargs: Any) -> Dict[str, Any]:
    """
    Fetches Elasticsearch credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: The credential dictionary for ES authentication.
    """
    logger.info("Retrieving Elasticsearch credentials.")
    return CredentialFactory.get_provider(mode="airflow", conn_id="elasticsearch").get_credentials()

def extraction_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Connects to Gmail API and extracts raw message data based on query.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: List of extracted raw Gmail records.
    """
    creds = ti.xcom_pull(task_ids='get_credentials')
    # creds['token_dict'] = load_pickle(creds['token_path'])
    
    full_config = load_yml("dags/unstructure/gmail/config/config.yml")
    gmail_config = full_config.get('gmail_pipeline', {})
    
    connector = ConnectorFactory.get_connector(connector_type="gmail", config=creds)
    service = connector()
    
    extractor = ExtractorFactory.get_extractor("gmail", service, gmail_config.get('extraction'))
    data = list(extractor.extract())
    
    logger.info(f"Extracted {len(data)} records from Gmail.")
    return data

def transformation_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Transforms raw records into segmented, cleaned document chunks.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: List of transformed text chunks ready for embedding.
    """
    raw_records = ti.xcom_pull(task_ids='extract_gmail_data')
    full_config = load_yml("dags/unstructure/gmail/config/config.yml")
    trans_config = full_config.get('gmail_pipeline', {}).get('transformation', {})
    
    transformer = TransformerFactory.get_transformer(
        transformer_type="document", 
        data=raw_records, 
        config=trans_config
    )
    return list(transformer())

def embedder_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Generates vector embeddings for text chunks using the specified model.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: Records enriched with high-dimensional vector arrays.
    """
    chunks = ti.xcom_pull(task_ids='transform_data')
    full_config = load_yml("dags/unstructure/gmail/config/config.yml")
    embed_config = full_config.get('gmail_pipeline', {}).get('embeddings', {})
    
    embedder = EmbedderFactory.get_embedder(embedder_type="txtai", data=chunks, config=embed_config)
    return list(embedder.embed())

def loading_task(ti: Any, **kwargs: Any) -> None:
    """
    Performs bulk loading of enriched data into the Elasticsearch index.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    None: Operation logs status to logger.
    """
    enriched_data = ti.xcom_pull(task_ids='generate_embeddings')
    es_creds = ti.xcom_pull(task_ids='get_es_credentials')
    
    full_config = load_yml("dags/unstructure/gmail/config/config.yml")
    load_config = full_config.get('gmail_pipeline', {}).get('load', {})

    connector = ConnectorFactory.get_connector(connector_type="elasticsearch", config=es_creds)
    es_conn = connector()
    
    loader = LoaderFactory.get_loader(load_type="elasticsearch", connection=es_conn, config=load_config)
    loader(data=enriched_data)
    logger.info("Gmail data loading complete.")

# --- DAG Definition ---

default_args = {'owner': 'alpha_team', 'retries': 0}

with DAG(
    'gmail_data_pipeline', 
    default_args=default_args,
    start_date=datetime(2026, 1, 1), 
    schedule="@monthly", 
    catchup=False,
    max_active_runs=1,
    tags=["gmail", "txtai", "elasticsearch"]
) as dag:

    get_credentials = PythonOperator(
        task_id='get_credentials', 
        python_callable=credentials_task
    )

    get_es_credentials = PythonOperator(
        task_id='get_es_credentials', 
        python_callable=es_credentials_task
    )

    extract_gmail_data = PythonOperator(
        task_id='extract_gmail_data', 
        python_callable=extraction_task
    )

    transform_data = PythonOperator(
        task_id='transform_data', 
        python_callable=transformation_task
    )

    generate_embeddings = PythonOperator(
        task_id='generate_embeddings', 
        python_callable=embedder_task
    )

    load_to_es = PythonOperator(
        task_id='load_to_es', 
        python_callable=loading_task
    )

    # Execution Flow
    get_credentials >> extract_gmail_data >> transform_data >> generate_embeddings >> load_to_es

    [generate_embeddings, get_es_credentials] >> load_to_es