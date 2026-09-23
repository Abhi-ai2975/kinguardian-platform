import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

"""
config.py
====================================
Purpose:
    Loads environment variables and defines static connection configurations 
    for local development services like RDBMS, Elasticsearch, and S3.
"""

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
logger.debug("Environment variables loaded from .env file.")

CONNECTIONS = {
    "rdbms": {
        "type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "database": "structured_data_pipeline",
        "login": "logi",
        "password": "12345",
    },
    "elasticsearch": {
        "host": "localhost",
        "port": 9200,
    },
    "s3": {
        "login": os.getenv("AWS_ACCESS_KEY_ID"),
        "password": os.getenv("AWS_SECRET_ACCESS_KEY"),
        "region_name": os.getenv("AWS_REGION", "us-east-1"),
        "host": os.getenv("HOST"),
        "bucket_name": os.getenv("S3_BUCKET_NAME"),
    }
}
logger.info("CONNECTIONS dictionary initialized.")