"""
Module-level Redis async client singleton used for rate limiting.

A single AsyncClient instance is shared across the entire process lifetime to avoid
the overhead of creating a new connection (or connection pool) per request. The client
is initialised at import time using the URL from settings; actual connection to Redis
is lazy — no network call happens until the first command is issued.

At startup (app.main lifespan), the app pings Redis to confirm connectivity and either
stores the client on app.state.redis (used by RateLimitMiddleware) or sets it to None,
signalling that rate limiting should fall back to the in-process local store.

At shutdown (app.main lifespan teardown), redis_client.aclose() is called explicitly
to release the connection pool gracefully before the process exits.
"""

import redis.asyncio as redis
from redis.asyncio.client import Redis

from app.config import settings

# Shared async Redis client for the lifetime of the process.
# - encoding="utf-8": all byte strings returned by Redis are decoded to str automatically.
# - decode_responses=True: complements encoding; ensures all Redis values are str not bytes,
#   which simplifies sorted-set operations in RateLimitMiddleware (keys/scores are strings).
redis_client: Redis = redis.from_url(
    settings.REDIS_URL, encoding="utf-8", decode_responses=True
)
