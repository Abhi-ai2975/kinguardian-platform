"""
Resilient HTTP Client & External Service Timeout Management.
Enforces granular timeouts and bounded retry policies for all external service integrations:
- Connect Timeout: Limit time to establish TCP / TLS connection
- Read Timeout: Limit time waiting for server response bytes
- Total Timeout: Absolute upper bound for the entire HTTP exchange
- Bounded Retries: Exponential backoff with full jitter for transient faults:
  * Transient network errors (ConnectTimeout, ReadTimeout, ConnectError, NetworkError)
  * 429 Too Many Requests (with Retry-After header parsing)
  * Selected 5xx (500, 502, 503, 504)
- Fast-Fail Non-Retryable Errors (NEVER retried):
  * Authorization errors (401 Unauthorized, 403 Forbidden)
  * Validation errors (400 Bad Request, 422 Unprocessable Entity)
  * Business rule / Client errors (404 Not Found, 409 Conflict, 410 Gone, 451 Legal)
- Idempotency Protection: NEVER blindly retry non-idempotent mutations (POST/PATCH) without Idempotency-Key.
"""

import asyncio
import random
import time
from typing import Dict, Any, Optional, Set
from dataclasses import dataclass
import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

IDEMPOTENT_HTTP_METHODS: Set[str] = {"GET", "HEAD", "OPTIONS", "PUT", "DELETE"}
IDEMPOTENCY_HEADER_NAMES: Set[str] = {"idempotency-key", "x-idempotency-key"}

# Non-retryable status code categories (Fast Fail)
NON_RETRYABLE_AUTH_STATUS_CODES: Set[int] = {401, 403}
NON_RETRYABLE_VALIDATION_STATUS_CODES: Set[int] = {400, 422}
NON_RETRYABLE_BUSINESS_STATUS_CODES: Set[int] = {404, 405, 409, 410, 412, 413, 415, 451}

ALL_NON_RETRYABLE_STATUS_CODES: Set[int] = (
    NON_RETRYABLE_AUTH_STATUS_CODES |
    NON_RETRYABLE_VALIDATION_STATUS_CODES |
    NON_RETRYABLE_BUSINESS_STATUS_CODES
)

# Retryable status codes
DEFAULT_RETRYABLE_STATUS_CODES: Set[int] = {408, 429, 500, 502, 503, 504}

# Retryable transient network exceptions
TRANSIENT_NETWORK_EXCEPTIONS = (
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.WriteTimeout,
    httpx.PoolTimeout,
    httpx.ConnectError,
    httpx.RemoteProtocolError,
    httpx.NetworkError,
    ConnectionResetError,
    TimeoutError
)


@dataclass
class TimeoutConfig:
    """
    Granular timeout configuration for external HTTP communications.
    """
    connect: float = 3.0   # Maximum time to establish socket connection
    read: float = 8.0      # Maximum time to receive chunks of response data
    write: float = 5.0     # Maximum time to send request payload
    pool: float = 2.0      # Maximum time to wait for a free connection in pool
    total: float = 15.0    # Absolute upper bound for the full round-trip

    def to_httpx_timeout(self) -> httpx.Timeout:
        """Constructs an httpx.Timeout instance."""
        return httpx.Timeout(
            timeout=self.total,
            connect=self.connect,
            read=self.read,
            write=self.write,
            pool=self.pool
        )


@dataclass
class RetryPolicy:
    """
    Bounded exponential backoff retry policy with jitter.
    Distinguishes transient network errors, rate limits (429), and selected 5xx
    from non-retryable authorization, validation, and business rule failures.
    """
    max_retries: int = 3
    base_backoff_seconds: float = 0.3
    max_backoff_seconds: float = 3.0
    jitter: bool = True
    retryable_status_codes: Set[int] = None
    non_retryable_status_codes: Set[int] = None

    def __post_init__(self):
        if self.retryable_status_codes is None:
            self.retryable_status_codes = set(DEFAULT_RETRYABLE_STATUS_CODES)
        if self.non_retryable_status_codes is None:
            self.non_retryable_status_codes = set(ALL_NON_RETRYABLE_STATUS_CODES)

    def should_retry_status(self, status_code: int) -> bool:
        """
        Determines whether a status code qualifies for retry.
        Explicitly rejects authorization (401/403), validation (400/422), and business (404/409) errors.
        """
        if status_code in self.non_retryable_status_codes:
            return False
        return status_code in self.retryable_status_codes

    def compute_backoff(self, attempt: int, response: Optional[httpx.Response] = None) -> float:
        """
        Computes exponential backoff with full jitter.
        If a 429 response contains a Retry-After header, respects the server-suggested delay.
        """
        if response is not None and response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    delay = float(retry_after)
                    return min(self.max_backoff_seconds, max(0.1, delay))
                except ValueError:
                    pass

        # Exponential backoff: base * 2^attempt
        raw_backoff = min(self.max_backoff_seconds, self.base_backoff_seconds * (2 ** attempt))
        if self.jitter:
            # Full jitter: random between 0.05 and raw_backoff
            return random.uniform(0.05, raw_backoff)
        return raw_backoff

    def is_request_idempotent(self, method: str, headers: Optional[Dict[str, str]] = None) -> bool:
        """
        Determines whether the request is safe to retry on transient network failures.
        Safe for standard idempotent verbs (GET, HEAD, PUT, DELETE).
        For POST/PATCH, retry is ONLY permitted if an explicit Idempotency-Key header is supplied.
        """
        verb = method.upper()
        if verb in IDEMPOTENT_HTTP_METHODS:
            return True

        if headers:
            normalized_headers = {k.lower(): v for k, v in headers.items()}
            for idemp_header in IDEMPOTENCY_HEADER_NAMES:
                if idemp_header in normalized_headers and normalized_headers[idemp_header].strip():
                    return True

        return False


