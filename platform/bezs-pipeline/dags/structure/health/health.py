"""
Module: Health Data Pipeline DAG
Purpose: Orchestrates RDBMS extraction, JSON transformation, and Elasticsearch loading.
"""

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
from src.components.loaders.factory import LoaderFactory
from src.components.utils.reader import load_yml

logger = logging.getLogger(__name__)

CONFIG_PATH = "dags/structure/health/config/config.yml"

# --- Task Functions ---

def psqlcredential_task(**kwargs: Any) -> Dict[str, Any]:
    """
    Retrieves PostgreSQL credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: Database connection parameters (host, user, pass, etc).
    """
    logger.info("Fetching Postgres credentials.")
    return CredentialFactory.get_provider(mode="airflow", conn_id="healthdb").get_credentials()

def escredential_task(**kwargs: Any) -> Dict[str, Any]:
    """
    Retrieves Elasticsearch credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: ES connection parameters.
    """
    logger.info("Fetching Elasticsearch credentials.")
    return CredentialFactory.get_provider(mode="airflow", conn_id="elasticsearch").get_credentials()

def extraction_task(ti: Any, **kwargs: Any) -> Dict[str, Any]:
    """
    Connects to RDBMS and extracts raw data as a Python dictionary.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    Dict[str, Any]: Raw data extracted from specified tables.
    """
    creds = ti.xcom_pull(task_ids='get_psql_creds')
    config = load_yml(CONFIG_PATH).get("postgres", {}).get("extraction", {})

    connector = ConnectorFactory.get_connector(connector_type="rdbms", config=creds)
    connection = connector() # Established SQLAlchemy connection

    try:
        extractor = ExtractorFactory.get_extractor(
            extractor_type="rdbms", 
            connection=connection, 
            config=config
        )
        return extractor() 
    finally:
        connection.close()

def transformation_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Transforms raw RDBMS rows into Elasticsearch-ready JSON actions.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: List of transformed actions for bulk loading.
    """
    raw_data = ti.xcom_pull(task_ids='extract_health_data')
    # Load configuration for indexing logic
    config = load_yml(CONFIG_PATH).get("elasticsearch", {}).get("load", {})

    transformer = TransformerFactory.get_transformer(
        transformer_type="json",
        data=raw_data,
        config=config
    )
    
    # We convert the generator to a list to pass through XCom
    return list(transformer())

def loading_task(ti: Any, **kwargs: Any) -> None:
    """
    Ingests transformed JSON data into Elasticsearch via Bulk API.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    None: Logs loading status.
    """
    transformed_data = ti.xcom_pull(task_ids='transform_health_data')
    es_creds = ti.xcom_pull(task_ids='get_es_creds')
    config = load_yml(CONFIG_PATH).get("elasticsearch", {}).get("load", {})

    connector = ConnectorFactory.get_connector(connector_type="elasticsearch", config=es_creds)
    es_connection = connector()

    loader = LoaderFactory.get_loader(
        load_type="elasticsearch",
        connection=es_connection,
        config=config
    )

    loader(data=transformed_data)
    logger.info("Health data ingestion successful.")

# --- DAG Definition ---

default_args = {
    'owner': 'alpha_team',
    'retries': 0
}

with DAG(
    'health_data_pipeline',
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False,
    max_active_runs=1,
    tags=["structure", "health", "postgres"]
) as dag:

    get_psql_creds = PythonOperator(
        task_id='get_psql_creds',
        python_callable=psqlcredential_task
    )

    get_es_creds = PythonOperator(
        task_id='get_es_creds',
        python_callable=escredential_task
    )

    extract_health_data = PythonOperator(
        task_id='extract_health_data',
        python_callable=extraction_task
    )

    transform_health_data = PythonOperator(
        task_id='transform_health_data',
        python_callable=transformation_task
    )

    load_to_es = PythonOperator(
        task_id='load_to_es',
        python_callable=loading_task
    )

    # Dependency Flow
    get_psql_creds >> extract_health_data >> transform_health_data >> load_to_es

    get_es_creds

    [transform_health_data, get_es_creds] >> load_to_es