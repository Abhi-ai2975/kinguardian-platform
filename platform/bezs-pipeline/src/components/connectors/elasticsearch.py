import logging
from elasticsearch import Elasticsearch
from .schemas import ElasticsearchConfig

# --- Logger Setup ---
logger = logging.getLogger(__name__)

"""
es_connector.py
====================================
Purpose:
    This file defines the ESConnector class, which simplifies the process
    of establishing a connection to an Elasticsearch cluster.

    It handles URL construction, SSL verification settings, and connection
    verification via ping, Username/password authentication, Fail-fast validation.
"""

class ElasticsearchConnector:
    """
    Purpose:
        The ESConnector class acts as a wrapper around the official Elasticsearch client.
        It manages configuration parsing and lazy initialization of the client connection.
    """

    def __init__(self, config: dict):
        """
        Purpose:
            Initializes the ESConnector with a configuration dictionary.
            Note: The actual connection is not established until connect() or the object is called.

        Args:
            config (dict): A dictionary containing connection parameters.
                           Expected keys: 'schema', 'host', 'port'.
                           Optional keys: 'verify_certs'.
        """
        # If Airflow put the schema in 'database', move it to 'schema'
        if config.get("database") and not config.get("schema"):
            config["schema"] = config.pop("database")

        self.config = ElasticsearchConfig(**config)
        self._client = None
        logger.debug("ESConnector initialized with config keys: %s", list(config.keys()))

    def __call__(self) -> Elasticsearch:
        """
        Purpose:
            Allows the class instance to be called like a function to retrieve the client.
            It ensures the connection is established before returning the client.

        Returns:
            Elasticsearch: An active Elasticsearch client instance.
        """
        logger.info("ESConnector invoked. Ensuring connection is established.")
        self.connect()
        return self._client

    def connect(self) -> None:
        """
        Purpose:
            Constructs the connection URL, initializes the Elasticsearch client,
            and verifies the connection by pinging the server.

        Args:
            None

        Returns:
            None

        Raises:
            ConnectionError: If the client fails to ping the Elasticsearch host.
        """
        protocol = self.config.schema
        host = self.config.host
        port = self.config.port

        es_host = f"{protocol}://{host}:{port}"
        verify_certs = self.config.verify_certs

        #Fail-fast TLS validation
        if verify_certs and protocol != "https":
            raise ValueError(
                "Invalid Elasticsearch configuration:"
                "verify_certs=True requires schema='https'."
            )

            
        #Security logging
        if verify_certs:
            if self.config.ca_certs:
                logger.info("Elasticsearch TLS verification ENABLED (custom CA): %s", self.config.ca_certs)
            else:
                logger.info("Elasticsearch TLS verification ENABLED (system CA trust store)")
        else:
            logger.warning("Elasticsearch TLS verification DISABLED (insecure, dev-only) ")

        #Security Logging - AUTH

        username = self.config.login
        password = self.config.password

        if username and password:
            logger.info("Elasticsearch authentication ENABLED (basic auth)")
        else:
            logger.warning(
                "Elasticsearch authentication DISABLED"
                "(no login/password provided - dev only)"
            )

        logger.info("Attempting to connect to Elasticsearch at: %s", es_host)
         #Client Arguments
        try:
            client_kwargs = {
                "hosts": [es_host],
                "verify_certs": verify_certs
            }

            #Adding CA certificates only if TLS verification is enabled
            if verify_certs and self.config.ca_certs:
                client_kwargs["ca_certs"] = self.config.ca_certs
            
            #AUTHENTICATION (BASIC AUTH)
            if(username and not password) or (password and not username):
                raise ValueError(
                    "Invalid Elasticsearch authentication configuration:"
                    "both login and password must be provided together."
                )

            if username and password:
                client_kwargs["basic_auth"] = (username, password)

            #CREATE CLIENT
            self._client = Elasticsearch(**client_kwargs)

            # Verify connection
            if not self._client.ping():
                error_msg = f"Could not connect to Elasticsearch at {es_host}. Ping failed."
                logger.error(error_msg)
                raise ConnectionError(error_msg)

            logger.info("Successfully connected to Elasticsearch.")

        except Exception as e:
            logger.exception(f"An error occurred while initializing Elasticsearch client: {e}")
            raise