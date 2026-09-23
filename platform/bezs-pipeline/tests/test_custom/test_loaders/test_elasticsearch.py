import pytest
from unittest.mock import MagicMock, patch
from elasticsearch import helpers
from src.custom.loaders.elasticsearch import ElasticsearchBulkIngestor, ElasticsearchSingleIngestor

@pytest.fixture
def mock_es_client():
    return MagicMock()

@pytest.fixture
def sample_config():
    return {
        "index_name": "health_data",
        "settings": {"number_of_shards": 1},
        "mappings": {"properties": {"patient_id": {"type": "keyword"}}}
    }

## 1. Test Index Creation (Parent Logic)
def test_create_index_if_not_exists(mock_es_client, sample_config):
    # Setup: Mock exists to return False
    mock_es_client.indices.exists.return_value = False
    ingestor = ElasticsearchBulkIngestor(mock_es_client, sample_config)
    
    ingestor.create()
    
    # Verify: .create() was called with correct body
    mock_es_client.indices.create.assert_called_once_with(
        index="health_data",
        body={"settings": ingestor.config.settings, "mappings": ingestor.config.mappings}
    )

## 2. Test Bulk Ingestor (Success Path)
def test_bulk_ingestor_success(mock_es_client, sample_config):
    ingestor = ElasticsearchBulkIngestor(mock_es_client, sample_config)
    data = [{"_index": "health_data", "_source": {"patient_id": "1"}}]
    
    with patch("elasticsearch.helpers.bulk") as mock_bulk:
        mock_bulk.return_value = (1, []) # (success count, failed list)
        ingestor.load(data)
        mock_bulk.assert_called_once()

## 3. Test The Error Loop (The i < 3 logic)
def test_bulk_ingestor_error_logging(mock_es_client, sample_config, caplog):
    ingestor = ElasticsearchBulkIngestor(mock_es_client, sample_config)
    data = [{"bad": "data"}]
    
    # Simulate a BulkIndexError with 5 errors
    sample_errors = [{"error": "detail"}] * 5
    bulk_error = helpers.BulkIndexError("Message", errors=sample_errors)
    
    with patch("elasticsearch.helpers.bulk", side_effect=bulk_error):
        with pytest.raises(helpers.BulkIndexError):
            ingestor.load(data)
    
    # Verify: Did we log exactly 3 samples?
    # caplog captures log output so you can assert that specific warnings or errors were recorded by your application.
    error_logs = [record for record in caplog.records if "Sample Failure" in record.message]
    assert len(error_logs) == 3
    assert "Sample Failure" in error_logs[0].message

## 4. Test Single Ingestor
def test_single_ingestor_load(mock_es_client, sample_config):
    ingestor = ElasticsearchSingleIngestor(mock_es_client, sample_config)
    data = [{"_index": "health_data", "_source": {"patient_id": "1"}}]
    
    ingestor.load(data)
    
    # Verify: .index() was called instead of bulk
    mock_es_client.index.assert_called_once_with(
        index="health_data",
        document={"patient_id": "1"}
    )