import unittest
from unittest.mock import MagicMock, patch
from src.custom.connectors.opensearch import OpensearchConnector

class TestOpensearchConnector(unittest.TestCase):

    def setUp(self):
        """Prepare a common config for OpenSearch tests."""
        self.config = {
            "schema_type": "https",
            "host": "my-opensearch-cluster",
            "port": 9200,
            "verify_certs": True
        }

    @patch("src.custom.connectors.opensearch.OpenSearch")
    def test_connect_success(self, mock_os_class):
        """Test that connector works when the cluster pings successfully."""
        # 1. Setup Mock: Create a fake OpenSearch instance that pings True
        mock_instance = MagicMock()
        mock_instance.ping.return_value = True
        mock_os_class.return_value = mock_instance

        # 2. Run code
        connector = OpensearchConnector(self.config)
        connector.connect()

        # 3. Assertions
        self.assertIsNotNone(connector._client)
        mock_instance.ping.assert_called_once()
        print("\nTest Passed: OpenSearch connected and pinged successfully!")

    @patch("src.custom.connectors.opensearch.OpenSearch")
    def test_connect_ping_fails(self, mock_os_class):
        """Test that ConnectionError is raised when ping is False."""
        # 1. Setup Mock: Fake instance that pings False
        mock_instance = MagicMock()
        mock_instance.ping.return_value = False
        mock_os_class.return_value = mock_instance

        # 2. Run code
        connector = OpensearchConnector(self.config)
        
        # 3. Check for the error
        with self.assertRaises(ConnectionError) as cm:
            connector.connect()
        
        self.assertIn("Could not connect to OpenSearch", str(cm.exception))
        print("Test Passed: Correctly raised ConnectionError for OpenSearch.")

if __name__ == "__main__":
    unittest.main()