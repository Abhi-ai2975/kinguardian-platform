import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from src.custom.transformers.arxiv.pdf.engine import DoclingEngine
from src.custom.transformers.schemas import PDFValidationError

@pytest.fixture
def engine_config():
    return {
        "max_pages": 5,
        "max_file_size_mb": 2,
        "do_table_structure": False,
        "do_ocr": False
    }

def test_engine_initialization(engine_config):
    """Test if config values are correctly converted (MB to Bytes)."""
    engine = DoclingEngine(engine_config)
    assert engine.max_pages == 5
    assert engine.max_file_size_bytes == 2 * 1024 * 1024

@patch("pypdfium2.PdfDocument")
def test_validate_pdf_logic(mock_pdfium, engine_config):
    """Test the physical file validation logic (Size, Header, Pages)."""
    engine = DoclingEngine(engine_config)
    mock_path = MagicMock(spec=Path)
    mock_path.exists.return_value = True
    mock_path.stat.return_value.st_size = 1000  # 1KB
    
    # Mock the %PDF- header check
    with patch("builtins.open", pytest.raises(Exception)): # Simplified for logic
        with patch("src.custom.transformers.arxiv.pdf.engine.open", MagicMock()):
            # Mock pypdfium to return 10 pages (which is > max_pages=5)
            mock_pdf_doc = MagicMock()
            mock_pdf_doc.__len__.return_value = 10
            mock_pdfium.return_value = mock_pdf_doc
            
            with pytest.raises(PDFValidationError, match="Exceeds max pages"):
                engine._validate_pdf(mock_path)

@pytest.mark.asyncio
@patch("src.custom.transformers.arxiv.pdf.engine.DocumentConverter")
async def test_parse_pdf_section_extraction(mock_converter, engine_config):
    """Test if the 'scratchpad' logic correctly groups headings and text."""
    engine = DoclingEngine(engine_config)
    
    # Mock Docling Output
    mock_doc = MagicMock()
    mock_element_1 = MagicMock(label="title", text="Introduction")
    mock_element_2 = MagicMock(label="text", text="Body paragraph 1")
    mock_doc.texts = [mock_element_1, mock_element_2]
    mock_doc.export_to_text.return_value = "Full text"
    
    mock_result = MagicMock()
    mock_result.document = mock_doc
    mock_converter.return_value.convert.return_value = mock_result

    # Bypass validation for the test
    engine._validate_pdf = MagicMock()
    
    result = await engine.parse_pdf(Path("dummy.pdf"))
    
    assert result.sections[0].title == "Introduction"
    assert result.sections[0].content == "Body paragraph 1"