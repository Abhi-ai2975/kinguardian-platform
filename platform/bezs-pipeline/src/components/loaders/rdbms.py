import io
import csv
import logging
import json
from sqlalchemy import text
from .base import BaseLoader
from .schemas import RDBMSLoaderConfig

logger = logging.getLogger(__name__)

"""
rdbms.py
====================================
Purpose:
    Provides high-speed data ingestion into PostgreSQL using the COPY protocol.
    Supports JSONB metadata and pgvector types for efficient storage.
"""

class RDBMSLoader(BaseLoader):
    """
    Purpose:
        Manages bulk data ingestion into PostgreSQL tables for ETL pipelines.
    """
    def __init__(self, connection, config):
        """
        Purpose:
            Initializes the loader with a database connector and table schema.

        Args:
            connection (RDBMSConnector): The active database connector object.
            config (dict): Configuration containing 'table_name' and 'columns'.
        """
        # To allow create a new connection & reuse the same connection
        self.connector = connection
        self.connection = connection() 
        self.config = RDBMSLoaderConfig(**config)
        self.table_name = self.config.table_name
        self.columns = self.config.columns
        logger.info(f"RDBMSLoader initialized for table: {self.table_name}")

    def create(self) -> None:
        """
        Purpose:
            Ensures the target table and optional vector columns exist in the database.

        Returns:
            None
        
        Raises:
            Exception: If table creation or schema modification fails.
        """
        create_sql = f"""
        CREATE TABLE IF NOT EXISTS {self.table_name} (
            id TEXT PRIMARY KEY,
            text_content TEXT,
            metadata JSONB,
            embedding TEXT,
            created_at TIMESTAMP
        );
        """
        try:
            self.connection.execute(text(create_sql))
            self.connection.commit()
            logger.info(f"Table '{self.table_name}' verified/created.")
            
            try:
                vector_sql = f"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
                        ALTER TABLE {self.table_name} ALTER COLUMN embedding TYPE VECTOR(5) 
                        USING embedding::VECTOR(5);
                    END IF;
                END $$;
                """
                self.connection.execute(text(vector_sql))
                self.connection.commit()
                logger.info("Vector column schema updated successfully.")
            except Exception as vector_error:
                logger.warning(f"pgvector update skipped: {vector_error}")
                
        except Exception as e:
            logger.error(f"Failed to create table {self.table_name}: {e}")
            raise

    def __call__(self, data):
        """
        Purpose:
            Triggers the table verification and bulk loading process.

        Args:
            data (list): A collection of records to be loaded.
        
        Returns:
            int: Total number of rows successfully ingested.
        """
        self.create()
        return self.load(data)

    def load(self, data):
        """
        Purpose: 
            Executes high-performance ingestion using the Postgres COPY protocol.

        Args:
            data (list): List of dictionaries or tuples containing record data.

        Returns:
            int: Count of rows processed.

        Raises:
            Exception: If the COPY operation or transaction fails.
        """
        if not data:
            logger.warning(f"No data to load for {self.table_name}.")
            return 0

        buffer = io.StringIO()      # creates in-memory text file for fast data buffering
        writer = csv.writer(buffer, delimiter='\t', quotechar='"')

        try:
            for record in data:
                row = []
                for col in self.columns:
                    value = record[col] if isinstance(record, dict) else record[self.columns.index(col)]
                    
                    if col == 'metadata' and isinstance(value, dict):
                        row.append(json.dumps(value))
                    elif col == 'embedding' and isinstance(value, list):
                        row.append(str(value))
                    else:
                        row.append(str(value) if value is not None else None)
                
                writer.writerow(row)
            
            buffer.seek(0)
            
            raw_engine = self.connector._engine     # sqlalchemy connection (ORM style) for table creation
            raw_connection = raw_engine.raw_connection()        # raw psycopg2 connection for load
            raw_cursor = raw_connection.cursor()
            
            copy_sql = (
                f"COPY {self.table_name} ({', '.join(self.columns)}) "
                f"FROM STDIN WITH (FORMAT csv, DELIMITER '\t')"
            )
            
            logger.debug(f"Executing COPY for {len(data)} rows.")
            raw_cursor.copy_expert(sql=copy_sql, file=buffer)       # postgresql's high speed bulk insert command
            
            raw_connection.commit()     # commits the COPY operation
            self.connection.commit()    # ensures sqlalchemy connection is synced
            
            logger.info(f"Successfully loaded {len(data)} rows into {self.table_name}.")
            return len(data)

        except Exception as e:
            self.connection.rollback()  # rolls back the transaction if COPY fails
            logger.error(f"RDBMS Load failed: {str(e)}")
            raise