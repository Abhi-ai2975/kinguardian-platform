"""
scripts.seed_dev — Bootstrap a local development environment.

Creates a test project in the FileNest database. Run once after `just migrate`.

API key creation:
    API keys are managed by the IAM (BetterAuth apiKey plugin). Create one via
    the IAM console or API after running this script:

        POST http://localhost:3000/api/auth/api-key/create
        Authorization: Bearer <your-iam-session-token>
        Content-Type: application/json

        {
          "name": "Dev Key",
          "metadata": {
            "organizationId": "<org_id printed below>",
            "projectId":      "<project_id printed below>",
            "scopes": [
              "files:upload", "files:download", "files:read",
              "files:delete", "files:update_metadata",
              "projects:read", "projects:update",
              "audit:read", "compliance:manage"
            ]
          }
        }

    The response includes the raw key (fn_live_...). Use it in curl:

        curl -H "Authorization: Bearer fn_live_<key>" http://localhost:8000/v1/files

Usage:
    cd backend && uv run python scripts/seed_dev.py
"""
import asyncio
import os
import secrets
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # type: ignore[import]
load_dotenv()

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


async def seed() -> None:
    db_url = os.environ.get(
        "DATABASE_PRIMARY_URL",
        "postgresql+asyncpg://filenest:filenest@localhost:5434/filenest",
    )

    engine = create_async_engine(db_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        org_id = "org_dev_" + secrets.token_hex(4)
        project_id = str(uuid.uuid4())
        now = datetime.now(UTC)

        await session.execute(
            __import__("sqlalchemy").text(
                """
                INSERT INTO projects (id, organization_id, name, slug, storage_mode, is_active, created_at, updated_at)
                VALUES (:id, :org_id, :name, :slug, 'managed', true, :now, :now)
                """
            ),
            {"id": project_id, "org_id": org_id, "name": "Dev Project", "slug": "dev-project", "now": now},
        )
        await session.commit()

    await engine.dispose()

    print("\n" + "=" * 60)
    print("  FileNest dev seed complete")
    print("=" * 60)
    print(f"  Organization ID : {org_id}")
    print(f"  Project ID      : {project_id}")
    print()
    print("  Next step: create an API key via the IAM.")
    print("  See the docstring in this file for the curl command.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(seed())
