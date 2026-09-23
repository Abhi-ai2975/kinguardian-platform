import pytest
import pydantic_core
from unittest.mock import patch
from src.custom.transformers.document import DocumentTransformer

@pytest.fixture
def doc_config():
    return {
        "index_name": "gmail_index",
        "textractor": {"paragraphs": True},
        "segmentation": {"sentences": True}
    }

@pytest.fixture
def doc_data():
    return [{
        "id": "msg_01",
        "source_id": "gmail_01",
        "body": "Hello world. This is a test.",
        "attachments": ["/tmp/test.pdf"],
        "metadata": {"user": "logi"}
    }]

@patch("src.custom.transformers.document.TXTAI_AVAILABLE", True)
@patch("src.custom.transformers.document.Textractor")
def test_document_chunking_logic(mock_textractor, doc_data, doc_config):
    # Mock txtai output: returns two chunks for the input
    mock_instance = mock_textractor.return_value
    mock_instance.return_value = ["Hello world.", "This is a test."]
    
    transformer = DocumentTransformer(data=doc_data, config=doc_config)
    results = list(transformer())

    # Verify formatting
    assert len(results) == 2
    assert results[0]["_index"] == "gmail_index"
    assert results[0]["_source"]["id"] == "msg_01#chunk0"
    assert "Hello world." in results[0]["_source"]["text"]

def test_strict_validation_error(doc_config):
    # Missing 'source_id' should trigger Pydantic error
    invalid_data = [{"id": "1", "body": "no source_id here"}]
    
    # We catch the log or check that result is empty due to 'continue' in try/except
    with patch("src.custom.transformers.document.TXTAI_AVAILABLE", True), \
         patch("src.custom.transformers.document.Textractor"):
        transformer = DocumentTransformer(data=invalid_data, config=doc_config)
        
        # Tell pytest that we EXPECT a ValidationError here
        with pytest.raises(pydantic_core.ValidationError):
            list(transformer())