import json
import uuid
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

SESSION_KEY_PREFIX = "session:"


class SessionManager:
    """Redis-backed server-side session manager.

    Stores Keycloak tokens and user info in Redis, keyed by a random session ID.
    The client only ever sees the session ID (via a cookie).
    """

    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.ttl = settings.SESSION_TTL_SECONDS

    def _key(self, session_id: str) -> str:
        return f"{SESSION_KEY_PREFIX}{session_id}"

    async def create_session(
        self,
        user_info: dict[str, Any],
        tokens: dict[str, Any],
    ) -> str:
        """Create a new session and return the session ID.

        Args:
            user_info: Decoded user information from the access token.
            tokens: The full token response from Keycloak (access_token, refresh_token, etc.).

        Returns:
            The generated session ID (UUID4 string).
        """
        session_id = str(uuid.uuid4())
        session_data = {
            "user_info": user_info,
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
            "token_type": tokens.get("token_type", "Bearer"),
        }
        await self.redis.set(
            self._key(session_id),
            json.dumps(session_data),
            ex=self.ttl,
        )
        logger.info("Session created for user: %s", user_info.get("preferred_username", "unknown"))
        return session_id

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        """Retrieve session data by session ID.

        Returns None if the session doesn't exist or has expired.
        """
        raw = await self.redis.get(self._key(session_id))
        if raw is None:
            return None
        return json.loads(raw)

    async def update_session(
        self,
        session_id: str,
        user_info: dict[str, Any],
        tokens: dict[str, Any],
    ) -> bool:
        """Update an existing session with new tokens (e.g. after refresh).

        Returns True if the session was updated, False if it didn't exist.
        """
        key = self._key(session_id)
        if not await self.redis.exists(key):
            return False

        session_data = {
            "user_info": user_info,
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
            "token_type": tokens.get("token_type", "Bearer"),
        }
        await self.redis.set(key, json.dumps(session_data), ex=self.ttl)
        logger.info("Session refreshed for user: %s", user_info.get("preferred_username", "unknown"))
        return True

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session (logout).

        Returns True if a session was deleted, False if it didn't exist.
        """
        result = await self.redis.delete(self._key(session_id))
        if result:
            logger.info("Session deleted: %s", session_id[:8])
        return bool(result)
