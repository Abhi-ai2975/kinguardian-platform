"""
External Service Timeouts, Bounded Retries, and Idempotency Guard Tests.
Validates:
1. Granular connect, read, and total timeout configurations across external HTTP calls.
2. Exponential backoff with jitter on transient network errors, 429, and selected 5xx.
3. Fast-failing without retry on authorization (401/403), validation (400/422), and business rule (404/409) errors.
4. Strict prevention of blind retries for non-idempotent mutations (POST/PATCH) without Idempotency-Key.
"""

import pytest
import httpx
from unittest.mock import patch
from app.core.resilience.http_client import (
    ResilientHTTPClient,
    TimeoutConfig,
    RetryPolicy,
    NON_RETRYABLE_AUTH_STATUS_CODES,
    NON_RETRYABLE_VALIDATION_STATUS_CODES,
    NON_RETRYABLE_BUSINESS_STATUS_CODES
)
from app.core.adapters.prod_filenest import FileNestGateway
from app.domains.clinical.gateway import FHIRClinicalRecordGateway


def test_timeout_config_granular_values():
    """Verifies that granular connect, read, write, pool, and total timeouts are constructed correctly."""
    cfg = TimeoutConfig(connect=2.5, read=7.0, write=4.0, pool=1.5, total=12.0)
    httpx_timeout = cfg.to_httpx_timeout()

    assert httpx_timeout.connect == 2.5
    assert httpx_timeout.read == 7.0
    assert httpx_timeout.write == 4.0
    assert httpx_timeout.pool == 1.5


def test_idempotency_detection_policy():
    """
    Verifies that only standard idempotent HTTP verbs (GET, HEAD, PUT, DELETE)
    or requests with explicit Idempotency-Key headers are classified as safe to retry.
    """
    policy = RetryPolicy()

    # Standard idempotent verbs
    assert policy.is_request_idempotent("GET") is True
    assert policy.is_request_idempotent("HEAD") is True
    assert policy.is_request_idempotent("PUT") is True
    assert policy.is_request_idempotent("DELETE") is True
    assert policy.is_request_idempotent("OPTIONS") is True

    # Standard non-idempotent mutations without key MUST NOT retry
    assert policy.is_request_idempotent("POST") is False
    assert policy.is_request_idempotent("PATCH") is False
    assert policy.is_request_idempotent("POST", headers={"Content-Type": "application/json"}) is False

    # POST with explicit Idempotency-Key is safe to retry
    assert policy.is_request_idempotent("POST", headers={"Idempotency-Key": "req-12345"}) is True
    assert policy.is_request_idempotent("POST", headers={"X-Idempotency-Key": "req-67890"}) is True
    assert policy.is_request_idempotent("PATCH", headers={"idempotency-key": "patch-token"}) is True


def test_retry_policy_categorization_rules():
    """
    Verifies that RetryPolicy accurately distinguishes retryable statuses from non-retryable ones.
    """
    policy = RetryPolicy()

    # 1. Retryable: 429 & Selected 5xx
    assert policy.should_retry_status(429) is True
    assert policy.should_retry_status(502) is True
    assert policy.should_retry_status(503) is True
    assert policy.should_retry_status(504) is True
    assert policy.should_retry_status(500) is True

    # 2. Non-Retryable: Authorization Errors (401, 403)
    for auth_code in NON_RETRYABLE_AUTH_STATUS_CODES:
        assert policy.should_retry_status(auth_code) is False

    # 3. Non-Retryable: Validation Errors (400, 422)
    for val_code in NON_RETRYABLE_VALIDATION_STATUS_CODES:
        assert policy.should_retry_status(val_code) is False

    # 4. Non-Retryable: Business Rule / Resource Failures (404, 409)
    for biz_code in NON_RETRYABLE_BUSINESS_STATUS_CODES:
        assert policy.should_retry_status(biz_code) is False


def test_exponential_backoff_with_jitter_and_retry_after():
    """
    Verifies exponential backoff with jitter computation and Retry-After header parsing.
    """
    policy = RetryPolicy(base_backoff_seconds=0.5, max_backoff_seconds=4.0, jitter=True)

    # Attempt 0: delay in [0.05, 0.5]
    delay_0 = policy.compute_backoff(attempt=0)
    assert 0.05 <= delay_0 <= 0.5

    # Attempt 2: delay in [0.05, 2.0]
    delay_2 = policy.compute_backoff(attempt=2)
    assert 0.05 <= delay_2 <= 2.0

    # 429 response with Retry-After header
    resp_429 = httpx.Response(429, headers={"Retry-After": "1.5"})
    delay_429 = policy.compute_backoff(attempt=0, response=resp_429)
    assert delay_429 == 1.5


