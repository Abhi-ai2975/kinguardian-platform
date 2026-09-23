"""
sparkembedder.py
====================================
Purpose:
    Provides distributed text embedding using Spark and sentence-transformers.
    Leverages pandas UDFs for scalable vector generation across Spark clusters.
"""
import logging
import pandas as pd
from pyspark.sql import DataFrame
from pyspark.sql.types import ArrayType, FloatType
from pyspark.sql.functions import pandas_udf
from sentence_transformers import SentenceTransformer
from .schemas.sparkembedder import SparkEmbedderConfig

logger = logging.getLogger(__name__)

class SparkEmbedder:
    """
    Purpose:
        Manages distributed text embedding using Spark DataFrames.
        Handles sentence-transformer model loading and vector generation.
    """
    def __init__(self, data: DataFrame, config: dict):
        """
        Purpose:
            Initializes the SparkEmbedder with data and configuration.
        
        Args:
            data (DataFrame): Spark DataFrame containing text column to embed.
            config (dict): Embedding configuration including model_name and output_column.
        """
        self.data = data
        self.config = SparkEmbedderConfig(**config)
        self.model_name = self.config.model_name
        self.output_col = self.config.output_column
        logger.debug("SparkEmbedder initialized with model: %s", self.model_name)

    def embed(self) -> DataFrame:
        """
        Purpose:
            Generates embeddings for text data using distributed Spark processing.
        
        Args:
            None
        
        Returns:
            DataFrame: Original DataFrame with added embedding column.
        """
        logger.info("Starting distributed embedding generation with model: %s", self.model_name)
        
        # 1. Capture variables for the closure
        model_name = self.model_name
        output_col = self.output_col
        
        # 2. Create pandas UDF for distributed embedding generation
        @pandas_udf(ArrayType(FloatType()))
        def embed_udf(text_series: pd.Series) -> pd.Series:
            # This runs on workers, need to load model here
            logger.debug("Loading sentence transformer model: %s", model_name)
            model = SentenceTransformer(model_name)
            embeddings = model.encode(text_series.tolist(), show_progress_bar=False)
            return pd.Series(embeddings.tolist())
        
        # 3. Apply the UDF to add embedding column
        result = self.data.withColumn(output_col, embed_udf(self.data["text"]))
        logger.info("Embedding generation completed, output column: %s", output_col)
        return result