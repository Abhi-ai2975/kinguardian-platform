import time
from enum import Enum
from typing import Dict, List, Tuple, Optional
from fastapi import Request, HTTPException, status
from pydantic import BaseModel

from app.core.logging import get_logger
from app.core.errors import RateLimitedError

logger = get_logger(__name__)


class RateLimitTier(str, Enum):
    AUTH_HANDOFF = "auth_handoff"
    AI_ENDPOINTS = "ai_endpoints"
    DOCUMENT_OPERATIONS = "document_operations"
    NOTIFICATION_ENDPOINTS = "notification_endpoints"
    FAMILY_MESSAGING = "family_messaging"
    PUBLIC_HEALTH = "public_health"
    GENERAL = "general"


class RateLimitPolicy(BaseModel):
    tier: RateLimitTier
    requests_per_minute: int
    window_seconds: int = 60
    description: str


# Aligned with EMR Platform Rate Limiting Standards
RATE_LIMIT_POLICIES: Dict[RateLimitTier, RateLimitPolicy] = {
    RateLimitTier.AUTH_HANDOFF: RateLimitPolicy(
        tier=RateLimitTier.AUTH_HANDOFF,
        requests_per_minute=20,
        description="Protects authentication handoff, IAM token exchange, and session establishment."
    ),
    RateLimitTier.AI_ENDPOINTS: RateLimitPolicy(
        tier=RateLimitTier.AI_ENDPOINTS,
        requests_per_minute=30,
        description="Protects LLM inference, Agent tool execution, and prompt synthesis pipelines."
    ),
    RateLimitTier.DOCUMENT_OPERATIONS: RateLimitPolicy(
        tier=RateLimitTier.DOCUMENT_OPERATIONS,
        requests_per_minute=30,
        description="Protects FileNest ingestion, OCR extractions, and document uploads."
    ),
    RateLimitTier.NOTIFICATION_ENDPOINTS: RateLimitPolicy(
        tier=RateLimitTier.NOTIFICATION_ENDPOINTS,
        requests_per_minute=60,
        description="Protects multi-channel push, SMS, and alert dispatch from flooding."
    ),
    RateLimitTier.FAMILY_MESSAGING: RateLimitPolicy(
        tier=RateLimitTier.FAMILY_MESSAGING,
        requests_per_minute=60,
        description="Protects family care circle chat, timeline messages, and voice notes."
    ),
    RateLimitTier.PUBLIC_HEALTH: RateLimitPolicy(
        tier=RateLimitTier.PUBLIC_HEALTH,
        requests_per_minute=120,
        description="Protects public health summaries, liveness probes, and readiness metrics."
    ),
    RateLimitTier.GENERAL: RateLimitPolicy(
        tier=RateLimitTier.GENERAL,
        requests_per_minute=120,
        description="Default general API rate limit tier."
    ),
}


class TieredRateLimiter:
    """
    Tier-based Sliding Window Rate Limiter.
    Aligned with EMR orchestration platform policies, providing granular protection across:
    1. Authentication Handoff (20 req/min)
    2. AI Endpoints (30 req/min)
    3. Document Operations (30 req/min)
    4. Notification Endpoints (60 req/min)
    5. Family Messaging (60 req/min)
    6. Public Health Endpoints (120 req/min)
    """

    def __init__(self):
        # key format: "{tier}:{client_identifier}" -> list of timestamps
        self._history: Dict[str, List[float]] = {}

    def is_allowed(
        self,
        tier: RateLimitTier,
        client_identifier: str
    ) -> Tuple[bool, int, int]:
        """
        Evaluates rate limit for a specific tier and client.
        Returns: (is_allowed, retry_after_seconds, remaining_requests)
        """
        policy = RATE_LIMIT_POLICIES[tier]
        now = time.time()
        window_start = now - policy.window_seconds
        key = f"{tier.value}:{client_identifier}"

        if key not in self._history:
            self._history[key] = []

        # Filter timestamps outside the sliding window
        valid_requests = [ts for ts in self._history[key] if ts > window_start]
        self._history[key] = valid_requests

        if len(valid_requests) >= policy.requests_per_minute:
            oldest_in_window = valid_requests[0]
            retry_after = max(1, int(policy.window_seconds - (now - oldest_in_window)))
            return False, retry_after, 0

        self._history[key].append(now)
        remaining = max(0, policy.requests_per_minute - len(self._history[key]))
        return True, 0, remaining

    def reset(self):
        """Clears in-memory rate limit histories (useful for test fixtures)."""
        self._history.clear()


class InMemoryRateLimiter:
    """
    Sliding-window In-Memory Rate Limiter (General Single-Tier).
    """
    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
        self._history: Dict[str, List[float]] = {}

    def is_allowed(self, client_identifier: str) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - 60.0

        if client_identifier not in self._history:
            self._history[client_identifier] = []

        valid_requests = [ts for ts in self._history[client_identifier] if ts > window_start]
        self._history[client_identifier] = valid_requests

        if len(valid_requests) >= self.requests_per_minute:
            oldest_in_window = valid_requests[0]
            retry_after = max(1, int(60.0 - (now - oldest_in_window)))
            return False, retry_after

        self._history[client_identifier].append(now)
        return True, 0

    def reset(self):
        self._history.clear()


# Global Platform Rate Limiter Instances
platform_rate_limiter = TieredRateLimiter()
global_rate_limiter = InMemoryRateLimiter(requests_per_minute=120)



def get_rate_limiter_dependency(tier: RateLimitTier):
    """
    Returns a FastAPI dependency enforcing the specified rate limit tier.
    """
    async def _dependency(request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        # If authenticated, include user identifier for per-account quotas
        user_header = request.headers.get("X-User-ID", "")
        identifier = f"{client_ip}:{user_header}" if user_header else client_ip

        allowed, retry_after, remaining = platform_rate_limiter.is_allowed(tier, identifier)

        if not allowed:
            logger.warning(
                f"Rate limit exceeded on tier '{tier.value}' for '{identifier}'. Retry after {retry_after}s."
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {tier.value}. Please retry in {retry_after} seconds.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(RATE_LIMIT_POLICIES[tier].requests_per_minute),
                    "X-RateLimit-Remaining": "0"
                }
            )

    return _dependency


# Standard dependency shortcuts for routes
enforce_auth_rate_limit = get_rate_limiter_dependency(RateLimitTier.AUTH_HANDOFF)
enforce_ai_rate_limit = get_rate_limiter_dependency(RateLimitTier.AI_ENDPOINTS)
enforce_document_rate_limit = get_rate_limiter_dependency(RateLimitTier.DOCUMENT_OPERATIONS)
enforce_notification_rate_limit = get_rate_limiter_dependency(RateLimitTier.NOTIFICATION_ENDPOINTS)
enforce_messaging_rate_limit = get_rate_limiter_dependency(RateLimitTier.FAMILY_MESSAGING)
enforce_public_health_rate_limit = get_rate_limiter_dependency(RateLimitTier.PUBLIC_HEALTH)
enforce_rate_limit = get_rate_limiter_dependency(RateLimitTier.GENERAL)
