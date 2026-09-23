import redis.asyncio as redis
from redis.asyncio.client import Redis

from app.core.config import settings

redis_client: Redis = redis.from_url(
    settings.REDIS_URL, encoding="utf-8", decode_responses=True
)


async def get_redis() -> Redis:
    return redis_client
