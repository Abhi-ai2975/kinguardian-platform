"""
test_sparkconnector.py
====================================
Purpose:
    Simple unit tests for SparkConnector class.
"""
import unittest
from unittest.mock import Mock, patch

from src.spark.connectors.sparkconnector import SparkConnector


class TestSparkConnector(unittest.TestCase):
    
    def setUp(self):
        self.config = {
            "host": "https://s3.amazonaws.com",
            "login": "test_access_key",
            "password": "test_secret_key",
            "region_name": "us-east-1"
        }
    
    def test_initialization(self):
        """Test SparkConnector initialization."""
        connector = SparkConnector(self.config)
        self.assertEqual(connector.config.login, "test_access_key")
        self.assertEqual(connector.config.password, "test_secret_key")
        self.assertEqual(connector.config.region_name, "us-east-1")
    
    @patch('src.spark.connectors.sparkconnector.SparkSession')
    def test_connect(self, mock_spark):
        """Test Spark connection."""
        mock_session = Mock()
        mock_spark.builder.appName.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.getOrCreate.return_value = mock_session
        
        connector = SparkConnector(self.config)
        result = connector.connect()
        
        self.assertEqual(result, mock_session)
    
    @patch('src.spark.connectors.sparkconnector.SparkSession')
    def test_connect_singleton(self, mock_spark):
        """Test connect returns same session (singleton)."""
        mock_session = Mock()
        mock_spark.builder.appName.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.config.return_value.getOrCreate.return_value = mock_session
        
        connector = SparkConnector(self.config)
        result1 = connector.connect()
        result2 = connector.connect()
        
        self.assertEqual(result1, result2)


if __name__ == '__main__':
    unittest.main()
