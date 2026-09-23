"""
dag.py
====================================
Purpose:
    Defines Airflow DAG for SSO-optimized Spark pipeline execution.
    Orchestrates credential retrieval and Spark job submission.
"""
import os
import json
import logging
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from src.components.credentials import CredentialFactory

logger = logging.getLogger(__name__)

# Use realpath to resolve any symlinks Airflow might be using
BASE_DIR = os.path.dirname(os.path.realpath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.yml")
SCRIPT_PATH = os.path.join(BASE_DIR, "main.py")

PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))

ZIP_PATH = os.path.join(PROJECT_ROOT, "src.zip")

def fetch_creds(**context):
    """
    Purpose:
        Retrieves S3 credentials from Airflow connection.
    
    Args:
        **context: Airflow context dictionary.
    
    Returns:
        dict: S3 credentials for Spark pipeline.
    """
    logger.info("Fetching S3 credentials from Airflow connection")
    creds = CredentialFactory.get_provider(mode="airflow", conn_id="s3").get_credentials()
    logger.debug("Credentials retrieved successfully")
    return creds

with DAG(
    dag_id="spark_sso_pipeline",
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False,
) as dag:
    logger.info("Initializing SSO Spark pipeline DAG")

    get_creds = PythonOperator(
        task_id="get_airflow_creds",
        python_callable=fetch_creds
    )

    submit_job = SparkSubmitOperator(
        task_id="run_spark_main",
        application=SCRIPT_PATH,
        conn_id="spark_default",
        # ESSENTIAL: This makes src.components, src.spark, etc. importable
        py_files=ZIP_PATH,
        packages="org.apache.hadoop:hadoop-aws:3.4.0,"
             "com.amazonaws:aws-java-sdk-bundle:1.12.720,"
             "org.elasticsearch:elasticsearch-spark-30_2.12:8.17.0",
        application_args=[
            CONFIG_PATH,
            # Use the tojson filter instead of json.dumps
            "{{ ti.xcom_pull(task_ids='get_airflow_creds') | tojson }}"
        ],
        # spark configuration parameters
        conf={
            "spark.master": "local[*]",     # Run spark locally using all available CPU cores
            "spark.submit.deployMode": "client",    # client: local testing, cluster: distributed production
            "spark.driver.host": "127.0.0.1",       # other workers use to connect to the driver
            "spark.driver.bindAddress": "127.0.0.1" # the driver listens on for connections
        }
    )
    
    logger.info("SSO Spark pipeline DAG configured successfully")

    get_creds >> submit_job