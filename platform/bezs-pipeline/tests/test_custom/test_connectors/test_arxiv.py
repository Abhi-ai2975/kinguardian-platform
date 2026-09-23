import unittest
from unittest import IsolatedAsyncioTestCase
from src.custom.connectors.arxiv import ArxivConnector

# We use IsolatedAsyncioTestCase for async/await code
class TestArxivConnector(IsolatedAsyncioTestCase):

    async def test_connect_creates_client(self):
        """Test that a new client is created when connect() is called."""
        config = {"base_url": "https://export.arxiv.org/api/", "timeout": 10}
        connector = ArxivConnector(config)

        # 1. Initially, _client should be None
        self.assertIsNone(connector._client)

        # 2. Call connect (we must await it)
        client = await connector.connect()

        # 3. Check if it created an httpx.AsyncClient
        import httpx
        self.assertIsInstance(client, httpx.AsyncClient)
        # print("assert instance is:", self.assertIsInstance(client, httpx.AsyncClient))
        self.assertEqual(connector._client, client)

        # Cleanup
        await connector.close()

    async def test_connect_reuses_existing_client(self):
        """Test that calling connect twice returns the SAME client object."""
        config = {"base_url": "https://export.arxiv.org/api/", "timeout": 10}
        connector = ArxivConnector(config)

        client1 = await connector.connect()
        client2 = await connector.connect()

        # Check that it didn't create a new one, but reused the old one
        self.assertIs(client1, client2)
        
        await connector.close()

    async def test_close_clears_client(self):
        """Test that close() shuts down the client and sets it to None."""
        config = {"base_url": "https://export.arxiv.org/api/", "timeout": 10}
        connector = ArxivConnector(config)
        
        await connector.connect()
        self.assertIsNotNone(connector._client)

        await connector.close()
        
        # After closing, _client should be None again
        self.assertIsNone(connector._client)

    async def test_call_magic_method(self):
        """Test that calling the object directly works (the __call__ method)."""
        config = {"base_url": "https://export.arxiv.org/api/", "timeout": 10}
        connector = ArxivConnector(config)
        
        # This triggers the __call__ method
        client = await connector()
        
        self.assertIsNotNone(client)
        await connector.close()

if __name__ == "__main__":
    unittest.main()