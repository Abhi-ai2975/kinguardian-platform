"""
__init__.py
====================================
Purpose:
    Exports Spark loader configuration schema classes.
    Provides convenient access to loader validation components.
"""
from .elasticsearch import ElasticsearchLoaderConfig

__all__ = ["ElasticsearchLoaderConfig"]