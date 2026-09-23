import pytest
from src.custom.transformers.arxiv.text.chunker import TextChunker
from src.custom.transformers.schemas import PdfContent

@pytest.fixture
def chunker_config():
    return {
        "chunking": {
            "chunk_size": 10,
            "overlap_size": 2,
            "min_chunk_size": 5
        }
    }

def test_chunking_sliding_window(chunker_config):
    # Create mock PDF data with a long text
    # 15 words total
    long_text = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen"
    mock_pdf = {
        "raw_text": long_text,
        "sections": [],
        "figures": [],
        "tables": [],
        "references": [],
        "parser_used": "docling",
        "metadata": {"arxiv_id": "2401.1234"}
    }
    
    chunker = TextChunker(data=[mock_pdf], config=chunker_config)
    results = list(chunker())

    # With size 10 and overlap 2:
    # Chunk 1: words 0-10
    # Chunk 2: words 8-15
    assert len(results) == 2
    assert results[0]["_source"]["metadata"]["chunk_index"] == 0
    assert results[0]["_source"]["section_title"] == "Body"
    assert results[1]["_source"]["metadata"]["chunk_index"] == 1
    assert results[1]["_source"]["section_title"] == "Body"