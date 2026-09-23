import pytest
import uuid
import time
from app.core.redis import RedisCacheService, EphemeralMemoryBackend


@pytest.fixture
def redis_cache():
    backend = EphemeralMemoryBackend()
    return RedisCacheService(backend=backend)


@pytest.mark.asyncio
async def test_guardian_insight_generation_distributed_lock(redis_cache):
    """
    Verifies distributed locking on guardian insight generation per care subject.
    """
    subject_id = uuid.uuid4()

    async with redis_cache.lock_guardian_insight_generation(subject_id, ttl_seconds=60) as token:
        assert token is not None

        # Concurrent worker attempting same subject insight generation is blocked
        with pytest.raises(RuntimeError, match="Could not acquire distributed lock"):
            async with redis_cache.lock_guardian_insight_generation(subject_id, ttl_seconds=60):
                pass

    # Once released, next worker can acquire
    async with redis_cache.lock_guardian_insight_generation(subject_id, ttl_seconds=60) as next_token:
        assert next_token is not None


@pytest.mark.asyncio
async def test_duplicate_appointment_reminder_distributed_lock(redis_cache):
    """
    Verifies distributed locking to prevent duplicate appointment reminder dispatch.
    """
    appointment_id = uuid.uuid4()

    async with redis_cache.lock_appointment_reminder(appointment_id, ttl_seconds=300) as token:
        assert token is not None

        # Concurrent replica cannot dispatch reminder for same appointment
        with pytest.raises(RuntimeError, match="Could not acquire distributed lock"):
            async with redis_cache.lock_appointment_reminder(appointment_id, ttl_seconds=300):
                pass


@pytest.mark.asyncio
async def test_outbox_worker_leader_coordination_distributed_lock(redis_cache):
    """
    Verifies distributed locking for outbox worker leader election.
    """
    async with redis_cache.lock_outbox_worker_leader(ttl_seconds=30) as token:
        assert token is not None

        # Another replica cannot become outbox leader concurrently
        with pytest.raises(RuntimeError, match="Could not acquire distributed lock"):
            async with redis_cache.lock_outbox_worker_leader(ttl_seconds=30):
                pass


@pytest.mark.asyncio
async def test_document_processing_distributed_lock(redis_cache):
    """
    Verifies distributed locking on document OCR and extraction.
    """
    document_id = uuid.uuid4()

    async with redis_cache.lock_document_processing(document_id, ttl_seconds=120) as token:
        assert token is not None

        # Another worker cannot process same document simultaneously
        with pytest.raises(RuntimeError, match="Could not acquire distributed lock"):
            async with redis_cache.lock_document_processing(document_id, ttl_seconds=120):
                pass


def test_lock_expiry_allows_recovery_after_worker_crash(redis_cache):
    """
    Verifies that lock TTL expiry prevents deadlocks if a worker crashes without releasing.
    """
    lock_name = "guardian_insight_generation:worker_crash_test"

    # Worker 1 acquires lock with short 1-second TTL
    token_1 = redis_cache.acquire_lock(lock_name, ttl_seconds=1)
    assert token_1 is not None

    # Immediate second attempt fails
    assert redis_cache.acquire_lock(lock_name, ttl_seconds=1) is None

    # Simulate TTL expiration (1.1 seconds pass)
    time.sleep(1.1)

    # Worker 2 can now acquire the lock because Worker 1's lock expired automatically
    token_2 = redis_cache.acquire_lock(lock_name, ttl_seconds=10)
    assert token_2 is not None
    redis_cache.release_lock(lock_name, token_2)
