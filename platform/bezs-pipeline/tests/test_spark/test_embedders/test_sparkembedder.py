"""
test_sparkembedder.py
====================================
Purpose:
    Simple unit tests for SparkEmbedder class.
"""
import unittest
from unittest.mock import Mock

from src.spark.embedders.sparkembedder import SparkEmbedder


class TestSparkEmbedder(unittest.TestCase):
    
    def setUp(self):
        self.mock_df = Mock()
        self.config = {
            "model_name": "test-model",
            "output_column": "vector"
        }
        self.embedder = SparkEmbedder(self.mock_df, self.config)
    
    def test_initialization(self):
        """Test SparkEmbedder initialization."""
        self.assertEqual(self.embedder.config.model_name, "test-model")
        self.assertEqual(self.embedder.config.output_column, "vector")
        self.assertEqual(self.embedder.model_name, "test-model")
        self.assertEqual(self.embedder.output_col, "vector")
    
    def test_embed_returns_dataframe(self):
        """Test embed method returns a DataFrame."""
        mock_result = Mock()
        with patch.object(self.mock_df, 'withColumn', return_value=mock_result):
            result = self.embedder.embed()
            self.assertEqual(result, mock_result)


if __name__ == '__main__':
    unittest.main()
