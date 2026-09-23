"""
app.core.database — Async SQLAlchemy engine, session factories, and Base.

Provides:
  - Base          — declarative base shared by all ORM models
  - Database      — singleton class wrapping the async engine (used by the DI container)
  - get_db        — primary session dependency (writes + reads)
  - get_read_db   — replica session dependency (read-only)

Both dependencies yield sessions that auto-commit on clean exit and roll back on
exception. Repository code must call session.flush() (not session.commit())
to get DB-assigned IDs; the service coordinates the final commit.

Usage:
    from app.core.database import get_db, Base
    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession
"""
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy ORM models."""


class Database:
    """
    Wraps the async SQLAlchemy engine and exposes a session context-manager.

    Used as a Singleton in the DI CoreContainer so the engine is created
    once and shared across every request.

    Args:
        primary_url:  Async DSN for the primary (read-write) database.
        pool_size:    Number of connections to keep in the pool.
        max_overflow: Extra connections allowed beyond pool_size.
        echo:         Log all SQL statements (dev only).
    """

    def __init__(
        self,
        primary_url: str,
        pool_size: int = 10,
        max_overflow: int = 20,
        echo: bool = False,
    ) -> None:
        self._engine = create_async_engine(
            primary_url,
            pool_size=pool_size,
            max_overflow=max_overflow,
            echo=echo,
        )
        self._session_maker = async_sessionmaker(self._engine, expire_on_commit=False)

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield a managed AsyncSession that rolls back on exception and closes on exit."""
        async with self._session_maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    async def dispose(self) -> None:
        """Release all pooled connections. Call on application shutdown."""
        await self._engine.dispose()


# ---------------------------------------------------------------------------
# Module-level singletons used by get_db / get_read_db FastAPI dependencies.
# These are kept separate from the DI Database singleton so both paths work.
# ---------------------------------------------------------------------------
_primary_engine = create_async_engine(
    settings.database_primary_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=False,  # structlog handles all meaningful logging; SQLAlchemy echo is too noisy
)

_replica_url = settings.database_replica_url or settings.database_primary_url
_replica_engine = create_async_engine(
    _replica_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(_primary_engine, expire_on_commit=False)
AsyncReadSessionLocal = async_sessionmaker(_replica_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a primary-database session. Commits on clean exit, rolls back on exception."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_read_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a read-replica session. Use for list/search endpoints, never for writes."""
    async with AsyncReadSessionLocal() as session:
        yield session
