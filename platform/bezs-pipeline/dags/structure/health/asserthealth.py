"""
Module: Health Data Pipeline DAG (Assertion-Based)
Purpose: Orchestrates RDBMS extraction, transformation, and ES loading with data validation.
"""

import logging
from datetime import datetime
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
    Purpose: Retrieves and asserts PostgreSQL credentials.
    """
    creds = CredentialFactory.get_provider(mode="airflow", conn_id="healthdb").get_credentials()
    assert creds and "host" in creds, "Post stack credentials missing 'host' field."
    return creds

def escredential_task(**kwargs: Any) -> Dict[str, Any]:
    """
    Purpose: Retrieves and asserts Elasticsearch credentials.
    """
    creds = CredentialFactory.get_provider(mode="airflow", conn_id="elasticsearch").get_credentials()
    assert creds and "host" in creds, "Elasticsearch credentials missing 'host' field."
    return creds

def extraction_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Purpose: Extracts data and asserts the result is not empty.
    """
    creds = ti.xcom_pull(task_ids='get_psql_creds')
    config = load_yml(CONFIG_PATH).get("postgres", {}).get("extraction", {})

    connector = ConnectorFactory.get_connector(connector_type="rdbms", config=creds)
    connection = connector()

    try:
        extractor = ExtractorFactory.get_extractor("rdbms", connection, config)
        data = list(extractor())
        # Assertion: Ensure we actually pulled records
        assert len(data) > 0, f"Extraction returned 0 records for config: {config}"
        logger.info(f"Extracted {len(data)} records.")
        return data
    finally:
        connection.close()

def transformation_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Purpose: Transforms data and asserts schema compliance.
    """
    raw_data = ti.xcom_pull(task_ids='extract_health_data')
    assert isinstance(raw_data, list), "Raw data must be a list of records."
    
    config = load_yml(CONFIG_PATH).get("elasticsearch", {}).get("load", {})
    transformer = TransformerFactory.get_transformer("json", raw_data, config)
    
    transformed = list(transformer())
    # Assertion: Ensure transformation didn't drop all records
    assert len(transformed) == len(raw_data), "Data loss during transformation."
    return transformed

def loading_task(ti: Any, **kwargs: Any) -> None:
    """
    Purpose: Ingests data and asserts connection health.
    """
    transformed_data = ti.xcom_pull(task_ids='transform_health_data')
    es_creds = ti.xcom_pull(task_ids='get_es_creds')
    
    assert transformed_data, "No data received for loading."

    connector = ConnectorFactory.get_connector("elasticsearch", es_creds)
    es_connection = connector()

    # Assertion: Simple ping or health check before load
    assert es_connection.ping(), "Elasticsearch cluster is unreachable."

    loader = LoaderFactory.get_loader("elasticsearch", es_connection, {})
    loader(data=transformed_data)
    logger.info("Ingestion verified.")

# --- DAG Definition ---

with DAG(
    'assert_health_pipeline',
    default_args={'owner': 'alpha_team', 'retries': 0},
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False
) as dag:

    t1 = PythonOperator(task_id='get_psql_creds', python_callable=psqlcredential_task)
    t2 = PythonOperator(task_id='get_es_creds', python_callable=escredential_task)
    t3 = PythonOperator(task_id='extract_health_data', python_callable=extraction_task)
    t4 = PythonOperator(task_id='transform_health_data', python_callable=transformation_task)
    t5 = PythonOperator(task_id='load_to_es', python_callable=loading_task)

    t1 >> t3 >> t4 >> t5
    [t4, t2] >> t5