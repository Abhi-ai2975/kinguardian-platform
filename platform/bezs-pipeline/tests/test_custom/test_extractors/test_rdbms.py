import unittest
from unittest.mock import MagicMock
from src.custom.extractors.rdbms import RDBMSExtractor

class TestRDBMSExtractor(unittest.TestCase):

    def setUp(self):
        """Set up sample data and config."""
        # 1. This is our 'Real-time' Sample Data
        self.sample_users = [
            {"id": 1, "name": "Alice", "email": "alice@example.com"},
            {"id": 2, "name": "Bob", "email": "bob@example.com"}
        ]
        
        # 2. Configuration for two tables
        self.config = {
            "tables": [
                {
                    "table_name": "users",
                    "schema": "public",
                    "columns": ["id", "name", "email"]
                }
            ]
        }
        
        # 3. Create the Mock Connection
        self.mock_connection = MagicMock()

    def test_extract_success(self):
        """Test successful extraction of sample data."""
        # Setup the mock to return our sample data
        # SQLAlchemy's mappings() returns an iterable of rows
        mock_result_proxy = MagicMock()
        mock_result_proxy.mappings.return_value = self.sample_users
        self.mock_connection.execute.return_value = mock_result_proxy

        # Initialize and Run
        extractor = RDBMSExtractor(self.mock_connection, self.config)
        results = extractor.extract()

        # Assertions
        self.assertIn("users", results)
        self.assertEqual(len(results["users"]), 2)
        self.assertEqual(results["users"][0]["name"], "Alice")
        
        # Verify the SQL query was built correctly
        expected_query = "SELECT id, name, email FROM public.users"
        # We check if the first argument of the first call matches our query string
        actual_query = str(self.mock_connection.execute.call_args[0][0])
        self.assertEqual(actual_query, expected_query)
        
        print("\nTest Passed: Correct SQL built and sample data extracted!")

    def test_extract_failure(self):
        """Test that extractor raises an error if the query fails."""
        # Setup the mock to crash
        self.mock_connection.execute.side_effect = Exception("Table not found")

        extractor = RDBMSExtractor(self.mock_connection, self.config)

        with self.assertRaises(Exception):
            extractor.extract()
        print("Test Passed: Correctly handled database execution error.")

if __name__ == "__main__":
    unittest.main()