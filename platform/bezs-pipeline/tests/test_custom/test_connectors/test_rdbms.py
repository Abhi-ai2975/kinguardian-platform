import unittest
from unittest.mock import MagicMock, patch
from src.custom.connectors.rdbms import RDBMSConnector

class TestRDBMSConnector(unittest.TestCase):

    def setUp(self):
        """Setup a standard database config."""
        self.config = {
            "type": "postgresql",
            "login": "user",
            "password": "pass",
            "host": "localhost",
            "port": 5432,
            "database": "test_db"
        }

    @patch("src.custom.connectors.rdbms.create_engine")
    def test_connect_success(self, mock_create_engine):
        """Test successful DB connection and verification."""
        # 1. Setup the Mocks
        mock_engine = MagicMock()
        mock_connection = MagicMock()
        
        # When create_engine is called, return our mock_engine
        mock_create_engine.return_value = mock_engine
        
        # This tells the mock: "Every time .connect() is called, 
        # return the mock_connection object."
        mock_engine.connect.return_value = mock_connection
        
        # This handles the 'with' block (the handshake)
        # It says: "The object inside the 'with' block is also our mock_connection"
        mock_connection.__enter__.return_value = mock_connection

        # 2. Run code
        connector = RDBMSConnector(self.config)
        connector.connect()

        # 3. Assertions
        # Now this will pass because 'conn' inside the with block IS mock_connection
        mock_connection.execute.assert_called()
        self.assertIsNotNone(connector._connection)
        print("\nTest Passed: RDBMS engine created and 'SELECT 1' executed!")

    @patch("src.custom.connectors.rdbms.create_engine")
    def test_connect_failure(self, mock_create_engine):
        """Test that connector raises error if SELECT 1 fails."""
        # Setup engine to return a connection that crashes on execute
        mock_engine = MagicMock()
        mock_connection = MagicMock()
        mock_connection.execute.side_effect = Exception("DB Timeout")
        
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        mock_create_engine.return_value = mock_engine

        connector = RDBMSConnector(self.config)
        
        with self.assertRaises(Exception):
            connector.connect()
        print("Test Passed: Correctly caught RDBMS connection failure.")

if __name__ == "__main__":
    unittest.main()