@pytest.mark.asyncio
async def test_bounded_retries_on_transient_network_errors():
    """
    Verifies that ResilientHTTPClient attempts bounded retries on transient network errors
    for idempotent requests and stops after max_retries.
    """
    call_count = 0

    async def mock_request(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise httpx.ConnectTimeout("Connection timed out to upstream service")

    client = ResilientHTTPClient(
        service_name="TestService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_request):
        with pytest.raises(httpx.ConnectTimeout):
            await client.execute_request("GET", "http://external-service.local/api/v1/health")

    assert call_count == 3


@pytest.mark.asyncio
async def test_bounded_retries_on_503_service_unavailable():
    """
    Verifies that ResilientHTTPClient retries 503 upstream outages for idempotent requests.
    """
    attempt_count = 0

    async def mock_503_then_success(*args, **kwargs):
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < 3:
            return httpx.Response(503, json={"error": "Service temporarily unavailable"})
        return httpx.Response(200, json={"status": "ok"})

    client = ResilientHTTPClient(
        service_name="EmrService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_503_then_success):
        resp = await client.execute_request("GET", "http://emr.local/api/v1/vitals")
        assert resp.status_code == 200
        assert attempt_count == 3


@pytest.mark.asyncio
async def test_fast_fail_on_authorization_errors_no_retry():
    """
    Verifies that authorization failures (401, 403) FAST-FAIL immediately with 0 retries.
    """
    auth_call_count = 0

    async def mock_auth_failure(*args, **kwargs):
        nonlocal auth_call_count
        auth_call_count += 1
        return httpx.Response(401, json={"detail": "Expired or invalid JWT token"})

    client = ResilientHTTPClient(
        service_name="IamService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_auth_failure):
        resp = await client.execute_request("GET", "http://iam.local/api/v1/userinfo")
        assert resp.status_code == 401
        # FAST-FAIL: Must be called EXACTLY ONCE, never retried!
        assert auth_call_count == 1


@pytest.mark.asyncio
async def test_fast_fail_on_validation_errors_no_retry():
    """
    Verifies that validation failures (400, 422) FAST-FAIL immediately with 0 retries.
    """
    val_call_count = 0

    async def mock_validation_failure(*args, **kwargs):
        nonlocal val_call_count
        val_call_count += 1
        return httpx.Response(422, json={"detail": "Field 'dosage' is required"})

    client = ResilientHTTPClient(
        service_name="FhirService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_validation_failure):
        resp = await client.execute_request("GET", "http://fhir.local/api/v1/meds")
        assert resp.status_code == 422
        # FAST-FAIL: Must be called EXACTLY ONCE
        assert val_call_count == 1


@pytest.mark.asyncio
async def test_fast_fail_on_business_rule_not_found_no_retry():
    """
    Verifies that business rule / resource not found errors (404, 409) FAST-FAIL immediately.
    """
    biz_call_count = 0

    async def mock_404_failure(*args, **kwargs):
        nonlocal biz_call_count
        biz_call_count += 1
        return httpx.Response(404, json={"detail": "Patient not found in EMR"})

    client = ResilientHTTPClient(
        service_name="FhirService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_404_failure):
        resp = await client.execute_request("GET", "http://fhir.local/api/v1/patients/pat-999")
        assert resp.status_code == 404
        # FAST-FAIL: Must be called EXACTLY ONCE
        assert biz_call_count == 1


@pytest.mark.asyncio
async def test_no_blind_retry_on_non_idempotent_post():
    """
    Verifies that non-idempotent POST operations without an Idempotency-Key
    are executed exactly once and NEVER blindly retried on network failure.
    """
    post_call_count = 0

    async def mock_post_request(*args, **kwargs):
        nonlocal post_call_count
        post_call_count += 1
        raise httpx.ReadTimeout("Server read timeout during POST execution")

    client = ResilientHTTPClient(
        service_name="PaymentService",
        timeout_config=TimeoutConfig(connect=1.0, read=2.0, total=3.0),
        retry_policy=RetryPolicy(max_retries=3, base_backoff_seconds=0.01, jitter=False)
    )

    with patch("httpx.AsyncClient.request", side_effect=mock_post_request):
        with pytest.raises(httpx.ReadTimeout):
            await client.execute_request("POST", "http://external-service.local/api/v1/transfer")

    assert post_call_count == 1


@pytest.mark.asyncio
async def test_fhir_gateway_timeout_and_resilience():
    """
    Verifies FHIR Clinical Gateway configures granular timeouts and degrades cleanly.
    """
    gateway = FHIRClinicalRecordGateway(
        emr_gql_url="http://mock-emr.local",
        timeout=4.0
    )

    assert gateway.timeout_config.connect == 2.0
    assert gateway.timeout_config.read == 4.0
    assert gateway.timeout_config.total == 4.0

    with patch("httpx.AsyncClient.request", side_effect=httpx.ConnectTimeout("Connect timeout")):
        result = await gateway.get_patient("pat-unknown-999")
        assert result is None


@pytest.mark.asyncio
async def test_filenest_gateway_idempotency_key_attachment():
    """
    Verifies FileNest gateway attaches SHA256 idempotency key to prevent double upload.
    """
    gateway = FileNestGateway(
        base_url="http://mock-filenest.local",
        api_key="test_key",
        project_id="test_project",
        timeout=8.0
    )

    assert gateway.timeout_config.connect == 3.0
    assert gateway.timeout_config.total == 8.0
    assert gateway.timeout_config.write == 10.0

    captured_headers = {}

    async def mock_upload(method, url, headers=None, **kwargs):
        nonlocal captured_headers
        captured_headers = headers or {}
        return httpx.Response(201, json={"file_id": "fn_123", "status": "stored"})

    with patch.object(gateway.client, "execute_request", side_effect=mock_upload):
        res = await gateway.upload_file(
            file_bytes=b"sample PDF data bytes",
            filename="report.pdf"
        )
        assert res["file_id"] == "fn_123"
        assert "Idempotency-Key" in captured_headers
        assert captured_headers["Idempotency-Key"].startswith("upload-")
