from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
import os
import json
import yaml

# Get the absolute path to the project directory
PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
MAIN_SCRIPT_PATH = os.path.join(PROJECT_DIR, 'dags/spark/table/main.py')
CONFIG_PATH = os.path.join(PROJECT_DIR, 'dags/spark/table/config.yml')

# Load configuration to get Spark settings
with open(CONFIG_PATH, 'r') as f:
    config = yaml.safe_load(f)

# Build Spark configuration from YAML
spark_conf = {}
if 'conf' in config['spark']:
    spark_conf.update(config['spark']['conf'])

# Build packages string
packages = ','.join(config['spark']['packages']) if 'packages' in config['spark'] else None

# Get S3 credentials from Airflow connection and pass them to Spark
try:
    s3_conn = BaseHook.get_connection('s3')
    s3_credentials = {
        'access_key': s3_conn.login,
        'secret_key': s3_conn.password,
        'session_token': s3_conn.extra_dejson.get('session_token', '')
    }
except Exception as e:
    print(f"Failed to get S3 connection: {e}")
    s3_credentials = {}

# Convert credentials to JSON string for command line argument
credentials_json = json.dumps(s3_credentials)

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 0,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'spark_table_pipeline',
    default_args=default_args,
    description='Spark Table Pipeline with S3 to Elasticsearch',
    schedule=None,
    catchup=False,
    tags=['spark', 'pipeline', 'elasticsearch'],
)

# Spark Submit Task
spark_submit_task = SparkSubmitOperator(
    task_id='spark_table_processing',
    application=MAIN_SCRIPT_PATH,
    conn_id='spark_default',
    application_args=[CONFIG_PATH, credentials_json],
    driver_memory='2g',
    executor_memory='2g',
    executor_cores=2,
    num_executors=2,
    name='spark_table_pipeline',
    packages=packages,
    conf=spark_conf,
    dag=dag,
)