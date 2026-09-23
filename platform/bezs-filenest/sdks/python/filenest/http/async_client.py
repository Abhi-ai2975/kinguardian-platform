"""
filenest.http.async_client — asynchronous HTTP client wrapping httpx.AsyncClient.

Same error mapping and retry logic as the sync client, but async throughout.

Usage:
    from filenest.http.async_client import AsyncFileNestHttpClient
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from filenest.exceptions import NetworkError
from filenest.http.client import DEFAULT_BASE_URL, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT, _map_error


class AsyncFileNestHttpClient:
    """Asynchronous HTTP client for the FileNest API."""

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
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
        )

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        attempt = 0
        while True:
            try:
                response = await self._client.request(method, path, **kwargs)
            except httpx.TransportError as exc:
                if attempt < self.max_retries:
                    attempt += 1
                    await asyncio.sleep(min(2**attempt, 8))
                    continue
                raise NetworkError(str(exc)) from exc

            if response.status_code >= 500 and attempt < self.max_retries:
                attempt += 1
                await asyncio.sleep(min(2**attempt, 8))
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

    async def get(self, path: str, params: dict | None = None) -> Any:
        return await self._request("GET", path, params=params)

    async def post(self, path: str, json: Any = None, **kwargs: Any) -> Any:
        return await self._request("POST", path, json=json, **kwargs)

    async def patch(self, path: str, json: Any = None) -> Any:
        return await self._request("PATCH", path, json=json)

    async def delete(self, path: str) -> Any:
        return await self._request("DELETE", path)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> AsyncFileNestHttpClient:
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()
