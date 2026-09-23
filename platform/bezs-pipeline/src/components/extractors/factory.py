import logging
from typing import Any, Dict
from .rdbms import RDBMSExtractor
from .gmail import GmailExtractor
from .arxiv import ArxivExtractor
from .elasticsearch import ElasticsearchExtractor
from .opensearch import OpensearchExtractor
logger = logging.getLogger(__name__)

"""
factory.py
====================================
Purpose:
    Simplifies the creation of Extractor objects.
"""

class ExtractorFactory:
    """
    Purpose:
        Factory class to route requests to the correct Extractor 
        implementation based on type.
    """

    @staticmethod
    def get_extractor(extractor_type: str, connection: Any, config: Dict[str, Any]):
        """
        Purpose: 
            Returns an initialized extractor instance.

        Args:
            extractor_type (str): Type of extractor ('rdbms', 'gmail').
            connection (Any): Active connection object from the connector layer.
            config (Dict[str, Any]): Extraction logic parameters.

        Returns:
            BaseExtractor: An instance of a specific extractor.

        Raises:
            ValueError: If the extractor type is not supported.
        """
        logger.info(f"ExtractorFactory generating '{extractor_type}' extractor.")
        extractor_type = extractor_type.lower().strip()

        if extractor_type == "rdbms":
            return RDBMSExtractor(connection=connection, config=config)
        elif extractor_type == "gmail":
            return GmailExtractor(connection=connection, config=config)
        elif extractor_type == "arxiv":
            return ArxivExtractor(connection=connection, config=config)
        elif extractor_type == "elasticsearch":
            return ElasticsearchExtractor(connection=connection, config=config)
        elif extractor_type == "opensearch":
            return OpensearchExtractor(connection=connection, config=config)
        else:
            error_msg = f"Unknown extractor type: {extractor_type}"
            logger.error(error_msg)
            raise ValueError(error_msg)