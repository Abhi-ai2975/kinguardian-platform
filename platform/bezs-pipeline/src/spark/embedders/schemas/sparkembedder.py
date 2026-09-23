"""
sparkembedder.py
====================================
Purpose:
    Provides Pydantic schema for Spark embedder configuration validation.
    Defines required and optional fields for text embedding model setup.
"""
import logging
from pydantic import BaseModel, ConfigDict
from typing import Optional

logger = logging.getLogger(__name__)

class SparkEmbedderConfig(BaseModel):
    """
    Purpose:
        Validates and manages Spark embedder configuration parameters.
        Ensures proper structure for model settings and performance options.
    """
    model_config = ConfigDict(protected_namespaces=(), extra="forbid")
    
    # Model configuration
    model_name: Optional[str] = "all-MiniLM-L6-v2"
    output_column: Optional[str] = "row_vector"
    
    # Performance settings
    batch_size: Optional[int] = None
    show_progress_bar: Optional[bool] = False
    
    # Model checkpointing
    checkpoint_path: Optional[str] = None
    
    """ Example configuration:
    config_data = {
        "model_name": "all-MiniLM-L6-v2",
        "output_column": "row_vector",
        "batch_size": 1000,
        "show_progress_bar": False,
        "checkpoint_path": "file:///tmp/embedder_checkpoint"
    }
    """