# KinGuardian Backend

KinGuardian is the platform backend for the two-sided cross-border parent health application.


## Prerequisites
- Python 3.12+
- PostgreSQL
- Redis

## Running Locally
1. Sync python environment:
   ```bash
   uv sync
   ```
2. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
3. Run Alembic migrations:
   ```bash
   uv run alembic upgrade head
   ```
4. Start development server:
   ```bash
   uv run fastapi dev app/main.py
   ```
