"""Shared async base class for all terminology loaders.

Uses asyncpg directly (not SQLAlchemy) for bulk-insert performance.
Batches of BATCH_SIZE rows, idempotent via ON CONFLICT DO NOTHING.
"""
import time
from typing import Sequence

import asyncpg


BATCH_SIZE = 2000


class BaseLoader:
    source_name: str = "unknown"

    def __init__(self, db_url: str):
        # SQLAlchemy uses postgresql+asyncpg:// — asyncpg needs plain postgresql://
        self.db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        self._conn: asyncpg.Connection | None = None

    async def __aenter__(self) -> "BaseLoader":
        self._log("Connecting to database...")
        self._conn = await asyncpg.connect(self.db_url)
        return self

    async def __aexit__(self, *_) -> None:
        if self._conn:
            await self._conn.close()

    @property
    def conn(self) -> asyncpg.Connection:
        assert self._conn is not None, "Not connected — use async with loader"
        return self._conn

    def _log(self, msg: str) -> None:
        print(f"[{self.source_name.upper()}] {msg}")

    async def upsert_code_system(
        self,
        canonical_url: str,
        name: str,
        title: str | None = None,
        version: str | None = None,
        publisher: str | None = None,
        content_mode: str | None = None,
    ) -> int:
        row = await self.conn.fetchrow(
            """
            INSERT INTO terminology_code_system
                (canonical_url, name, title, version, publisher, content_mode)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (canonical_url) DO UPDATE SET
                name         = EXCLUDED.name,
                title        = COALESCE(EXCLUDED.title, terminology_code_system.title),
                version      = COALESCE(EXCLUDED.version, terminology_code_system.version),
                publisher    = COALESCE(EXCLUDED.publisher, terminology_code_system.publisher),
                content_mode = COALESCE(EXCLUDED.content_mode, terminology_code_system.content_mode),
                updated_at   = NOW()
            RETURNING id
            """,
            canonical_url, name, title, version, publisher, content_mode,
        )
        return row["id"]

    async def bulk_insert_concepts(
        self,
        records: Sequence[tuple],  # (code_system_id, code, display, definition)
        total_hint: int | None = None,
    ) -> int:
        """Insert concepts in batches. Returns total inserted count."""
        inserted = 0
        t0 = time.monotonic()

        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i : i + BATCH_SIZE]
            expanded = [
                (r[0], r[1], r[2], r[3], f"{r[2] or ''} {r[3] or ''}".strip())
                for r in batch
            ]
            await self.conn.executemany(
                """
                INSERT INTO terminology_concept
                    (code_system_id, code, display, definition, search_vector)
                VALUES ($1, $2, $3, $4, to_tsvector('english', $5))
                ON CONFLICT (code_system_id, code) WHERE org_id IS NULL DO NOTHING
                """,
                expanded,
            )
            inserted += len(batch)
            done = i + len(batch)
            if total_hint:
                pct = done / total_hint * 100
                self._log(f"  {done:,} / {total_hint:,} ({pct:.0f}%)")
            else:
                self._log(f"  {done:,} concepts processed")

        elapsed = time.monotonic() - t0
        self._log(f"Concepts done — {inserted:,} rows in {elapsed:.1f}s")
        return inserted

    async def bulk_insert_synonyms(
        self, records: Sequence[tuple]  # (concept_db_id, synonym)
    ) -> int:
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i : i + BATCH_SIZE]
            await self.conn.executemany(
                "INSERT INTO terminology_concept_synonym (concept_id, synonym) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                batch,
            )
        return len(records)

    async def bulk_insert_relationships(
        self, records: Sequence[tuple]  # (parent_concept_db_id, child_concept_db_id, relationship_type)
    ) -> int:
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i : i + BATCH_SIZE]
            await self.conn.executemany(
                """
                INSERT INTO terminology_relationship
                    (parent_concept_id, child_concept_id, relationship_type)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
                """,
                batch,
            )
        return len(records)

    async def fetch_concept_id_map(self, code_system_id: int) -> dict[str, int]:
        """Returns {code: db_id} for all concepts under a code system."""
        rows = await self.conn.fetch(
            "SELECT code, id FROM terminology_concept WHERE code_system_id = $1",
            code_system_id,
        )
        return {r["code"]: r["id"] for r in rows}
