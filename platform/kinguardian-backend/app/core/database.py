"""
================================================================================
KinGuardian Core Relational Database & Connection Management Module
================================================================================
Architecture & Design Principles:
---------------------------------
1. Asynchronous I/O via Asyncpg:
   All database interactions utilize SQLAlchemy 2.0+ `asyncpg` async drivers,
   ensuring high-throughput non-blocking request handling across concurrent users.

2. Connection Pooling & Resource Lifecycle:
   Production pools are tuned with pre-ping validation (`DB_POOL_PRE_PING`),
   maximum connection recycling (`DB_POOL_RECYCLE`), and bounded overflow limits
   to prevent database connection starvation during peak synchronization cycles.

3. Transaction Isolation & Anti-Corruption:
   - Database operations run in isolated transactional blocks.
   - `expire_on_commit=False` prevents lazy loading errors after session commits.
   - Session injection uses FastAPI dependencies with deterministic cleanup.

4. Performance Profiling & Slow Query Detection:
   In development environments, cursor-level performance hooks measure query
   latency in milliseconds to proactively detect N+1 regressions and missing indexes.
================================================================================
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import time
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """
    SQLAlchemy Declarative Base class for all KinGuardian ORM domain models.
    All entity models inherit from this base class.
    """
    pass


def attach_development_query_listeners(engine):
    """
    Attaches query performance timing and logging listeners in development environments
    to detect slow queries and prevent N+1 query patterns.

    Args:
        engine: AsyncEngine instance whose underlying sync_engine receives the cursor listeners.
    """
    sync_engine = engine.sync_engine

    @event.listens_for(sync_engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.perf_counter()

    @event.listens_for(sync_engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total_time_ms = (time.perf_counter() - getattr(context, "_query_start_time", time.perf_counter())) * 1000
        if total_time_ms > 50:
            logger.warning(
                f"[SLOW QUERY ALERT] Duration: {total_time_ms:.2f}ms | SQL: {statement[:200]}..."
            )
        else:
            logger.debug(
                f"[SQL QUERY] Duration: {total_time_ms:.2f}ms | SQL: {statement[:150]}..."
            )


class Database:
    """
    Encapsulates the async database engine and session factory lifecycle.
    Manages connection initialization, pooling options, and clean graceful shutdowns.
    """

    def __init__(self, db_url: str):
        from typing import Any
        engine_kwargs: dict[str, Any] = {
            "echo": settings.DB_ECHO,
            "pool_pre_ping": settings.DB_POOL_PRE_PING,
        }


        # Connection pool tuning for PostgreSQL / asyncpg
        if not db_url.startswith("sqlite"):
            engine_kwargs.update({
                "pool_size": settings.DB_POOL_SIZE,
                "max_overflow": settings.DB_MAX_OVERFLOW,
                "pool_timeout": settings.DB_POOL_TIMEOUT,
                "pool_recycle": settings.DB_POOL_RECYCLE,
            })

        self.engine = create_async_engine(db_url, **engine_kwargs)

        if settings.ENVIRONMENT == "development" and settings.SQL_QUERY_LOGGING:
            try:
                attach_development_query_listeners(self.engine)
            except Exception as e:
                logger.debug(f"Could not attach query logging listeners: {e}")

        self.session_maker = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )


    async def disconnect(self) -> None:
        await self.engine.dispose()

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        session: AsyncSession = self.session_maker()
        try:
            yield session
        except Exception:
            logger.exception("Session rollback because of exception")
            await session.rollback()
            raise
        finally:
            await session.close()


db = Database(settings.DATABASE_URL)
AsyncSessionLocal = db.session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with db.session() as session:
        yield session

get_db_session = get_db


