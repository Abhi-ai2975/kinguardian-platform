import unittest
from unittest.mock import MagicMock, patch
from src.custom.connectors.elasticsearch import ElasticsearchConnector

class TestElasticsearchConnector(unittest.TestCase):

    def setUp(self):
        """This runs before every test to set up the basic config."""
        self.valid_config = {
            "schema": "http",
            "host": "localhost",
            "port": 9200,
            "verify_certs": False
        }

    @patch("src.custom.connectors.elasticsearch.Elasticsearch")
    def test_connect_success(self, mock_es_class):
        """Test successful connection when ping returns True."""
        # 1. Setup the Mock
        mock_instance = MagicMock()
        mock_instance.ping.return_value = True  # Pretend ES is alive
        mock_es_class.return_value = mock_instance

        # 2. Run code
        connector = ElasticsearchConnector(self.valid_config)
        connector.connect()

        # 3. Assertions
        self.assertIsNotNone(connector._client)
        mock_instance.ping.assert_called_once()
        print("\nTest passed: Successfully 'connected' to Mock Elasticsearch")

    @patch("src.custom.connectors.elasticsearch.Elasticsearch")
    def test_connect_ping_fails(self, mock_es_class):
        """Test that ConnectionError is raised if ping returns False."""
        # 1. Setup the Mock to fail
        mock_instance = MagicMock()
        mock_instance.ping.return_value = False  # Pretend ES is dead
        mock_es_class.return_value = mock_instance

        # 2. Run code and check for error
        connector = ElasticsearchConnector(self.valid_config)
        
        with self.assertRaises(ConnectionError) as cm:
            connector.connect()
        
        self.assertIn("Ping failed", str(cm.exception))
        print("Test passed: Correctly caught ConnectionError on ping failure")

    @patch("src.custom.connectors.elasticsearch.Elasticsearch")
    def test_call_magic_method(self, mock_es_class):
        """Test that calling the object like a function returns the client."""
        mock_instance = MagicMock()
        mock_instance.ping.return_value = True
        mock_es_class.return_value = mock_instance

        connector = ElasticsearchConnector(self.valid_config)
        # Calling connector() triggers __call__
        client = connector()

        self.assertEqual(client, mock_instance)

if __name__ == "__main__":
    unittest.main()