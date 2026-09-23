"""
elasticsearch.py
====================================
Purpose:
    Provides Pydantic schema for Elasticsearch loader configuration validation.
    Defines required and optional fields for Elasticsearch data loading setup.
"""
import logging
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ElasticsearchLoaderConfig(BaseModel):
    """
    Purpose:
        Validates and manages Elasticsearch loader configuration parameters.
        Ensures proper structure for connection settings and loading options.
    """
    model_config = ConfigDict(protected_namespaces=(), extra="forbid")
    
    # Connection settings
    host: Optional[str] = "localhost"
    port: Optional[int] = 9200
    username: Optional[str] = None
    password: Optional[str] = None
    index_name: Optional[str] = "default_index"
    
    # SSL and security
    use_ssl: Optional[bool] = True
    verify_ssl: Optional[bool] = True
    ssl_pem_path: Optional[str] = None
    ssl_jks_path: Optional[str] = None
    jks_password: Optional[str] = None
    
    # Loading behavior
    write_mode: Optional[str] = "append"  # append, overwrite, ignore
    vector_column: Optional[str] = "row_vector"
    checkpoint_path: Optional[str] = None
    
    # Performance tuning
    batch_size_bytes: Optional[str] = "10mb"
    retry_count: Optional[int] = 3
    retry_wait: Optional[str] = "10s"
    timeout: Optional[str] = "5m"
    
    # Elasticsearch index settings and mappings
    settings: Optional[Dict[str, Any]] = {}
    mappings: Optional[Dict[str, Any]] = {}
    
    """ Example configuration:
    config_data = {
        "host": "localhost",
        "port": 9200,
        "username": "elastic",
        "password": "123456",
        "index_name": "sales_data",
        "use_ssl": True,
        "verify_ssl": True,
        "ssl_pem_path": "/path/to/http_ca.crt",
        "write_mode": "append",
        "vector_column": "row_vector",
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "refresh_interval": "-1"
            }
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "text": {"type": "text"},
                "row_vector": {"type": "dense_vector", "dims": 384}
            }
        }
    }
    """