import logging
from typing import Dict, Any, Iterator, List, Optional

from airflow.models import Variable
from elasticsearch import Elasticsearch

from .base import BaseExtractor
from .schemas.elasticsearch import ElasticsearchExtractorConfig

logger = logging.getLogger(__name__)

"""
elasticsearch.py
====================================
Purpose:
    Handles document extraction from Elasticsearch using bulk or incremental modes
    with deep pagination support via search_after.
"""

class ElasticsearchExtractor(BaseExtractor):
    """
    Purpose:
        Extracts documents from Elasticsearch indexes based on provided configurations.
    """

    def __init__(self, connection: Elasticsearch, config: Dict[str, Any]):
        """
        Purpose:
            Initializes the extractor and validates incremental mode requirements.

        Args:
            connection (Elasticsearch): Active Elasticsearch client.
            config (Dict[str, Any]): Configuration dictionary for extraction settings.
        """
        self.client = connection
        self.config = ElasticsearchExtractorConfig(**config)

        if self.config.extraction_mode == "incremental":
            if not self.config.incremental_field or not self.config.checkpoint_key:
                logger.error("Incremental extraction missing required fields.")
                raise ValueError("incremental_field and checkpoint_key are required.")

        self.sort_field = self.config.sort_field or self.config.incremental_field
        logger.info("ElasticsearchExtractor initialized for index: %s", self.config.index_name)

    def __call__(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Makes the class instance callable to trigger extraction.

        Returns:
            Iterator[Dict[str, Any]]: Generator yielding document source data.
        """
        return self.extract()

    def extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Routes the extraction process to either bulk or incremental methods.

        Returns:
            Iterator[Dict[str, Any]]: Generator of documents.
        """
        logger.debug("Extraction triggered in %s mode.", self.config.extraction_mode)
        if self.config.extraction_mode == "bulk":
            yield from self._bulk_extract()
        else:
            yield from self._incremental_extract()

    def _bulk_extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Performs a full scan of the index using ID-based pagination.

        Returns:
            Iterator[Dict[str, Any]]: Generator yielding all documents.
        """
        logger.info("Starting BULK extraction from index '%s'", self.config.index_name)
        search_after: Optional[List[Any]] = None

        while True:
            body = {"size": self.config.batch_size, "sort": [{"_id": "asc"}]}
            if search_after: body["search_after"] = search_after
            if self.config.fields: body["_source"] = self.config.fields

            response = self.client.search(index=self.config.index_name, body=body)
            hits = response.get("hits", {}).get("hits", [])
            if not hits: break

            for hit in hits: yield hit["_source"]
            search_after = hits[-1]["sort"]
        
        logger.info("Bulk extraction completed.")

    def _incremental_extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Extracts documents updated since the last stored checkpoint.

        Returns:
            Iterator[Dict[str, Any]]: Generator yielding new/updated documents.
        """
        logger.info("Starting INCREMENTAL extraction from index '%s'", self.config.index_name)
        checkpoint = Variable.get(self.config.checkpoint_key, default_var=None)
        
        search_after: Optional[List[Any]] = None
        last_value: Optional[Any] = checkpoint

        while True:
            query = {"match_all": {}} if checkpoint is None else {
                "range": {self.config.incremental_field: {"gt": checkpoint}}
            }
            body = {
                "size": self.config.batch_size, 
                "query": query, 
                "sort": [{self.sort_field: "asc"}]
            }
            if search_after: body["search_after"] = search_after
            if self.config.fields: body["_source"] = self.config.fields

            response = self.client.search(index=self.config.index_name, body=body)
            hits = response.get("hits", {}).get("hits", [])
            if not hits: break

            for hit in hits:
                source = hit["_source"]
                last_value = source.get(self.sort_field)
                yield source
            search_after = hits[-1]["sort"]

        if last_value is not None:
            Variable.set(self.config.checkpoint_key, last_value)
            logger.info("Updated checkpoint '%s' to: %s", self.config.checkpoint_key, last_value)
        
        logger.info("Incremental extraction completed.")