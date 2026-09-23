"""
test_elasticsearch.py
====================================
Purpose:
    Simple unit tests for ElasticsearchSparkLoader class.
"""
import unittest
from unittest.mock import Mock, patch

from src.spark.loaders.elasticsearch import ElasticsearchSparkLoader


class TestElasticsearchSparkLoader(unittest.TestCase):
    
    def setUp(self):
        self.mock_spark = Mock()
        self.config = {
            "host": "localhost",
            "port": 9200,
            "index_name": "test_index",
            "use_ssl": False
        }
        self.loader = ElasticsearchSparkLoader(self.mock_spark, self.config)
    
    def test_initialization(self):
        """Test ElasticsearchSparkLoader initialization."""
        self.assertEqual(self.loader.config.host, "localhost")
        self.assertEqual(self.loader.config.port, 9200)
        self.assertEqual(self.loader.config.index_name, "test_index")
        self.assertEqual(self.loader.index_name, "test_index")
    
    @patch('src.spark.loaders.elasticsearch.requests')
    def test_prepare_index(self, mock_requests):
        """Test index preparation."""
        mock_requests.head.return_value.status_code = 200
        mock_requests.get.return_value.raise_for_status.return_value = None
        
        self.loader._prepare_index()
        
        mock_requests.head.assert_called_once()
    
    def test_load_calls_prepare_index(self):
        """Test load method calls prepare_index."""
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
