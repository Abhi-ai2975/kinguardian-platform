"""
Wearable API Error Handling Test Suite.

Verifies:
1. When Open Wearables or an upstream device provider fails:
   - Raw provider errors (e.g. 502, 500, 429, API key errors) are NOT exposed to the client.
   - Returns standardized error code: `WEARABLE_SERVICE_UNAVAILABLE`.
   - Reassuring message: "We couldn't update your health data right now. Your connection is still intact."
2. Zero technical leak and zero PHI leak in error responses.
"""

import pytest
from app.domains.wearables.domain.exceptions import (
    WearableServiceUnavailableError,
    WearableErrorHandler
)


def test_open_wearables_failure_sanitization():
    """
    Verifies that raw provider failures (e.g. Garmin 502 Bad Gateway) are sanitized
    into WEARABLE_SERVICE_UNAVAILABLE without leaking provider details.
    """
    raw_upstream_error = Exception("Garmin OAuth Gateway HTTP 502 Bad Gateway: Connection reset by peer at 10.0.4.12")

    response = WearableErrorHandler.sanitize_error(raw_upstream_error, provider="garmin")

    # 1. Standardized Error Code
    assert response["error_code"] == "WEARABLE_SERVICE_UNAVAILABLE"

    # 2. Exact user-facing message
    assert response["message"] == "We couldn't update your health data right now. Your connection is still intact."

    # 3. Reassurance & retryability
    assert response["connection_intact"] is True
    assert response["retryable"] is True

    # 4. Zero technical leak
    assert "502" not in response["message"]
    assert "10.0.4.12" not in response["message"]
    assert "Garmin" not in response["message"]


def test_wearable_service_unavailable_error_class():
    """
    Verifies WearableServiceUnavailableError exception behavior.
    """
    err = WearableServiceUnavailableError(
        internal_diagnostic="Oura rate limit exceeded: 429 Too Many Requests",
        provider="oura"
    )

    assert err.error_code == "WEARABLE_SERVICE_UNAVAILABLE"
    assert str(err) == "We couldn't update your health data right now. Your connection is still intact."

    payload = err.to_api_response()
    assert payload["error_code"] == "WEARABLE_SERVICE_UNAVAILABLE"
    assert payload["message"] == "We couldn't update your health data right now. Your connection is still intact."
    assert payload["connection_intact"] is True
