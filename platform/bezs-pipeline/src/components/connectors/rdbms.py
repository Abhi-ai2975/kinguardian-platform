import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from .schemas import RDBMSConfig

logger = logging.getLogger(__name__)

"""
rdbms.py
====================================
Purpose:
    Provides a connector for Relational Database Management Systems using SQLAlchemy.
    Supports dynamic URL generation based on the provided database type/driver.
"""

class RDBMSConnector:
    """
    Purpose:
        Manages the lifecycle of a SQLAlchemy engine and connection.
        Handles credentials and connection testing for various SQL databases.
    """

    def __init__(self, config: dict):
        """
        Purpose:
            Initializes the RDBMSConnector with database configuration.

        Args:
            config (dict): Database parameters including 'db_type', 'user', 
                          'password', 'host', 'port', and 'database'.
        """
        self.config = RDBMSConfig(**config)
        self._engine = None
        self._connection = None
        logger.debug("RDBMSConnector initialized for host: %s", self.config.host)

    def __call__(self):
        """
        Purpose:
            Enables the instance to be called to establish and return a connection.

        Returns:
            sqlalchemy.engine.Connection: An active database connection.
        """
        self.connect()
        return self._connection

    def connect(self) -> None:
        """
        Purpose:
            Constructs a SQLAlchemy URL, creates the engine, and verifies 
            the connectivity by executing a 'SELECT 1' test query.

        Args:
            None

        Returns:
            None

        Raises:
            Exception: If the database connection or test query fails.
        """
        url_params = {
            "drivername": self.config.type,
            "username": self.config.login,
            "password": self.config.password,
            "host": self.config.host,
            "port": self.config.port,
            "database": self.config.database,
        }

        connection_url = URL.create(**{k: v for k, v in url_params.items() if v is not None})
        
        logger.info(f"Connecting to database: {url_params['database']} at {url_params['host']}")
        
        try:
            self._engine = create_engine(connection_url)
            
            # Test Connection
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self._connection = self._engine.connect()
            logger.info("RDBMS connection established and verified.")
        except Exception as e:
            logger.exception("Failed to establish RDBMS connection.")
            raise