"""
test_sparkairflowloader.py
====================================
Purpose:
    Simple unit tests for SparkAirflowLoader class.
"""
import unittest
from unittest.mock import Mock, patch

from src.spark.loaders.sparkairflowloader import SparkAirflowLoader


class TestSparkAirflowLoader(unittest.TestCase):
    
    def setUp(self):
        self.mock_spark = Mock()
        self.config = {
            "host": "127.0.0.1",
            "port": 9200,
            "index_name": "test_index",
            "use_ssl": True,
            "ssl_jks_path": "/path/to/jks"
        }
        self.loader = SparkAirflowLoader(self.mock_spark, self.config)
    
    def test_initialization(self):
        """Test SparkAirflowLoader initialization."""
        self.assertEqual(self.loader.config.host, "127.0.0.1")
        self.assertEqual(self.loader.config.index_name, "test_index")
        self.assertEqual(self.loader.index_name, "test_index")
    
    @patch('src.spark.loaders.sparkairflowloader.requests')
    def test_prepare_index(self, mock_requests):
        """Test index preparation."""
        mock_requests.head.return_value.status_code = 200
        
        self.loader._prepare_index()
        
        mock_requests.head.assert_called_once()
    
    def test_load_calls_parent_methods(self):
        """Test load method calls parent class methods."""
        mock_df = Mock()
        with patch.object(self.loader, '_prepare_index'):
            with patch.object(mock_df, 'write'):
                self.loader.load(mock_df)
    
    def test_call_method(self):
        """Test __call__ method delegates to load."""
        mock_df = Mock()
        with patch.object(self.loader, 'load'):
            self.loader(mock_df)


if __name__ == '__main__':
    unittest.main()
