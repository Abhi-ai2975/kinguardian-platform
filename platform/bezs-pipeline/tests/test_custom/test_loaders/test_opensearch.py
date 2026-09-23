import pytest
from unittest.mock import MagicMock, patch
from opensearchpy import helpers
# Ensure this import matches your actual project structure
from src.custom.loaders.opensearch import OpensearchBulkIngestor, OpensearchSingleIngestor

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

## 1. Test Index Creation
def test_create_index_if_not_exists(mock_es_client, sample_config):
    mock_es_client.indices.exists.return_value = False
    ingestor = OpensearchBulkIngestor(mock_es_client, sample_config)
    
    ingestor.create()
    
    mock_es_client.indices.create.assert_called_once_with(
        index="health_data",
        body={
            "settings": sample_config["settings"], 
            "mappings": sample_config["mappings"]
        }
    )

## 2. Test Bulk Ingestor (Fixed Patch Path)
def test_bulk_ingestor_success(mock_es_client, sample_config):
    ingestor = OpensearchBulkIngestor(mock_es_client, sample_config)
    data = [{"_index": "health_data", "_source": {"patient_id": "1"}}]
    
    # FIX: Patch the helper where it is USED, not where it is defined.
    # If opensearch.py does 'from opensearchpy import helpers', patch that specific location.
    with patch("src.custom.loaders.opensearch.helpers.bulk") as mock_bulk:
        mock_bulk.return_value = (1, []) 
        ingestor.load(data)
        mock_bulk.assert_called_once()

## 3. Test The Error Loop (Fixed Patch Path)
def test_bulk_ingestor_error_logging(mock_es_client, sample_config, caplog):
    ingestor = OpensearchBulkIngestor(mock_es_client, sample_config)
    data = [{"bad": "data"}]
    
    sample_errors = [{"error": "detail"}] * 5
    bulk_error = helpers.BulkIndexError("Message", sample_errors)
    
    # FIX: Same as above, patch the local reference in your source file
    with patch("src.custom.loaders.opensearch.helpers.bulk", side_effect=bulk_error):
        with pytest.raises(helpers.BulkIndexError):
            ingestor.load(data)
    
    error_logs = [record for record in caplog.records if "Sample Failure" in record.message]
    assert len(error_logs) == 3

## 4. Test Single Ingestor (Fixed Assertion Argument)
def test_single_ingestor_load(mock_es_client, sample_config):
    ingestor = OpensearchSingleIngestor(mock_es_client, sample_config)
    # The data source matches what OpenSearch usually expects
    data = [{"_index": "health_data", "_source": {"patient_id": "1"}}]
    
    ingestor.load(data)
    
    # FIX: Ensure the key matches what your OpensearchSingleIngestor uses (body vs document)
    # Based on your previous error log, your code uses 'body='
    mock_es_client.index.assert_called_once_with(
        index="health_data",
        body={"patient_id": "1"}
    )