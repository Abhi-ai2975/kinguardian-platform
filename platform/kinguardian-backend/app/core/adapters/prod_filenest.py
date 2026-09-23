"""
Production FileNest Gateway.
Integrates with FileNest WORM Storage Service via HTTP API and AsyncFileNest SDK
for document storage, SHA256 integrity verification, and presigned URLs.
Enforces connect, read, and total timeouts with idempotency-safe retries.
"""

import hashlib
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import get_logger
from app.core.resilience.http_client import ResilientHTTPClient, TimeoutConfig, RetryPolicy

logger = get_logger(__name__)


class FileNestGateway:
    """
    Production FileNest Gateway for immutable document archiving.
    Enforces compliance retention periods (WORM storage).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        project_id: Optional[str] = None,
        timeout: float = 10.0
    ):
        self.base_url = (base_url or settings.FILENEST_URL).rstrip("/")
        if api_key:
            self.api_key = api_key
        elif hasattr(settings.FILENEST_API_KEY, "get_secret_value"):
            self.api_key = settings.FILENEST_API_KEY.get_secret_value()
        else:
            self.api_key = str(settings.FILENEST_API_KEY)

        self.project_id = project_id or settings.FILENEST_PROJECT_ID
        self.timeout_config = TimeoutConfig(
            connect=3.0,
            read=min(timeout, 8.0),
            write=10.0,  # Generous write timeout for multi-megabyte PDF streaming
            pool=2.0,
            total=timeout
        )
        self.retry_policy = RetryPolicy(max_retries=3, base_backoff_seconds=0.3)
        self.client = ResilientHTTPClient(
            service_name="FileNestService",
            timeout_config=self.timeout_config,
            retry_policy=self.retry_policy
        )

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json"
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if self.project_id:
            headers["X-Project-ID"] = self.project_id
        return headers

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/pdf",
        metadata: Optional[Dict[str, Any]] = None,
        retention_days: int = 2555  # 7 years
    ) -> Dict[str, Any]:
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        headers = self._get_headers()
        # Non-blindly retryable: use SHA256 checksum as Idempotency Key
        headers["Idempotency-Key"] = f"upload-{sha256_hash}"

        files = {"file": (filename, file_bytes, content_type)}
        data = {
            "retention_days": str(retention_days),
            "sha256": sha256_hash,
            "metadata": str(metadata or {})
        }

        try:
            res = await self.client.execute_request(
                method="POST",
                url=f"{self.base_url}/api/v1/files/upload",
                headers=headers,
                files=files,
                data=data
            )
            if res.status_code in (200, 201):
                return res.json()
        except Exception as e:
            logger.error(f"FileNestGateway: upload_file failed for {filename}: {e}")
            raise RuntimeError(f"FileNest upload failed: {e}")

        raise RuntimeError(f"FileNest upload rejected with status {res.status_code}")

    async def get_download_url(self, file_id: str, expiry_seconds: int = 3600) -> Optional[str]:
        headers = self._get_headers()
        try:
            res = await self.client.execute_request(
                method="GET",
                url=f"{self.base_url}/api/v1/files/{file_id}/presigned-url",
                params={"expiry_seconds": expiry_seconds},
                headers=headers
            )
            if res.status_code == 200:
                return res.json().get("download_url")
        except Exception as e:
            logger.warning(f"FileNestGateway: get_download_url failed for {file_id}: {e}")
        return None

    async def get_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        headers = self._get_headers()
        try:
            res = await self.client.execute_request(
                method="GET",
                url=f"{self.base_url}/api/v1/files/{file_id}/metadata",
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.warning(f"FileNestGateway: get_metadata failed for {file_id}: {e}")
        return None
