"""
MockFileStorageGateway - Development & Testing Adapter Fallback for FileNest WORM Storage.
Simulates secure document upload, retention policy assignment, SHA256 integrity,
and presigned URL generation without requiring a live FileNest server.
"""

import hashlib
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone


class MockFileStorageGateway:
    """
    In-memory Mock File Storage / FileNest Gateway.
    Allows local development and end-to-end document workflows
    without running the FileNest compliance service.
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self._files: Dict[str, Dict[str, Any]] = {}

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/pdf",
        metadata: Optional[Dict[str, Any]] = None,
        retention_days: int = 2555  # 7 years default
    ) -> Dict[str, Any]:
        file_id = str(uuid.uuid4())
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        now = datetime.now(timezone.utc).isoformat()

        record = {
            "file_id": file_id,
            "filename": filename,
            "content_type": content_type,
            "size_bytes": len(file_bytes),
            "sha256": sha256_hash,
            "retention_days": retention_days,
            "metadata": metadata or {},
            "created_at": now,
            "content": file_bytes,
            "download_url": f"{self.base_url}/mock-filenest/download/{file_id}"
        }

        self._files[file_id] = record
        return {
            "file_id": file_id,
            "filename": filename,
            "sha256": sha256_hash,
            "size_bytes": len(file_bytes),
            "download_url": record["download_url"],
            "created_at": now
        }

    async def get_download_url(self, file_id: str, expiry_seconds: int = 3600) -> Optional[str]:
        if file_id in self._files:
            return f"{self.base_url}/mock-filenest/download/{file_id}?exp={expiry_seconds}"
        return None

    async def get_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        record = self._files.get(file_id)
        if not record:
            return None
        return {
            "file_id": record["file_id"],
            "filename": record["filename"],
            "content_type": record["content_type"],
            "size_bytes": record["size_bytes"],
            "sha256": record["sha256"],
            "retention_days": record["retention_days"],
            "metadata": record["metadata"],
            "created_at": record["created_at"]
        }

    async def get_file_bytes(self, file_id: str) -> Optional[bytes]:
        record = self._files.get(file_id)
        return record.get("content") if record else None

    async def delete_file(self, file_id: str) -> bool:
        # FileNest WORM storage forbids permanent delete, but mock allows soft-removal for testing
        if file_id in self._files:
            del self._files[file_id]
            return True
        return False
