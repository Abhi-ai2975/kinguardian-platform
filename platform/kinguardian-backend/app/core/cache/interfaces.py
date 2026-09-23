"""
Cache Abstraction Interface:
Defines protocols for cache operations, key generation, and event-driven invalidations.
"""

from typing import Protocol, Optional, Any, Dict, List, runtime_checkable
import uuid


@runtime_checkable
class ICacheService(Protocol):
    """Abstract interface for all cache operations."""

    def get(self, key: str) -> Optional[Any]:
        ...

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        ...

    def delete(self, key: str) -> bool:
        ...

    def delete_pattern(self, pattern: str) -> List[str]:
        ...

    def invalidate_keys(self, keys: List[str]) -> List[str]:
        ...
