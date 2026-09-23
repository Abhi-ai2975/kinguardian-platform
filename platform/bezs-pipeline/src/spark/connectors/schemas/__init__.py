"""
__init__.py
====================================
Purpose:
    Exports Spark connector configuration schema classes.
    Provides convenient access to Spark configuration validation components.
"""
from .sparkconnector import SparkConnectorConfig

__all__ = ["SparkConnectorConfig"]