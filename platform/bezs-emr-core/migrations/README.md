# Database Migrations

## Why Alembic?

This project uses **Alembic** as the database migration tool, paired with SQLAlchemy ORM models.

The problem it solves: when you change a SQLAlchemy model (add a column, rename a table, add a new table), the actual PostgreSQL database doesn't automatically update. Alembic bridges that gap — it compares your current ORM models against the live database schema and generates SQL `ALTER TABLE` / `CREATE TABLE` statements to bring them in sync. Every change is versioned and reversible.

---

## How it works

```
SQLAlchemy Models  →  Alembic autogenerate  →  Migration file (SQL diff)  →  Apply to DB
```

1. You change a model (e.g. add a column to `PatientModel`)
2. Run `just migrate-generate "add_foo_to_patient"` — Alembic connects to the DB, diffs model vs schema, writes a `.py` migration file under `migrations/versions/`
3. Run `just migrate` — Alembic executes that migration file against the DB
4. Alembic records which migrations have run in the `alembic_version` table so it never runs the same migration twice

---

## Commands

| Command | What it does |
|---|---|
| `just migrate` | Apply all pending migrations to the database (upgrade to latest) |
| `just migrate-down` | Roll back the most recent migration (one step back) |
| `just migrate-status` | Show which migration version the database is currently at |
| `just migrate-history` | List all migrations in order with their IDs and descriptions |
| `just migrate-generate "description"` | Autogenerate a new migration by diffing models vs DB — requires a running DB |
| `just migrate-stamp` | Mark the DB as up-to-date without running any SQL — used when the DB already matches the models (e.g. first deploy on a pre-existing DB) |

---

## Typical workflows

### First time setup (empty database)
```bash
docker compose up -d          # start PostgreSQL
just migrate                  # create all tables from scratch
```

### After changing a model
```bash
# 1. Edit the SQLAlchemy model
# 2. Generate the migration
just migrate-generate "add_notes_to_patient"
# 3. Review the generated file in migrations/versions/
# 4. Apply it
just migrate
```

### Rolling back a bad migration
```bash
just migrate-down             # reverts the last migration
# fix the model / migration file
just migrate                  # re-apply
```

---

## migrations/env.py

The `env.py` file is the Alembic runtime config. Key things it does:

- Imports all model modules so SQLAlchemy registers every table on `FHIRBase.metadata` — if a model isn't imported here, Alembic won't see it and won't generate migrations for it
- Reads `FHIR_DATABASE_URL` from app settings so migrations always hit the same DB as the running app
- Uses an **async engine** (asyncpg driver) to match the async SQLAlchemy setup in the rest of the app

When you add a new resource model, you must add its import to `env.py` or `just migrate-generate` will silently ignore it.

---

## migrations/versions/

Each file here is one migration — a snapshot of a schema change. Files are named `<revision_id>_<description>.py` and contain:

- `upgrade()` — SQL to apply the change
- `downgrade()` — SQL to reverse it
- `down_revision` — pointer to the previous migration (forms a chain)

Never edit a migration that has already been applied to a shared or production database. Generate a new one instead.
