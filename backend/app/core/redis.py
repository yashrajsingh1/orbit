"""
ORBIT - Redis Client for Real-time State
"""

from typing import Any, Optional
import json

import redis.asyncio as redis
from redis.asyncio import Redis

from app.core.config import settings


class RedisClient:
    """Async Redis client for session state and pub/sub."""

    def __init__(self):
        self._client: Optional[Redis] = None

    async def connect(self) -> None:
        """Initialize Redis connection."""
        self._client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()

    @property
    def client(self) -> Redis:
        """Get Redis client instance."""
        if not self._client:
            raise RuntimeError("Redis client not initialized")
        return self._client

    # Session State Operations
    async def set_session_state(
        self, user_id: str, key: str, value: Any, ttl: int = 3600
    ) -> None:
        """Store session state for a user."""
        full_key = f"session:{user_id}:{key}"
        await self.client.set(full_key, json.dumps(value), ex=ttl)

    async def get_session_state(self, user_id: str, key: str) -> Optional[Any]:
        """Retrieve session state for a user."""
        full_key = f"session:{user_id}:{key}"
        value = await self.client.get(full_key)
        return json.loads(value) if value else None

    async def delete_session_state(self, user_id: str, key: str) -> None:
        """Delete session state."""
        full_key = f"session:{user_id}:{key}"
        await self.client.delete(full_key)

    # Real-time Event Operations
    async def publish_event(self, channel: str, event: dict) -> None:
        """Publish event to a channel."""
        await self.client.publish(channel, json.dumps(event))

    async def subscribe(self, channel: str):
        """Subscribe to a channel for events."""
        pubsub = self.client.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

    # Cognitive Profile Cache
    async def cache_cognitive_profile(
        self, user_id: str, profile: dict, ttl: int = 1800
    ) -> None:
        """Cache cognitive profile for quick access."""
        key = f"cognitive_profile:{user_id}"
        await self.client.set(key, json.dumps(profile), ex=ttl)

    async def get_cached_cognitive_profile(self, user_id: str) -> Optional[dict]:
        """Get cached cognitive profile."""
        key = f"cognitive_profile:{user_id}"
        value = await self.client.get(key)
        return json.loads(value) if value else None

    # Current Intent State
    async def set_current_intent(
        self, user_id: str, intent: dict, ttl: int = 900
    ) -> None:
        """Store current active intent."""
        key = f"current_intent:{user_id}"
        await self.client.set(key, json.dumps(intent), ex=ttl)

    async def get_current_intent(self, user_id: str) -> Optional[dict]:
        """Get current active intent."""
        key = f"current_intent:{user_id}"
        value = await self.client.get(key)
        return json.loads(value) if value else None


# Global Redis client instance
redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """Dependency for getting Redis client."""
    return redis_client
