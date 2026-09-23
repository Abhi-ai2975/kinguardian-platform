import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import MagicMock
from src.custom.transformers.json_transformer import JsonTransformer

@pytest.fixture
def mock_config():
    """Simulates the elasticsearch load config."""
    return {"index_name": "health_data"}

@pytest.fixture
def sample_data():
    """Provides valid data for multiple tables."""
    return {
        "users": [
            {
                "id": 1,
                "username": "jdoe",
                "email": "jdoe@example.com",
                "created_at": datetime(2023, 1, 1, 10, 0),
                "updated_at": datetime(2023, 1, 1, 10, 0)
            }
        ],
        "products": [
            {
                "id": 101,
                "name": "Vitamin C",
                "price": Decimal("19.99"),
                "stock": 50,
                "created_at": datetime(2023, 1, 1, 10, 0),
                "updated_at": datetime(2023, 1, 1, 10, 0)
            }
        ]
    }

def test_transform_success(sample_data, mock_config):
    """Verifies that valid data is transformed and wrapped correctly."""
    transformer = JsonTransformer(data=sample_data, config=mock_config)
    
    # Execute the __call__ (which is a generator)
    results = list(transformer())

    assert len(results) == 2
    
    # Check User Record
    assert results[0]["_index"] == "health_data"
    assert results[0]["_source"]["username"] == "jdoe"
    
    # Check Product Record (Decimal should be float now because of base.py)
    assert results[1]["_source"]["price"] == 19.99
    assert results[1]["_source"]["stock"] == 50

def test_transform_strict_validation_failure(mock_config):
    """Verifies that rows with extra columns are skipped (strict mode)."""
    dirty_data = {
        "users": [
            {
                "id": 2,
                "username": "bad_row",
                "email": "bad@example.com",
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "extra_column": "I should not be here!" # This triggers 'extra=forbid'
            }
        ]
    }
    
    transformer = JsonTransformer(data=dirty_data, config=mock_config)
    results = list(transformer())

    # The dirty row should be skipped, resulting in an empty list
    assert len(results) == 0

def test_transform_no_schema_fallback(mock_config):
    """Verifies that if a table has no schema, it passes through raw."""
    unknown_data = {
        "unknown_table": [{"some_key": "some_value"}]
    }
    
    transformer = JsonTransformer(data=unknown_data, config=mock_config)
    results = list(transformer())

    assert len(results) == 1
    assert results[0]["_source"]["some_key"] == "some_value"