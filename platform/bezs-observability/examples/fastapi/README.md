# Example: Python FastAPI

A FastAPI "Notes API" that shows how to integrate the `watcher-sdk` Python
package across every layer of a FastAPI application.

## What this example covers

| Feature | Where | SDK |
|---------|-------|-----|
| Auto-trace all requests | `main.py` | `instrument(app, client)` |
| Auth audit (login/logout) | `routers/auth.py` | `client.audit()` |
| CRUD audit (notes) | `routers/notes.py` | `client.audit()` |
| Error logging | `main.py` exception handler | `client.log("error", ...)` |
| Background job metric | `routers/notes.py` | `client.metric()` |
| Explicit child span trace | `routers/notes.py` | `client.trace()` |
| Shutdown flush | `main.py` lifespan | `client.shutdown()` |

## Structure

```
fastapi/
├── README.md
├── .env.example
├── pyproject.toml
└── src/
    ├── main.py            — app factory, instrument(), lifespan, error handler
    ├── watcher.py         — client singleton
    ├── models/
    │   └── schemas.py     — Pydantic models
    └── routers/
        ├── auth.py        — login / logout with audit events
        └── notes.py       — CRUD with audit, metric, and explicit traces
```

## Quick start

```bash
cp .env.example .env
uv sync
uv run uvicorn src.main:app --reload
```

Open `http://localhost:8000/docs` for the interactive Swagger UI.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `W24_API_KEY` | _(required)_ | Your Watcher24 API key |
| `W24_APP_ID` | `notes-api` | App ID shown in the dashboard |
| `W24_GATEWAY_URL` | `http://localhost:8080` | Watcher24 gateway URL |
| `W24_ENVIRONMENT` | `development` | Environment tag on all events |
