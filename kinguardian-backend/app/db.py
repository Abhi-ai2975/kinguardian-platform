from collections.abc import AsyncIterator
import datetime
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_functions(dbapi_connection, connection_record):
    raw_conn = getattr(dbapi_connection, "_connection", dbapi_connection)
    underlying = getattr(raw_conn, "_connection", raw_conn)
    if hasattr(underlying, "create_function"):
        underlying.create_function(
            "now", 0, lambda: datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
        )

class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session

