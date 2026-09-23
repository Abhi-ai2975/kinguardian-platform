import asyncio
import os
from app.db import engine, Base
import app.models  # Import all models to ensure they're registered with Base

async def init_database():
    """Initialize the database with all tables."""
    # Force SQLite for development
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./kinguardian.db"
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_database())