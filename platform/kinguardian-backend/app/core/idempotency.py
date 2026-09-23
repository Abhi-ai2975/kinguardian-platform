import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Tuple, Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, Header

from app.core.logging import get_logger
from app.domains.family.infrastructure.models import IdempotencyRecord

logger = get_logger(__name__)


def compute_request_hash(payload: Any) -> str:
    """
    Computes a deterministic SHA256 hash for a given request payload or parameters.
    """
    if payload is None:
        raw = b""
    elif isinstance(payload, bytes):
        raw = payload
    elif isinstance(payload, str):
        raw = payload.encode("utf-8")
    elif isinstance(payload, dict) or isinstance(payload, list):
        raw = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    else:
        raw = str(payload).encode("utf-8")

    return hashlib.sha256(raw).hexdigest()


class IdempotencyService:
    """
    Idempotency Service:
    - Provides guaranteed exactly-once mutation semantics using the `Idempotency-Key` header.
    - Supported mutating operations:
        1. Medication confirmation
        2. Care task creation
        3. Document processing commands
        4. Notification creation
        5. AI action execution
        6. Family message sending
    - Detects payload divergence on duplicate key reuse (raises HTTP 422).
    - Persists idempotent execution records with status codes and response bodies.
    """

    @classmethod
    async def get_recorded_response(
        cls,
        session: AsyncSession,
        idempotency_key: str,
        user_id: Optional[uuid.UUID],
        endpoint: str,
        payload: Any
    ) -> Optional[Tuple[int, Dict[str, Any]]]:
        """
        Checks if a request with this idempotency key was previously processed.
        If found:
        - Confirms the request hash matches.
        - Returns (status_code, response_body).
        - If the payload differs, raises an HTTP 422 Unprocessable Content.
        """
        if not idempotency_key:
            return None

        req_hash = compute_request_hash(payload)
        conditions = [
            IdempotencyRecord.idempotency_key == idempotency_key,
            IdempotencyRecord.endpoint == endpoint
        ]
        if user_id is not None:
            conditions.append(IdempotencyRecord.user_id == user_id)

        stmt = select(IdempotencyRecord).where(*conditions)
        result = await session.execute(stmt)
        record = result.scalars().first()

        if record:
            if record.request_hash != req_hash:
                logger.warning(
                    f"Idempotency conflict: key '{idempotency_key}' used with differing payload on {endpoint}."
                )
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Idempotency-Key reuse with conflicting request payload."
                )
            logger.info(f"Idempotent cache hit for key '{idempotency_key}' on {endpoint}. Returning saved response.")
            return (record.status_code, record.response_body)

        return None

    @classmethod
    async def record_response(
        cls,
        session: AsyncSession,
        idempotency_key: str,
        user_id: Optional[uuid.UUID],
        endpoint: str,
        payload: Any,
        status_code: int,
        response_body: Dict[str, Any]
    ) -> Optional[IdempotencyRecord]:
        """
        Persists the response of a successful or completed mutating operation.
        """
        if not idempotency_key:
            return None

        req_hash = compute_request_hash(payload)
        record = IdempotencyRecord(
            id=uuid.uuid4(),
            idempotency_key=idempotency_key,
            user_id=user_id,
            endpoint=endpoint,
            request_hash=req_hash,
            status_code=status_code,
            response_body=response_body,
            created_at=datetime.now(timezone.utc)
        )
        session.add(record)
        try:
            await session.commit()
        except Exception:
            await session.flush()
        return record

