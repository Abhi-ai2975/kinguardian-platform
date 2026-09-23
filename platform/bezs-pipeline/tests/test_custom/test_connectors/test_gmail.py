import unittest
from unittest.mock import MagicMock, patch
from src.custom.connectors.gmail import GmailConnector

class TestGmailConnector(unittest.TestCase):

    def setUp(self):
        """Set up a fake token for testing."""
        self.fake_config = {
            "token_dict": {
                "token": "fake-token",
                "refresh_token": "fake-refresh",
                "client_id": "fake-id",
                "client_secret": "fake-secret"
            },
            "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
       }

    @patch("src.custom.connectors.gmail.build")
    @patch("src.custom.connectors.gmail.Credentials")
    def test_connect_success(self, mock_creds_class, mock_build_function):
        """Test that the Gmail service is built correctly."""
        # 1. Setup the Mocks
        # Mock the Credentials object
        mock_creds = MagicMock()
        mock_creds_class.from_authorized_user_info.return_value = mock_creds
        
        # Mock the Service object (what 'build' returns)
        mock_service = MagicMock()
        mock_build_function.return_value = mock_service

        # 2. Run the code
        connector = GmailConnector(self.fake_config)
        service = connector.connect()

        # 3. Assertions
        # Check if the service returned is our mock
        self.assertEqual(service, mock_service)
        
        # Verify from_authorized_user_info was called with our token_dict
        mock_creds_class.from_authorized_user_info.assert_called_once_with(
            self.fake_config["token_dict"],
            scopes=self.fake_config["scopes"]
        )
        
        # Verify 'build' was called correctly
        mock_build_function.assert_called_once_with(
            'gmail', 'v1', credentials=mock_creds, cache_discovery=False
        )
        print("\nTest Passed: Gmail service built successfully with mocks!")

    @patch("src.custom.connectors.gmail.Credentials")
    def test_connect_failure(self, mock_creds_class):
        """Test that the connector raises an exception if credential loading fails."""
        # Force the credential loader to crash
        mock_creds_class.from_authorized_user_info.side_effect = Exception("Invalid Token")

        connector = GmailConnector(self.fake_config)
        
        with self.assertRaises(Exception):
            connector.connect()
        print("Test Passed: Correctly caught exception on credential failure.")

if __name__ == "__main__":
    unittest.main()