"""
sparkconnector.py
====================================
Purpose:
    Provides Pydantic schema for Spark connector configuration validation.
    Defines required and optional fields for Spark session setup.
"""
import logging
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

logger = logging.getLogger(__name__)

class SparkConnectorConfig(BaseModel):
    """
    Validates and manages Spark connector configuration parameters.
    Ensures proper structure for AWS credentials and Spark settings.
    """
    model_config = ConfigDict(extra="allow")
    login: str
    password: str
    region_name: Optional[str] = None
    host: Optional[str] = None
    app_name: Optional[str] = None
    packages: Optional[List[str]] = None