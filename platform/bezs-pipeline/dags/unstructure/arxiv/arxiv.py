"""
Module: Arxiv Data Pipeline DAG
Purpose: Orchestrates Arxiv flow: Metadata Extraction -> PDF Download -> Docling Transform -> Chunking -> Embedding -> Loading.
"""

import logging
import asyncio
import warnings

# Warnings and Logging setup
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", module="skops")
logging.getLogger("skops").setLevel(logging.ERROR)

from datetime import datetime
from typing import Any, Dict, List
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator

# Factory & Utility Imports
from src.components.credentials.factory import CredentialFactory
from src.components.connectors.factory import ConnectorFactory
from src.components.extractors.factory import ExtractorFactory
from src.components.transformers.factory import TransformerFactory
from src.components.embedder.factory import EmbedderFactory
from src.components.loaders.factory import LoaderFactory
from src.components.utils.reader import load_yml

logger = logging.getLogger(__name__)

CONFIG_PATH = "dags/unstructure/arxiv/config/arxiv.yml"

# --- Task Functions ---

def get_arxiv_creds(**kwargs: Any) -> Dict[str, Any]:
    """
    Fetches Arxiv API credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: The credential dictionary.
    """
    return CredentialFactory.get_provider(mode="airflow", conn_id="arxiv").get_credentials()

def get_es_creds(**kwargs: Any) -> Dict[str, Any]:
    """
    Fetches Elasticsearch credentials via the CredentialFactory.
    args:
    **kwargs: Airflow context arguments.
    returns:
    Dict[str, Any]: The credential dictionary for ES.
    """
    return CredentialFactory.get_provider(mode="airflow", conn_id="elasticsearch").get_credentials()

def extraction_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Downloads PDFs and metadata from Arxiv based on YAML query settings.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: List of paper metadata including local file paths.
    """
    config = load_yml(CONFIG_PATH).get('arxiv', {})
    creds = ti.xcom_pull(task_ids='get_arxiv_creds')
    
    # Merge credentials with search settings
    full_config = {**config, **creds}
    
    # 1. Get the connector first
    connector = ConnectorFactory.get_connector(connector_type="arxiv", config=full_config)
    
    # 2. Pass it to the extractor
    extractor = ExtractorFactory.get_extractor(
        extractor_type="arxiv", 
        connection=connector, 
        config=full_config
    )
    
    # Arxiv extractor returns a list of dictionaries with metadata and local_pdf_path
    papers = asyncio.run(extractor.extract())
    logger.info(f"Extracted {len(papers)} papers from Arxiv.")
    return papers

def transformation_task(ti: Any, **kwargs: Any) -> List[Any]:
    """
    Converts raw PDF files into structured JSON using Docling.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Any]: List of structured PdfContent objects.
    """
    papers = ti.xcom_pull(task_ids='extract_pdfs')
    config = load_yml(CONFIG_PATH).get('docling', {})
    
    # The PDF Transformer takes the list of paper dicts and parses the 'local_pdf_path'
    transformer = TransformerFactory.get_transformer(
        transformer_type="pdf", 
        data=papers, 
        config=config
    )
    
    structured_data = asyncio.run(transformer())
    return structured_data

def chunking_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Slices structured content into smaller text chunks for indexing.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: List of text chunks with associated metadata.
    """
    structured_data = ti.xcom_pull(task_ids='pdf_to_structured_content')
    config = load_yml(CONFIG_PATH).get('chunker', {})
    
    chunker = TransformerFactory.get_transformer(
        transformer_type="chunker",
        data=structured_data,
        config=config
    )
    
    return list(chunker())

def embedder_task(ti: Any, **kwargs: Any) -> List[Dict[str, Any]]:
    """
    Generates semantic vector embeddings for paper chunks.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    List[Dict[str, Any]]: Chunks enriched with 'vector' arrays.
    """
    chunks = ti.xcom_pull(task_ids='chunk_structured_content')
    # Using 'embeddings' key from YAML
    full_config = load_yml(CONFIG_PATH)
    config = full_config.get('embeddings', {})
    
    logger.info(f"Full YAML config keys: {list(full_config.keys())}")
    logger.info(f"Embeddings config: {config}")
    logger.info(f"Embeddings config type: {type(config)}")
    
    # Standardized Factory call matching the Gmail pattern
    embedder = EmbedderFactory.get_embedder(embedder_type="txtai", data=chunks, config=config)
    return list(embedder.embed())

def loading_task(ti: Any, **kwargs: Any) -> None:
    """
    Loads enriched Arxiv chunks into the Elasticsearch index.
    args:
    ti: Airflow Task Instance for XCom access.
    returns:
    None: Logs completion status.
    """
    enriched_data = ti.xcom_pull(task_ids='embed_chunks')
    es_creds = ti.xcom_pull(task_ids='get_es_creds')
    config = load_yml(CONFIG_PATH).get('elasticsearch', {}).get('load', {})
    
    connector = ConnectorFactory.get_connector(connector_type="elasticsearch", config=es_creds)
    es_conn = connector()
    
    loader = LoaderFactory.get_loader(load_type="elasticsearch", connection=es_conn, config=config)
    loader(data=enriched_data)
    logger.info("Arxiv data loading complete.")

# --- DAG Definition ---

default_args = {'owner': 'alpha_team', 'retries': 0}

with DAG(
    'arxiv_full_pipeline',
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False,
    max_active_runs=1,
    tags=["arxiv", "docling", "txtai"]
) as dag:

    t1 = PythonOperator(task_id='get_arxiv_creds', python_callable=get_arxiv_creds)
    t2 = PythonOperator(task_id='get_es_creds', python_callable=get_es_creds)
    
    t3 = PythonOperator(task_id='extract_pdfs', python_callable=extraction_task)
    
    t4 = PythonOperator(task_id='pdf_to_structured_content', python_callable=transformation_task)
    
    t5 = PythonOperator(task_id='chunk_structured_content', python_callable=chunking_task)
    
    t6 = PythonOperator(task_id='embed_chunks', python_callable=embedder_task)
    
    t7 = PythonOperator(task_id='load_to_elasticsearch', python_callable=loading_task)

    # Execution Flow
    t1 >> t2 >> t3 >> t4 >> t5 >> t6 >> t7