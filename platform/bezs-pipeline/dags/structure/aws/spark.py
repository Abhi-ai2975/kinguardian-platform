import logging
from datetime import datetime
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator

# Internal imports (Assuming your project structure)
from src.components.credentials import CredentialFactory
from src.spark.connectors.factory import ConnectorFactory
from src.spark.extractors.factory import ExtractorFactory
from src.spark.transformers.factory import TransformerFactory
from src.spark.embedders.factory import EmbedderFactory
from src.spark.loaders.factory import LoaderFactory
from src.components.utils import load_yml

logger = logging.getLogger(__name__)

# Path to our updated YAML
CONFIG_PATH = "/home/logi/github/alphaesai/aiplatform/dags/structure/aws/config/config.yml"
config = load_yml(CONFIG_PATH)

default_args = {
    'owner': 'alpha_team',
    'start_date': datetime(2026, 1, 1),
    'retries': 0
}

def get_credentials_task(**context):
    """
    Task 1: Fetch S3 credentials.
    Returns a dict that Airflow can serialize into XCom.
    """
    logger.info("Fetching S3 credentials from Airflow Connection.")
    creds = CredentialFactory.get_provider(mode="airflow", conn_id="s3").get_credentials()
    return creds

def spark_pipeline_task(**context):
    """
    Task 2: Spark Processing (Extract -> Transform -> Embed -> Parquet).
    """
    ti = context["ti"]
    credentials = ti.xcom_pull(task_ids="get_credentials_task")
    
    # Initialize Spark locally in this worker process
    connector = ConnectorFactory.create("spark", credentials)
    spark = connector.connect()
    
    # 1. Extract from S3
    extractor = ExtractorFactory.create("table", spark, config["extractor"])
    df = extractor.extract()
    
    # 2. Transform
    transformer = TransformerFactory.create("table", df, config.get("transformation", {}))
    transformed_df = transformer.transform()
    
    # 3. Embed
    embedder = EmbedderFactory.create("spark", transformed_df, config["embedding"])
    embedded_df = embedder.embed()      # id, text, metadata, row_vector
    
    # 4. Save to Checkpoint (Crucial for passing data to next task)
    checkpoint_path = config["elasticsearch"]["checkpoint_path"]
    logger.info(f"Saving processed data to {checkpoint_path}")
    embedded_df.write.mode("overwrite").parquet(checkpoint_path)
    
    return checkpoint_path      # checkpoint_path

def loader_task(**context):
    """
    Task 3: Load to Elasticsearch.
    Reads the Parquet file from the checkpoint.
    """
    ti = context["ti"]
    credentials = ti.xcom_pull(task_ids="get_credentials_task")
    checkpoint_path = ti.xcom_pull(task_ids="spark_pipeline_task")
    
    # Initialize a fresh Spark session for the Loader
    connector = ConnectorFactory.create("spark", credentials)
    spark = connector.connect()
    
    # Logic inside your LoaderFactory should read from checkpoint_path
    loader = LoaderFactory.create("elasticsearch", spark, config["elasticsearch"])
    loader.load()
    
    logger.info("Data successfully loaded to Elasticsearch.")

with DAG(
    dag_id="spark_etl_pipeline",
    default_args=default_args,
    schedule="@monthly",
    catchup=False,
    tags=["spark", "s3", "elasticsearch"],
) as dag:

    # 1. Credential Fetcher
    get_creds = PythonOperator(
        task_id="get_credentials_task",
        python_callable=get_credentials_task,
    )

    # 2. Processing Pipeline
    run_pipeline = PythonOperator(
        task_id="spark_pipeline_task",
        python_callable=spark_pipeline_task,
    )

    # 3. Elastic Loader
    run_loader = PythonOperator(
        task_id="loader_task",
        python_callable=loader_task,
    )

    # Dependency Flow
    get_creds >> run_pipeline >> run_loader