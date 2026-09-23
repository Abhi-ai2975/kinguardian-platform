import unittest
from unittest.mock import MagicMock, patch
from src.custom.credentials.airflow import AirflowCredentials

class TestAirflowCredentials(unittest.TestCase):

    @patch("src.custom.credentials.airflow.BaseHook.get_connection")
    def test_get_credentials_success(self, mock_get_connection):
        """
        Test that credentials are correctly parsed and merged 
        without touching a real database.
        """
        # 1. Setup: Create a "Fake" Airflow Connection object
        mock_conn = MagicMock()
        mock_conn.host = "127.0.0.1"
        mock_conn.port = 5432
        mock_conn.login = "test_user"
        mock_conn.password = "test_password"
        mock_conn.schema = "test_db"
        # This simulates the JSON 'Extras' field in Airflow
        mock_conn.extra_dejson = {"api_key": "secret_123", "region": "us-east-1"}

        # Tell the mock to return our fake object
        mock_get_connection.return_value = mock_conn

        # 2. Execution: Run your code
        provider = AirflowCredentials(conn_id="my_test_connection")
        result = provider.get_credentials()

        # 3. Assertions: Check if the mapping worked
        self.assertEqual(result["host"], "127.0.0.1")
        self.assertEqual(result["login"], "test_user")
        self.assertEqual(result["password"], "test_password")
        self.assertEqual(result["schema"], "test_db")
      
        # Verify the mock was called with the right ID
        mock_get_connection.assert_called_once_with("my_test_connection")

    @patch("src.custom.credentials.airflow.BaseHook.get_connection")
    def test_get_credentials_failure(self, mock_get_connection):
        """Test that the code raises an exception if the connection is not found."""
        # Simulate Airflow failing to find the ID
        mock_get_connection.side_effect = Exception("Connection not found")

        provider = AirflowCredentials(conn_id="invalid_id")
        
        with self.assertRaises(Exception):
            provider.get_credentials()

if __name__ == "__main__":
    unittest.main()