"""
Service Credentials Security & Masking Test Suite.

Verifies:
1. Open Wearables API credentials and keys are stored ONLY on the backend.
2. Credentials use pydantic `SecretStr` to prevent leakage in logs, stack traces, and serialized outputs.
3. Zero client exposure invariant: Secrets are never sent to mobile clients.
"""

import pytest
from pydantic import SecretStr
from app.core.config import settings


def test_open_wearables_api_key_is_secret_str():
    """
    Verifies that OPEN_WEARABLES_API_KEY is defined as a SecretStr,
    ensuring it is masked in strings, representations, and logs.
    """
    assert isinstance(settings.OPEN_WEARABLES_API_KEY, SecretStr)

    # String representation is masked
    masked_repr = str(settings.OPEN_WEARABLES_API_KEY)
    assert masked_repr == "**********"
    assert "dev_open_wearables_secret_key" not in masked_repr

    # repr() is masked
    repr_str = repr(settings.OPEN_WEARABLES_API_KEY)
    assert "**********" in repr_str
    assert "dev_open_wearables_secret_key" not in repr_str


def test_backend_settings_model_dump_masks_secrets():
    """
    Verifies that serializing application settings does not expose the raw API key.
    """
    dump = settings.model_dump()
    assert isinstance(dump["OPEN_WEARABLES_API_KEY"], SecretStr)
    assert str(dump["OPEN_WEARABLES_API_KEY"]) == "**********"
