import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from typing import Dict, Any

# Adjust import path to your project structure
from src.custom.embedder.txtai import TxtaiEmbeddings

@pytest.fixture
def txtai_config() -> Dict[str, Any]:
    """Standard configuration for txtai tests."""
    return {
        "path": "sentence-transformers/all-MiniLM-L6-v2",
        "content": True,
        "backend": "faiss"
    }

@pytest.fixture
def sample_data() -> list[Dict[str, Any]]:
    """Simulates the stream of records coming from a Transformer/Elasticsearch format."""
    return [
        {
            "_source": {
                "id": "1",
                "text": "The quick brown fox jumps over the lazy dog",
                "metadata": "test1"
            }
        },
        {
            "_source": {
                "id": "2",
                "text": "Artificial intelligence is changing the world",
                "metadata": "test2"
            }
        }
    ]

@pytest.mark.asyncio
async def test_txtai_initialization(txtai_config):
    """Test if the engine initializes correctly with the pydantic config."""
    # We patch EmbEngine so it doesn't actually load a model from HuggingFace
    with patch("src.custom.embedder.txtai.EmbEngine") as MockEngine:
        service = TxtaiEmbeddings(data=iter([]), config=txtai_config)
        
        assert service.config.path == "sentence-transformers/all-MiniLM-L6-v2"
        # Verify txtai engine was called with the dict version of our config
        MockEngine.assert_called_once_with(txtai_config)

@pytest.mark.asyncio
async def test_embed_success(sample_data, txtai_config):
    """Test that the embed method adds a 'vector' field to records."""
    
    with patch("src.custom.embedder.txtai.EmbEngine") as MockEngine:
        # 1. Setup Mock Engine behavior
        mock_instance = MockEngine.return_value
        # txtai transform returns a numpy array
        mock_instance.transform.return_value = np.array([0.1, 0.2, 0.3])
        
        # 2. Initialize Service
        service = TxtaiEmbeddings(data=iter(sample_data), config=txtai_config)
        
        # 3. Execute
        results = list(service.embed())

        # 4. Assertions
        assert len(results) == 2
        for record in results:
            assert "vector" in record["_source"]
            assert record["_source"]["vector"] == [0.1, 0.2, 0.3]
            # Ensure text was passed to the engine
            assert mock_instance.transform.called

@pytest.mark.asyncio
async def test_embed_empty_text(txtai_config):
    """Test that records with empty text are handled without crashing."""
    empty_data = [{"_source": {"id": "no-text", "text": ""}}]
    
    with patch("src.custom.embedder.txtai.EmbEngine") as MockEngine:
        mock_instance = MockEngine.return_value
        service = TxtaiEmbeddings(data=iter(empty_data), config=txtai_config)
        
        results = list(service.embed())
        
        assert "vector" not in results[0]["_source"]
        mock_instance.transform.assert_not_called()

def test_available_check():
    """Test the static available check."""
    # This simply tests the boolean constant in the module
    assert isinstance(TxtaiEmbeddings.available(), bool)

def test_missing_txtai_raises_error(txtai_config):
    """Test that initializing raises ImportError if txtai isn't available."""
    with patch("src.custom.embedder.txtai.TXTAI_AVAILABLE", False):
        with pytest.raises(ImportError, match="txtai is not installed"):
            TxtaiEmbeddings(data=iter([]), config=txtai_config)