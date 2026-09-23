import logging
from .elasticsearch import (ElasticsearchBulkIngestor,ElasticsearchSingleIngestor)
from .opensearch import (OpensearchBulkIngestor,OpensearchSingleIngestor)
from .rdbms import RDBMSLoader
from .schemas.ingestor import IngestorConfig

logger = logging.getLogger(__name__)

"""
factory.py
====================================
Purpose:
    Factory class to generate the appropriate Elasticsearch ingestor.
"""

class LoaderFactory:
    """
    Purpose:
        Orchestrates the selection of the loading strategy.
    """
    @staticmethod
    def get_loader(load_type: str, connection=None, config=None):
        """
        Purpose: Returns an instance of a specific ingestor.

        Args:
            load_type (str): 'elasticsearch', 'opensearch', or 'rdbms'.
            connection: The established database/client connection.
            config (dict): Configuration for the loader.
            data: Optional data parameter.

        Returns:
            BaseLoader: An initialized loader instance.

        Raises:
            ValueError: If the load_type is unsupported.
        """
        logger.info(f"LoaderFactory creating '{load_type}' loader.")
        load_type = load_type.lower().strip()
        
        if load_type == "elasticsearchsingle":
            return ElasticsearchSingleIngestor(connection=connection, config=config)

        elif load_type == "elasticsearchbulk":
            return ElasticsearchBulkIngestor(connection=connection, config=config)

        elif load_type == "opensearchsingle":
            return OpensearchSingleIngestor(connection=connection, config=config)

        elif load_type == "opensearchbulk":
            return OpensearchBulkIngestor(connection=connection, config=config)

        elif load_type == "rdbms":
            return RDBMSLoader(connection=connection, config=config)
            
        else:
            error_msg = f"Loader type '{load_type}' is not supported."
            logger.error(error_msg)
            raise ValueError(error_msg)