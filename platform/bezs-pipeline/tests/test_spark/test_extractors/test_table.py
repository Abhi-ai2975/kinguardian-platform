"""
test_table.py
====================================
Purpose:
    Simple unit tests for TableExtractor class.
"""
import unittest
from unittest.mock import Mock

from src.spark.extractors.table import TableExtractor


class TestTableExtractor(unittest.TestCase):
    
    def setUp(self):
        self.mock_spark = Mock()
        self.config = {
            "path": "s3://test-bucket/data.csv",
            "format": "csv",
            "batch_size_mb": 20
        }
        self.extractor = TableExtractor(self.mock_spark, self.config)
    
    def test_initialization(self):
        """Test TableExtractor initialization."""
        self.assertEqual(self.extractor.config.path, "s3://test-bucket/data.csv")
        self.assertEqual(self.extractor.config.format, "csv")
        self.assertEqual(self.extractor.config.batch_size_mb, 20)
    
    def test_extract_missing_path_raises_error(self):
        """Test extraction with missing path raises ValueError."""
        extractor = TableExtractor(self.mock_spark, {"path": "", "format": "csv"})
        
        with self.assertRaises(ValueError):
            extractor.extract()
    
    def test_call_method(self):
        """Test __call__ method delegates to extract."""
        mock_df = Mock()
        with patch.object(self.extractor, 'extract', return_value=mock_df):
            result = self.extractor()
            self.assertEqual(result, mock_df)


if __name__ == '__main__':
    unittest.main()
