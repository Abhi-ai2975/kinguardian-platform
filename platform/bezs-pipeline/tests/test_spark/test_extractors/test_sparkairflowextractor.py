"""
test_sparkairflowextractor.py
====================================
Purpose:
    Simple unit tests for SparkAirflowExtractor class.
"""
import unittest
from unittest.mock import Mock

from src.spark.extractors.sparkairflowextractor import SparkAirflowExtractor


class TestSparkAirflowExtractor(unittest.TestCase):
    
    def setUp(self):
        self.mock_spark = Mock()
        self.config = {
            "path": "s3://test-bucket/data.parquet",
            "format": "parquet"
        }
        self.extractor = SparkAirflowExtractor(self.mock_spark, self.config)
    
    def test_initialization(self):
        """Test SparkAirflowExtractor initialization."""
        self.assertEqual(self.extractor.config.path, "s3://test-bucket/data.parquet")
        self.assertEqual(self.extractor.config.format, "parquet")
    
    def test_inheritance(self):
        """Test inheritance from TableExtractor."""
        from src.spark.extractors.table import TableExtractor
        self.assertIsInstance(self.extractor, TableExtractor)
    
    def test_extract_calls_parent(self):
        """Test extract method calls parent class."""
        mock_df = Mock()
        with patch('src.spark.extractors.table.TableExtractor.extract', return_value=mock_df):
            result = self.extractor.extract()
            self.assertEqual(result, mock_df)


if __name__ == '__main__':
    unittest.main()
