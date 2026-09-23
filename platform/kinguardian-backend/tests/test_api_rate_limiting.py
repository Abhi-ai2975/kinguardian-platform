import pytest
from app.core.rate_limit import (
    RateLimitTier,
    RATE_LIMIT_POLICIES,
    TieredRateLimiter,
    platform_rate_limiter
)


def test_rate_limit_policy_alignment_with_platform():
    """
    Verifies that all 6 required protected tiers are registered with exact
    platform-aligned rate limits and descriptions.
    """
    # 1. Authentication Handoff (20 req/min)
    auth_pol = RATE_LIMIT_POLICIES[RateLimitTier.AUTH_HANDOFF]
    assert auth_pol.requests_per_minute == 20

    # 2. AI Endpoints (30 req/min)
    ai_pol = RATE_LIMIT_POLICIES[RateLimitTier.AI_ENDPOINTS]
    assert ai_pol.requests_per_minute == 30

    # 3. Document Operations (30 req/min)
    doc_pol = RATE_LIMIT_POLICIES[RateLimitTier.DOCUMENT_OPERATIONS]
    assert doc_pol.requests_per_minute == 30

    # 4. Notification Endpoints (60 req/min)
    notif_pol = RATE_LIMIT_POLICIES[RateLimitTier.NOTIFICATION_ENDPOINTS]
    assert notif_pol.requests_per_minute == 60

    # 5. Family Messaging (60 req/min)
    msg_pol = RATE_LIMIT_POLICIES[RateLimitTier.FAMILY_MESSAGING]
    assert msg_pol.requests_per_minute == 60

    # 6. Public Health Endpoints (120 req/min)
    health_pol = RATE_LIMIT_POLICIES[RateLimitTier.PUBLIC_HEALTH]
    assert health_pol.requests_per_minute == 120


def test_tiered_rate_limiter_allows_under_limit_and_blocks_over_limit():
    """
    Verifies that requests within limit pass, while requests exceeding the threshold are blocked.
    """
    limiter = TieredRateLimiter()
    client = "client_test_01"

    # Test Auth Handoff (20 req/min)
    for i in range(20):
        allowed, retry_after, remaining = limiter.is_allowed(RateLimitTier.AUTH_HANDOFF, client)
        assert allowed is True
        assert remaining == 20 - (i + 1)
        assert retry_after == 0

    # 21st request -> Exceeded -> Blocked
    allowed, retry_after, remaining = limiter.is_allowed(RateLimitTier.AUTH_HANDOFF, client)
    assert allowed is False
    assert retry_after > 0
    assert remaining == 0


def test_rate_limiter_tier_and_client_isolation():
    """
    Verifies that exhausting one tier (e.g. Auth) does not block the client from another tier (e.g. Messaging),
    and exhausting client A does not affect client B.
    """
    limiter = TieredRateLimiter()
    client_a = "client_a"
    client_b = "client_b"

    # Exhaust AI tier for Client A (30 requests)
    for _ in range(30):
        limiter.is_allowed(RateLimitTier.AI_ENDPOINTS, client_a)

    # 31st AI request for Client A is blocked
    allowed_a_ai, _, _ = limiter.is_allowed(RateLimitTier.AI_ENDPOINTS, client_a)
    assert allowed_a_ai is False

    # Client A can STILL send Messaging requests (different tier)
    allowed_a_msg, _, _ = limiter.is_allowed(RateLimitTier.FAMILY_MESSAGING, client_a)
    assert allowed_a_msg is True

    # Client B can STILL send AI requests (different client)
    allowed_b_ai, _, _ = limiter.is_allowed(RateLimitTier.AI_ENDPOINTS, client_b)
    assert allowed_b_ai is True