class ResilientHTTPClient:
    """
    Production-grade HTTP client with granular timeout enforcement,
    safe bounded retries with jitter, and strict fast-fail for authorization/validation errors.
    """

    def __init__(
        self,
        service_name: str,
        timeout_config: Optional[TimeoutConfig] = None,
        retry_policy: Optional[RetryPolicy] = None
    ):
        self.service_name = service_name
        self.timeout_config = timeout_config or TimeoutConfig()
        self.retry_policy = retry_policy or RetryPolicy()

    async def execute_request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Any] = None,
        data: Optional[Any] = None,
        files: Optional[Any] = None,
        custom_timeout: Optional[TimeoutConfig] = None
    ) -> httpx.Response:
        """
        Executes an HTTP request with granular timeouts and bounded retries.
        - Fast-fails immediately on 401/403 (auth), 400/422 (validation), 404/409 (business rule).
        - Retries on transient network exceptions, 429, and selected 5xx if idempotent.
        - Will NOT retry non-idempotent operations without an Idempotency-Key.
        """
        timeouts = custom_timeout or self.timeout_config
        httpx_timeout = timeouts.to_httpx_timeout()
        can_retry = self.retry_policy.is_request_idempotent(method, headers)

        max_attempts = self.retry_policy.max_retries if can_retry else 1
        last_exception: Optional[Exception] = None

        for attempt in range(max_attempts):
            start_time = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=httpx_timeout) as client:
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=params,
                        json=json_data,
                        data=data,
                        files=files
                    )
                    elapsed_ms = (time.perf_counter() - start_time) * 1000

                    # 1. Fast-fail on non-retryable authorization, validation, or business rule errors
                    if response.status_code in self.retry_policy.non_retryable_status_codes:
                        logger.debug(
                            f"[{self.service_name}] Request {method} {url} returned non-retryable "
                            f"status {response.status_code} in {elapsed_ms:.1f}ms. Fast-failing."
                        )
                        return response

                    # 2. Check if response status qualifies for retry (429, selected 5xx) on idempotent requests
                    if can_retry and self.retry_policy.should_retry_status(response.status_code):
                        if attempt + 1 < max_attempts:
                            backoff = self.retry_policy.compute_backoff(attempt, response)
                            logger.warning(
                                f"[{self.service_name}] Request {method} {url} returned {response.status_code}. "
                                f"Retrying in {backoff:.2f}s with jitter (Attempt {attempt + 1}/{max_attempts})."
                            )
                            await asyncio.sleep(backoff)
                            continue

                    return response

            except TRANSIENT_NETWORK_EXCEPTIONS as exc:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                last_exception = exc
                logger.warning(
                    f"[{self.service_name}] Transient network error on {method} {url} after {elapsed_ms:.1f}ms: {exc}"
                )

                if can_retry and attempt + 1 < max_attempts:
                    backoff = self.retry_policy.compute_backoff(attempt)
                    logger.info(
                        f"[{self.service_name}] Retrying request in {backoff:.2f}s with jitter "
                        f"(Attempt {attempt + 1}/{max_attempts})..."
                    )
                    await asyncio.sleep(backoff)
                else:
                    break
            except Exception as unhandled_err:
                logger.error(f"[{self.service_name}] Non-retryable unexpected error on {method} {url}: {unhandled_err}")
                raise unhandled_err

        if last_exception:
            raise last_exception
        raise RuntimeError(f"[{self.service_name}] Request failed after {max_attempts} attempts.")
