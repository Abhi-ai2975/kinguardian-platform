import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
from src.custom.extractors.arxiv.downloader import ArxivDownloader, ArxivDownloaderConfig

@pytest.fixture
def mock_config(tmp_path):
    return ArxivDownloaderConfig(
        download_dir=str(tmp_path),
        rate_limit_delay=0.01,
        max_retries=3,
        retry_backoff=0,
        timeout_seconds=5
    )

@pytest.fixture
def mock_conn():
    return AsyncMock()

@pytest.fixture
def downloader(mock_conn, mock_config):
    return ArxivDownloader(mock_conn, mock_config)

@pytest.mark.asyncio
async def test_download_success(downloader, mock_conn):
    """Verifies a successful stream download and file creation."""
    paper = {"arxiv_id": "2301.12345", "pdf_url": "https://arxiv.org/pdf/2301.12345.pdf"}
    
    # Setup Response
    mock_response = AsyncMock()
    # Use MagicMock here to avoid the "got coroutine" error in async for
    mock_response.aiter_bytes = MagicMock()
    mock_response.aiter_bytes.return_value.__aiter__.return_value = [b"chunk1", b"chunk2"]
    mock_response.raise_for_status = MagicMock()

    # Setup Client
    mock_client = MagicMock()
    mock_client.stream.return_value.__aenter__.return_value = mock_response
    mock_client.stream.return_value.__aexit__ = AsyncMock(return_value=None)

    # Setup Connection
    mock_conn.return_value = mock_client

    with patch("src.custom.extractors.arxiv.downloader.open", mock_open()) as m_open:
        result = await downloader.download(paper)

        assert isinstance(result, Path)
        assert result.name == "2301.12345.pdf"
        
        # Verify writing occurred
        handle = m_open()
        handle.write.assert_any_call(b"chunk1")
        handle.write.assert_any_call(b"chunk2")

@pytest.mark.asyncio
async def test_download_skips_if_exists(downloader, mock_config):
    arxiv_id = "already_here"
    paper = {"arxiv_id": arxiv_id, "pdf_url": "http://example.com/test.pdf"}
    existing_file = Path(mock_config.download_dir) / f"{arxiv_id}.pdf"
    existing_file.touch()

    result = await downloader.download(paper)
    assert result == existing_file
    assert downloader.connection.call_count == 0

@pytest.mark.asyncio
async def test_download_retry_logic(downloader, mock_conn):
    paper = {"arxiv_id": "fail_id", "pdf_url": "http://example.com/fail.pdf"}
    mock_client = MagicMock()
    mock_client.stream.side_effect = Exception("Network Error")
    mock_conn.return_value = mock_client

    result = await downloader.download(paper)
    assert result is None
    assert mock_client.stream.call_count == 3

@pytest.mark.asyncio
async def test_rate_limiting_behavior(downloader):
    downloader.rate_limit_delay = 0.2
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        await downloader._rate_limit() # first call sets time
        await downloader._rate_limit() # second call triggers sleep
        mock_sleep.assert_called_once()