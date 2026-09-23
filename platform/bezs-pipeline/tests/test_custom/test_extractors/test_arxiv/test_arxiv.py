import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from src.custom.extractors.arxiv import ArxivExtractor  

# --- MOCK DATA ---
SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.0001</id>
    <title> Test Paper </title>
    <summary> This is a test. </summary>
    <published>2023-01-01</published>
    <author><name>John Doe</name></author>
    <category term="cs.AI"/>
    <link type="application/pdf" href="https://arxiv.org/pdf/2301.0001.pdf"/>
  </entry>
</feed>"""

# --- FIXTURES (Setup) ---
@pytest.fixture
def extractor_setup():
    mock_conn = AsyncMock()
    # This config now has EVERYTHING both models need
    config = {
        # For ExtractorConfig
        "search_category": "cs.AI",
        "max_results": 1,
        "base_url": "https://export.arxiv.org/api/query",
        "namespaces": {"atom": "http://www.w3.org/2005/Atom"},
        # For DownloaderConfig
        "download_dir": "./test_downloads",
        "rate_limit_delay": 0.1,
        "max_retries": 3,
        "retry_backoff": 1,
        "timeout_seconds": 30
    }
    extractor = ArxivExtractor(mock_conn, config)
    return extractor, mock_conn

# --- TESTS ---

@pytest.mark.asyncio
async def test_rate_limit(extractor_setup):
    """Tests if _rate_limit pauses execution correctly."""
    extractor, _ = extractor_setup
    extractor.config.rate_limit_delay = 0.2
    
    start = asyncio.get_event_loop().time()
    await extractor._rate_limit() # First call (sets time)
    await extractor._rate_limit() # Second call (should wait)
    end = asyncio.get_event_loop().time()
    
    assert (end - start) >= 0.2

def test_get_pdf(extractor_setup):
    """Tests if _get_pdf finds the correct link."""
    extractor, _ = extractor_setup
    import xml.etree.ElementTree as ET
    root = ET.fromstring(SAMPLE_XML)
    entry = root.find("atom:entry", extractor.config.namespaces)
    
    url = extractor._get_pdf(entry)
    assert url == "https://arxiv.org/pdf/2301.0001.pdf"

def test_parse_xml(extractor_setup):
    """Tests if XML is converted to a list of dictionaries correctly."""
    extractor, _ = extractor_setup
    results = extractor._parse_xml(SAMPLE_XML)
    
    assert len(results) == 1
    assert results[0]["arxiv_id"] == "2301.0001"
    assert results[0]["authors"] == ["John Doe"]

@pytest.mark.asyncio
async def test_fetch_papers(extractor_setup):
    """Tests the network request and result fetching."""
    extractor, mock_conn = extractor_setup
    
    # Mock the response from the 'client.get' call
    mock_client = AsyncMock()
    mock_conn.return_value = mock_client
    mock_response = MagicMock()
    mock_response.text = SAMPLE_XML
    mock_client.get.return_value = mock_response

    papers = await extractor.fetch_papers()
    
    assert len(papers) == 1
    mock_client.get.assert_called_once() # Verify the URL was actually requested

@pytest.mark.asyncio
async def test_extract_full_workflow(extractor_setup):
    """Tests the full process: Fetch -> Download -> Enrich."""
    extractor, _ = extractor_setup
    
    # 1. Mock fetch_papers to return a fake list
    fake_papers = [{"title": "Paper 1", "pdf_url": "http://test.pdf"}]
    extractor.fetch_papers = AsyncMock(return_value=fake_papers)
    
    # 2. Mock the downloader to return a fake path
    extractor.downloader.download = AsyncMock(return_value="/local/path/paper.pdf")

    results = await extractor.extract()
    
    assert results[0]["local_pdf_path"] == "/local/path/paper.pdf"
    assert "Paper 1" in results[0]["title"]