"""
test_sparkairflowconnector.py
====================================
Purpose:
    Simple unit tests for SparkAirflowConnector class.
"""
import unittest
from unittest.mock import Mock, patch

from src.spark.connectors.sparkairflowconnector import SparkAirflowConnector


class TestSparkAirflowConnector(unittest.TestCase):
    
    def setUp(self):
        self.config = {
            "host": "https://s3.amazonaws.com",
            "login": "test_access_key",
            "password": "test_secret_key",
            "region_name": "us-east-1"
        }
    
    def test_initialization(self):
        """Test SparkAirflowConnector initialization."""
        connector = SparkAirflowConnector(self.config)
        self.assertEqual(connector.config.login, "test_access_key")
        self.assertEqual(connector.config.password, "test_secret_key")
    
    @patch('src.spark.connectors.sparkairflowconnector.SparkSession')
    def test_connect(self, mock_spark):
        """Test Airflow connector connection."""
        mock_session = Mock()
        mock_hconf = Mock()
        mock_session.sparkContext._jsc.hadoopConfiguration.return_value = mock_hconf
        mock_spark.builder.getOrCreate.return_value = mock_session
        
        connector = SparkAirflowConnector(self.config)
        result = connector.connect()
        
        self.assertEqual(result, mock_session)
        mock_hconf.set.assert_any_call("fs.s3a.access.key", "test_access_key")
        mock_hconf.set.assert_any_call("fs.s3a.secret.key", "test_secret_key")


if __name__ == '__main__':
    unittest.main()
