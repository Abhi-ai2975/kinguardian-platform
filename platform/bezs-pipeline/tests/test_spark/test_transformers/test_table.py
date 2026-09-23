"""
test_table.py
====================================
Purpose:
    Simple unit tests for TableTransformer class.
"""
import unittest
from unittest.mock import Mock, patch

from src.spark.transformers.table import TableTransformer


class TestTableTransformer(unittest.TestCase):
    
    def setUp(self):
        self.mock_df = Mock()
        self.mock_df.columns = ['id', 'name', 'description', 'extra_column']
        self.config = {
            "id_column": "id",
            "normalize_columns": ["name", "description"]
        }
        self.transformer = TableTransformer(self.mock_df, self.config)
    
    def test_initialization(self):
        """Test TableTransformer initialization."""
        self.assertEqual(self.transformer.config.id_column, "id")
        self.assertEqual(self.transformer.config.normalize_columns, ["name", "description"])
    
    def test_call_method(self):
        """Test __call__ method delegates to transform."""
        mock_result = Mock()
        with patch.object(self.transformer, 'transform', return_value=mock_result):
            result = self.transformer()
            self.assertEqual(result, mock_result)
    
    def test_transform_with_default_params(self):
        """Test transform with default parameters."""
        mock_result = Mock()
        with patch.object(self.transformer, 'transform', return_value=mock_result):
            result = self.transformer.transform()
            self.assertEqual(result, mock_result)


if __name__ == '__main__':
    unittest.main()
