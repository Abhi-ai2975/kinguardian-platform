import json
import time
import uuid
from typing import Optional, Any, Dict, Tuple, List
from contextlib import asynccontextmanager


from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


import fnmatch


class EphemeralMemoryBackend:
    """
    High-performance in-memory TTL store for local development and test isolation.
    Mimics Redis atomic operations, TTL expirations, and distributed lock leases.
    """
    def __init__(self):
        # key -> (value_str, expire_at_timestamp_float)
        self._data: Dict[str, Tuple[str, Optional[float]]] = {}

    def _is_expired(self, key: str) -> bool:
        if key not in self._data:
            return True
        _, expire_at = self._data[key]
        if expire_at is not None and time.time() > expire_at:
            del self._data[key]
            return True
        return False

    def get(self, key: str) -> Optional[str]:
        if self._is_expired(key):
            return None
        return self._data[key][0]

    def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        expire_at = time.time() + ex if ex else None
        self._data[key] = (value, expire_at)

    def delete(self, key: str) -> bool:
        if key in self._data:
            del self._data[key]
            return True
        return False

    def keys(self, pattern: str = "*") -> List[str]:
        # Filter unexpired keys matching glob pattern
        valid_keys = [k for k in list(self._data.keys()) if not self._is_expired(k)]
        if pattern == "*":
            return valid_keys
        return [k for k in valid_keys if fnmatch.fnmatch(k, pattern)]

    def delete_pattern(self, pattern: str) -> List[str]:
        matched = self.keys(pattern)
        deleted = []
        for k in matched:
            if self.delete(k):
                deleted.append(k)
        return deleted

    def exists(self, key: str) -> bool:
        return not self._is_expired(key)

    def incr(self, key: str, ex: Optional[int] = None) -> int:
        if self._is_expired(key):
            self.set(key, "1", ex=ex)
            return 1
        val = int(self._data[key][0]) + 1
        expire_at = self._data[key][1]
        self._data[key] = (str(val), expire_at)
        return val

    def set_if_not_exists(self, key: str, value: str, ex: int) -> bool:
        if not self._is_expired(key):
            return False
        self.set(key, value, ex=ex)
        return True

    def delete_if_match(self, key: str, value: str) -> bool:
        if not self._is_expired(key):
            if self._data[key][0] == value:
                del self._data[key]
                return True
        return False

    def clear(self):
        self._data.clear()



