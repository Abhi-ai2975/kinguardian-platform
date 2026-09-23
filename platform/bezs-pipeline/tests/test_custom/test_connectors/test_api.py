import pytest
import httpx
from unittest.mock import patch, AsyncMock, MagicMock
from src.components.connectors.api import ApiConnector

@pytest.mark.asyncio
class TestApiConnector:
    
    async def test_connect_without_api_key(self):
        """Tests that a clean client is created for Arxiv-like APIs."""
        config = {"timeout": 15}
        connector = ApiConnector(config)
        
        # Create an AsyncMock to represent the client instance
        mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
        
        with patch("httpx.AsyncClient", return_value=mock_client_instance) as mock_client_class:
            await connector.connect()
            
            # Verify AsyncClient was instantiated without headers
            mock_client_class.assert_called_once_with(timeout=15)
            
        await connector.close()

    async def test_connect_with_api_key(self):
        """Tests that an authenticated client is created for Jina-like APIs."""
        config = {"api_key": "test_secret_key", "timeout": 10}
        connector = ApiConnector(config)
        
        expected_headers = {
            "Authorization": "Bearer test_secret_key",
            "Content-Type": "application/json"
        }
        
        mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
        
        with patch("httpx.AsyncClient", return_value=mock_client_instance) as mock_client_class:
            await connector.connect()
            
            # Verify AsyncClient was instantiated WITH the correct headers
            mock_client_class.assert_called_once_with(
                headers=expected_headers, 
                timeout=10
            )
            
        await connector.close()

    async def test_singleton_behavior(self):
        """Tests that the connector reuses the same client instance."""
        config = {"timeout": 30}
        connector = ApiConnector(config)
        
        mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
        
        with patch("httpx.AsyncClient", return_value=mock_client_instance) as mock_client_class:
            client1 = await connector.connect()
            client2 = await connector.connect()
            
            # AsyncClient should only be instantiated once
            assert mock_client_class.call_count == 1
            assert client1 is client2
            
        await connector.close()

    async def test_close_connection(self):
        """Tests that the client is closed and cleared correctly."""
        connector = ApiConnector({"timeout": 30})
        
        # Use AsyncMock because aclose() is an awaited method
        mock_instance = AsyncMock(spec=httpx.AsyncClient)
        
        with patch("httpx.AsyncClient", return_value=mock_instance):
            await connector.connect()
            await connector.close()
            
            # Ensure aclose was awaited
            mock_instance.aclose.assert_called_once()
            # Ensure the internal state is reset to None
            assert connector._client is None