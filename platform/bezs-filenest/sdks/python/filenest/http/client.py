"""
filenest.http.client — synchronous HTTP client wrapping httpx.

Maps HTTP status codes → typed exception classes and retries on 5xx
with exponential backoff.

Usage:
    from filenest.http.client import FileNestHttpClient
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from filenest.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    FileNestError,
    LegalHoldError,
    MetadataValidationError,
    NetworkError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    WORMViolationError,
)

DEFAULT_BASE_URL = "https://api.filenest.io"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 3


def _map_error(status: int, body: dict) -> None:
    """Raise the appropriate typed exception for a non-2xx response."""
    err = body.get("error", {}) if isinstance(body, dict) else {}
    message = err.get("message", f"HTTP {status}")
    code = err.get("code", "server_error")

    if status == 401:
        raise AuthenticationError(message)
    if status == 403:
        raise AuthorizationError(message, err.get("required_scope"))
    if status == 404:
        raise NotFoundError(message)
    if status == 409:
        if code == "worm_violation":
            raise WORMViolationError(message)
        if code == "legal_hold_active":
            raise LegalHoldError(message)
        raise ConflictError(message)
    if status == 422:
        errors = err.get("validation_errors", [])
        if code == "metadata_validation_error":
            raise MetadataValidationError(errors)
        raise ValidationError(message, errors)
    if status == 429:
        raise RateLimitError(message, err.get("retry_after"))
    raise FileNestError(message, code, status)


class FileNestHttpClient:
    """Synchronous HTTP client for the FileNest API."""

    def __init__(
        self,
        api_key: str,
        project_id: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        api_version: str | None = None,
    ) -> None:
        self.api_key = api_key
        self.project_id = project_id
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        }
        if api_version:
            headers["FileNest-Version"] = api_version
        self._client = httpx.Client(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        attempt = 0
        while True:
            try:
                response = self._client.request(method, path, **kwargs)
            except httpx.TransportError as exc:
                if attempt < self.max_retries:
                    attempt += 1
                    time.sleep(min(2**attempt, 8))
                    continue
                raise NetworkError(str(exc)) from exc

            if response.status_code >= 500 and attempt < self.max_retries:
                attempt += 1
                time.sleep(min(2**attempt, 8))
                continue

            if not response.is_success:
                try:
                    body = response.json()
                except Exception:
                    body = {}
                _map_error(response.status_code, body)

            if response.status_code == 204 or not response.content:
                return None
            return response.json()

    def get(self, path: str, params: dict | None = None) -> Any:
        return self._request("GET", path, params=params)

    def post(self, path: str, json: Any = None, **kwargs: Any) -> Any:
        return self._request("POST", path, json=json, **kwargs)

    def patch(self, path: str, json: Any = None) -> Any:
        return self._request("PATCH", path, json=json)

    def delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> FileNestHttpClient:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()