class RedisCacheService:
    """
    KinGuardian Redis Cache & Coordination Gateway.

    CRITICAL ARCHITECTURAL INVARIANT:
    --------------------------------
    Never treat Redis as the system of record.
    PostgreSQL is the single source of truth for all clinical, consent, and audit records.
    Redis is used exclusively for ephemeral speedups, distributed coordination, and quotas:

    1. Family summary cache (fast read projections)
    2. Authorization lookups (ephemeral permission tokens)
    3. Rate limiting (sliding window counters)
    4. Short-lived AI context caching (conversation scratchpad)
    5. Idempotency (fast replay cache before DB fallback)
    6. Locks (distributed critical section mutexes)
    7. Job coordination (worker leader election & task leases)
    """

    def __init__(self, backend: Optional[EphemeralMemoryBackend] = None):
        self._backend = backend or EphemeralMemoryBackend()

    # -------------------------------------------------------------------------
    # Generic Cache Abstraction Methods
    # -------------------------------------------------------------------------
    def get(self, key: str) -> Optional[Any]:
        val = self._backend.get(key)
        if val is None:
            return None
        try:
            return json.loads(val)
        except Exception:
            return val

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        if isinstance(value, (dict, list, bool, int, float)):
            val_str = json.dumps(value)
        elif hasattr(value, "model_dump_json"):
            val_str = value.model_dump_json()
        elif hasattr(value, "dict"):
            val_str = json.dumps(value.dict())
        else:
            val_str = str(value)
        self._backend.set(key, val_str, ex=ttl_seconds)

    def delete(self, key: str) -> bool:
        return self._backend.delete(key)

    def delete_pattern(self, pattern: str) -> List[str]:
        return self._backend.delete_pattern(pattern)

    def invalidate_keys(self, keys: List[str]) -> List[str]:
        invalidated = []
        for k in keys:
            if "*" in k or "?" in k or "[" in k:
                deleted = self.delete_pattern(k)
                invalidated.extend(deleted)
            else:
                if self.delete(k):
                    invalidated.append(k)
        return invalidated

    # -------------------------------------------------------------------------
    # 1. Family Summary Cache
    # -------------------------------------------------------------------------

    def get_family_summary(self, family_id: Any) -> Optional[Dict[str, Any]]:
        key = f"family_summary:{str(family_id)}"
        val = self._backend.get(key)
        if val:
            logger.debug(f"Redis Cache HIT: {key}")
            return json.loads(val)
        return None

    def set_family_summary(self, family_id: Any, summary: Dict[str, Any], ttl_seconds: int = 300) -> None:
        key = f"family_summary:{str(family_id)}"
        self._backend.set(key, json.dumps(summary), ex=ttl_seconds)

    def invalidate_family_summary(self, family_id: Any) -> None:
        key = f"family_summary:{str(family_id)}"
        self._backend.delete(key)

    # -------------------------------------------------------------------------
    # 2. Authorization Lookups
    # -------------------------------------------------------------------------
    def get_auth_lookup(self, user_id: Any, family_id: Any, subject_id: Optional[Any] = None, scope: str = "read") -> Optional[bool]:
        key = f"auth_lookup:{str(user_id)}:{str(family_id)}:{str(subject_id or 'none')}:{scope}"
        val = self._backend.get(key)
        if val is not None:
            return val == "true"
        return None

    def set_auth_lookup(self, user_id: Any, family_id: Any, subject_id: Optional[Any], scope: str, is_allowed: bool, ttl_seconds: int = 180) -> None:
        key = f"auth_lookup:{str(user_id)}:{str(family_id)}:{str(subject_id or 'none')}:{scope}"
        self._backend.set(key, "true" if is_allowed else "false", ex=ttl_seconds)

    def invalidate_auth_lookup(self, user_id: Any, family_id: Any) -> None:
        # Pattern invalidation or specific key flush
        key = f"auth_lookup:{str(user_id)}:{str(family_id)}:none:read"
        self._backend.delete(key)

    # -------------------------------------------------------------------------
    # 3. Rate Limiting
    # -------------------------------------------------------------------------
    def check_rate_limit(self, tier: str, client_id: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int]:
        """
        Atomic INCR + EXPIRE rate limiter.
        Returns (is_allowed, current_count).
        """
        key = f"ratelimit:{tier}:{client_id}"
        count = self._backend.incr(key, ex=window_seconds)
        is_allowed = count <= limit
        return is_allowed, count

    # -------------------------------------------------------------------------
    # 4. Short-lived AI Context Caching
    # -------------------------------------------------------------------------
    def get_ai_context(self, session_id: Any) -> Optional[Dict[str, Any]]:
        key = f"ai_context:{str(session_id)}"
        val = self._backend.get(key)
        if val:
            return json.loads(val)
        return None

    def set_ai_context(self, session_id: Any, context_data: Dict[str, Any], ttl_seconds: int = 900) -> None:
        key = f"ai_context:{str(session_id)}"
        self._backend.set(key, json.dumps(context_data), ex=ttl_seconds)

    def invalidate_ai_context(self, session_id: Any) -> None:
        key = f"ai_context:{str(session_id)}"
        self._backend.delete(key)

    # -------------------------------------------------------------------------
    # 5. Idempotency Cache
    # -------------------------------------------------------------------------
    def get_idempotency_record(self, key: str, user_id: Optional[Any], endpoint: str) -> Optional[Dict[str, Any]]:
        redis_key = f"idempotency:{key}:{str(user_id or 'anon')}:{endpoint}"
        val = self._backend.get(redis_key)
        if val:
            return json.loads(val)
        return None

    def set_idempotency_record(self, key: str, user_id: Optional[Any], endpoint: str, status_code: int, response_body: Dict[str, Any], ttl_seconds: int = 86400) -> None:
        redis_key = f"idempotency:{key}:{str(user_id or 'anon')}:{endpoint}"
        data = {
            "status_code": status_code,
            "response_body": response_body,
            "cached_at": time.time()
        }
        self._backend.set(redis_key, json.dumps(data), ex=ttl_seconds)

    # -------------------------------------------------------------------------
    # 6. Distributed Locks
    # -------------------------------------------------------------------------
    def acquire_lock(self, lock_name: str, ttl_seconds: int = 10, token: Optional[str] = None) -> Optional[str]:
        """
        Acquires a distributed lock using Redis SETNX + EX.
        Returns unique token string if acquired, None if locked by another worker.
        """
        lock_token = token or str(uuid.uuid4())
        key = f"lock:{lock_name}"
        success = self._backend.set_if_not_exists(key, lock_token, ex=ttl_seconds)
        if success:
            logger.debug(f"Distributed lock acquired: {key} (token={lock_token})")
            return lock_token
        return None

    def release_lock(self, lock_name: str, token: str) -> bool:
        """
        Releases a distributed lock safely if and only if the token matches.
        """
        key = f"lock:{lock_name}"
        released = self._backend.delete_if_match(key, token)
        if released:
            logger.debug(f"Distributed lock released: {key}")
        return released

    @asynccontextmanager
    async def redis_lock(self, lock_name: str, ttl_seconds: int = 10):
        """Async context manager for automatic distributed lock acquisition and release."""
        token = self.acquire_lock(lock_name, ttl_seconds=ttl_seconds)
        if not token:
            raise RuntimeError(f"Could not acquire distributed lock for '{lock_name}'")
        try:
            yield token
        finally:
            self.release_lock(lock_name, token)

    # -------------------------------------------------------------------------
    # 7. Job Coordination
    # -------------------------------------------------------------------------
    def acquire_job_leadership(self, job_name: str, worker_id: str, lease_seconds: int = 30) -> bool:
        """
        Coordinates scheduled background jobs across multiple worker replicas.
        Elects a single leader worker for the specified job window.
        """
        key = f"job_coord:{job_name}:leader"
        return self._backend.set_if_not_exists(key, worker_id, ex=lease_seconds)

    def heartbeat_job_leadership(self, job_name: str, worker_id: str, lease_seconds: int = 30) -> bool:
        """
        Extends the leader worker's lease during long-running batch jobs.
        """
        key = f"job_coord:{job_name}:leader"
        current_leader = self._backend.get(key)
        if current_leader == worker_id:
            self._backend.set(key, worker_id, ex=lease_seconds)
            return True
        return False

    def release_job_leadership(self, job_name: str, worker_id: str) -> bool:
        key = f"job_coord:{job_name}:leader"
        return self._backend.delete_if_match(key, worker_id)

    # -------------------------------------------------------------------------

    # Dedicated Distributed Job Locks (Mandatory TTL Expiry)
    # -------------------------------------------------------------------------
    @asynccontextmanager
    async def lock_guardian_insight_generation(self, subject_id: Any, ttl_seconds: int = 60):
        """
        Distributed lock ensuring only one worker evaluates guardian trends
        and generates insights for a care subject at a time.
        """
        lock_name = f"guardian_insight_generation:{str(subject_id)}"
        async with self.redis_lock(lock_name, ttl_seconds=ttl_seconds) as token:
            yield token

    @asynccontextmanager
    async def lock_appointment_reminder(self, appointment_id: Any, ttl_seconds: int = 300):
        """
        Distributed lock preventing duplicate appointment reminders from being
        dispatched concurrently or redundantly across multiple worker replicas.
        """
        lock_name = f"appointment_reminder:{str(appointment_id)}"
        async with self.redis_lock(lock_name, ttl_seconds=ttl_seconds) as token:
            yield token

    @asynccontextmanager
    async def lock_outbox_worker_leader(self, ttl_seconds: int = 30):
        """
        Distributed lock for Outbox Worker leader election and message publishing coordination.
        """
        lock_name = "outbox_worker_leader"
        async with self.redis_lock(lock_name, ttl_seconds=ttl_seconds) as token:
            yield token

    @asynccontextmanager
    async def lock_document_processing(self, document_id: Any, ttl_seconds: int = 120):
        """
        Distributed lock ensuring document OCR extraction and LLM ingestion
        is executed by exactly one worker per document.
        """
        lock_name = f"document_processing:{str(document_id)}"
        async with self.redis_lock(lock_name, ttl_seconds=ttl_seconds) as token:
            yield token


# Global Redis Cache Service Instance
redis_service = RedisCacheService()

