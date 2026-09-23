import pytest
import uuid
import time
from app.core.redis import RedisCacheService, EphemeralMemoryBackend


@pytest.fixture
def redis_cache():
    backend = EphemeralMemoryBackend()
    return RedisCacheService(backend=backend)


def test_redis_family_summary_cache(redis_cache):
    """
    1. Family summary cache: verifies setting, getting, and invalidating family summaries.
    """
    fam_id = uuid.uuid4()
    summary = {
        "family_id": str(fam_id),
        "name": "Sharma Care Circle",
        "active_members_count": 3,
        "unread_notifications": 2
    }

    # Cache miss
    assert redis_cache.get_family_summary(fam_id) is None

    # Cache set & hit
    redis_cache.set_family_summary(fam_id, summary, ttl_seconds=300)
    cached = redis_cache.get_family_summary(fam_id)
    assert cached is not None
    assert cached["name"] == "Sharma Care Circle"
    assert cached["active_members_count"] == 3

    # Invalidate
    redis_cache.invalidate_family_summary(fam_id)
    assert redis_cache.get_family_summary(fam_id) is None


def test_redis_authorization_lookups(redis_cache):
    """
    2. Authorization lookups: verifies fast permission caching and invalidation.
    """
    user_id = uuid.uuid4()
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # Cache miss
    assert redis_cache.get_auth_lookup(user_id, family_id, subject_id, "view_vitals") is None

    # Cache allow
    redis_cache.set_auth_lookup(user_id, family_id, subject_id, "view_vitals", True, ttl_seconds=180)
    assert redis_cache.get_auth_lookup(user_id, family_id, subject_id, "view_vitals") is True

    # Cache deny
    redis_cache.set_auth_lookup(user_id, family_id, subject_id, "edit_medications", False, ttl_seconds=180)
    assert redis_cache.get_auth_lookup(user_id, family_id, subject_id, "edit_medications") is False


def test_redis_rate_limiting(redis_cache):
    """
    3. Rate limiting: atomic INCR with threshold enforcement.
    """
    client_id = "192.168.1.100"
    limit = 3

    # 1st request -> Allowed (count 1)
    allowed1, count1 = redis_cache.check_rate_limit("ai_tier", client_id, limit=limit, window_seconds=60)
    assert allowed1 is True
    assert count1 == 1

    # 2nd request -> Allowed (count 2)
    allowed2, count2 = redis_cache.check_rate_limit("ai_tier", client_id, limit=limit, window_seconds=60)
    assert allowed2 is True
    assert count2 == 2

    # 3rd request -> Allowed (count 3)
    allowed3, count3 = redis_cache.check_rate_limit("ai_tier", client_id, limit=limit, window_seconds=60)
    assert allowed3 is True
    assert count3 == 3

    # 4th request -> Blocked (count 4 > limit 3)
    allowed4, count4 = redis_cache.check_rate_limit("ai_tier", client_id, limit=limit, window_seconds=60)
    assert allowed4 is False
    assert count4 == 4


def test_redis_short_lived_ai_context_caching(redis_cache):
    """
    4. Short-lived AI context caching: ephemeral conversation history and prompt scratchpad.
    """
    session_id = uuid.uuid4()
    context_data = {
        "session_id": str(session_id),
        "recent_tokens": ["BP checked", "Normal", "120/80"],
        "active_intent": "medication_inquiry"
    }

    # Set & Get
    redis_cache.set_ai_context(session_id, context_data, ttl_seconds=900)
    retrieved = redis_cache.get_ai_context(session_id)
    assert retrieved is not None
    assert retrieved["active_intent"] == "medication_inquiry"

    # Invalidate
    redis_cache.invalidate_ai_context(session_id)
    assert redis_cache.get_ai_context(session_id) is None


def test_redis_idempotency_cache(redis_cache):
    """
    5. Idempotency fast cache: rapid replay lookup before DB access.
    """
    key = "idem_key_998811"
    user_id = uuid.uuid4()
    endpoint = "/api/v1/care/tasks"
    response_body = {"task_id": "t-123", "status": "created"}

    # Miss
    assert redis_cache.get_idempotency_record(key, user_id, endpoint) is None

    # Set & Hit
    redis_cache.set_idempotency_record(key, user_id, endpoint, status_code=201, response_body=response_body)
    record = redis_cache.get_idempotency_record(key, user_id, endpoint)
    assert record is not None
    assert record["status_code"] == 201
    assert record["response_body"]["task_id"] == "t-123"


def test_redis_distributed_locks(redis_cache):
    """
    6. Distributed locks: Mutex exclusion, safe release with matching token.
    """
    lock_name = "process_daily_medications"

    # Worker A acquires lock
    token_a = redis_cache.acquire_lock(lock_name, ttl_seconds=10)
    assert token_a is not None

    # Worker B attempts to acquire same lock -> FAILS
    token_b = redis_cache.acquire_lock(lock_name, ttl_seconds=10)
    assert token_b is None

    # Worker B tries to release with invalid token -> FAILS
    assert redis_cache.release_lock(lock_name, token="wrong_token") is False

    # Worker A releases lock with valid token -> SUCCEEDS
    assert redis_cache.release_lock(lock_name, token_a) is True

    # Now Worker B can acquire lock
    token_b2 = redis_cache.acquire_lock(lock_name, ttl_seconds=10)
    assert token_b2 is not None


@pytest.mark.asyncio
async def test_redis_async_lock_context_manager(redis_cache):
    """
    6b. Distributed lock async context manager.
    """
    lock_name = "ocr_batch_job"

    async with redis_cache.redis_lock(lock_name, ttl_seconds=5) as token:
        assert token is not None
        # Verify another worker is blocked inside the context
        assert redis_cache.acquire_lock(lock_name) is None

    # Lock is automatically released after context exit
    token_next = redis_cache.acquire_lock(lock_name)
    assert token_next is not None
    redis_cache.release_lock(lock_name, token_next)


def test_redis_job_coordination(redis_cache):
    """
    7. Job coordination: worker leader election, heartbeat lease renewal, and handover.
    """
    job = "guardian_trend_evaluation"
    worker_1 = "worker_node_alpha"
    worker_2 = "worker_node_beta"

    # Worker 1 becomes leader
    assert redis_cache.acquire_job_leadership(job, worker_1, lease_seconds=30) is True

    # Worker 2 cannot become leader while Worker 1 holds lease
    assert redis_cache.acquire_job_leadership(job, worker_2, lease_seconds=30) is False

    # Worker 1 extends heartbeat
    assert redis_cache.heartbeat_job_leadership(job, worker_1, lease_seconds=30) is True

    # Worker 2 heartbeat fails because it's not the leader
    assert redis_cache.heartbeat_job_leadership(job, worker_2, lease_seconds=30) is False

    # Worker 1 releases leadership
    assert redis_cache.release_job_leadership(job, worker_1) is True

    # Worker 2 can now become leader
    assert redis_cache.acquire_job_leadership(job, worker_2, lease_seconds=30) is True
