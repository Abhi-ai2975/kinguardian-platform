import pytest
import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from src.custom.transformers.arxiv.pdf.pdf_transformer import PDFTransformer

@pytest.fixture
def transformer_config():
    return {
        "index_name": "arxiv_index",
        "docling": {
            "max_concurrency": 2,
            "max_pages": 10
        }
    }

@pytest.mark.asyncio
@patch("src.custom.transformers.arxiv.pdf.pdf_transformer.DoclingEngine")
async def test_pdf_transformer_orchestration(mock_engine_class, transformer_config):
    """Test if the transformer correctly coordinates the engine and semaphore."""
    # Setup Mock Engine
    mock_engine_instance = mock_engine_class.return_value
    mock_engine_instance.parse_pdf = AsyncMock()
    
    # Create a fake PdfContent return value
    mock_content = MagicMock()
    mock_content.model_dump.return_value = {
        "raw_text": "Sample content",
        "sections": [{"title": "Intro", "content": "Hello"}]
    }
    mock_engine_instance.parse_pdf.return_value = mock_content

    # Prepare data (2 fake PDF paths)
    pdf_list = [Path("paper1.pdf"), Path("paper2.pdf")]
    
    with patch.object(Path, "exists", return_value=True):
        transformer = PDFTransformer(data=pdf_list, config=transformer_config)
        results = await transformer()

        # Check if both were processed
        assert len(results) == 2
        assert results[0]["_index"] == "arxiv_index"
        assert results[0]["_source"]["raw_text"] == "Sample content"
        
        # Verify semaphore was used (parse_pdf called twice)
        assert mock_engine_instance.parse_pdf.call_count == 2

@pytest.mark.asyncio
async def test_empty_path_list(transformer_config):
    """Test that transformer returns empty list if no paths are provided."""
    transformer = PDFTransformer(data=[], config=transformer_config)
    results = await transformer()
    assert results == []