import logging
from typing import Dict, Any, Iterator, List, Optional

from airflow.models import Variable
from opensearchpy import OpenSearch

from .base import BaseExtractor
from .schemas.opensearch import OpensearchExtractorConfig

logger = logging.getLogger(__name__)

"""
opensearch.py
====================================
Purpose:
    Handles document extraction from OpenSearch indexes using bulk or incremental modes.
"""

class OpensearchExtractor(BaseExtractor):
    """
    Purpose:
        Extracts documents from OpenSearch indexes based on provided configurations.
    """

    def __init__(self, connection: OpenSearch, config: Dict[str, Any]):
        """
        Purpose:
            Initializes the extractor and validates incremental configuration.

        Args:
            connection (OpenSearch): Active OpenSearch client.
            config (Dict[str, Any]): Configuration settings.
        """
        self.client = connection
        self.config = OpensearchExtractorConfig(**config)

        if self.config.extraction_mode == "incremental":
            if not self.config.incremental_field or not self.config.checkpoint_key:
                logger.error("OpenSearch incremental extraction missing required parameters.")
                raise ValueError("incremental_field and checkpoint_key are required.")

        self.sort_field = self.config.sort_field or self.config.incremental_field
        logger.info("OpensearchExtractor initialized for index: %s", self.config.index_name)

    def __call__(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Triggers the extraction process when instance is called.

        Returns:
            Iterator[Dict[str, Any]]: Generator yielding document data.
        """
        return self.extract()

    def extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Determines and executes the appropriate extraction mode.

        Returns:
            Iterator[Dict[str, Any]]: Generator of documents.
        """
        if self.config.extraction_mode == "bulk":
            yield from self._bulk_extract()
        else:
            yield from self._incremental_extract()

    def _bulk_extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Full index scan using search_after pagination.

        Returns:
            Iterator[Dict[str, Any]]: Generator of all index documents.
        """
        logger.info("Starting BULK extraction from OpenSearch index '%s'", self.config.index_name)
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
        
        logger.info("OpenSearch bulk extraction completed.")

    def _incremental_extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Extracts documents since the last recorded checkpoint from OpenSearch.

        Returns:
            Iterator[Dict[str, Any]]: Generator of incremental documents.
        """
        logger.info("Starting INCREMENTAL extraction from OpenSearch index '%s'", self.config.index_name)
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
            logger.info("OpenSearch checkpoint updated to: %s", last_value)
        
        logger.info("OpenSearch incremental extraction completed.")