# main.py — FastAPI application factory.
# Wires together:
#   - instrument(app, client)   → auto-traces every request
#   - Global exception handler  → logs unhandled errors before 500 response
#   - Lifespan startup/shutdown → client.shutdown() flushes buffered events
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # Load .env before importing watcher so env vars are set.

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from watcher_sdk.integrations.fastapi import instrument

from src.routers import auth, notes, test, ai
from src.watcher import client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — log that the server is ready.
    client.log("info", "server.started", payload={"app": "notes-api"})
    yield
    # Shutdown — flush buffered events so nothing is lost when the process exits.
    client.log("info", "server.shutting_down", payload={})
    client.shutdown()


app = FastAPI(
    title="Notes API",
    description="Watcher24 FastAPI integration example",
    version="0.1.0",
    lifespan=lifespan,
)

# instrument() attaches a Starlette middleware that produces one trace event
# per request — no decorators needed on individual route handlers.
instrument(app, client)

# Include routers.
app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(test.router)
app.include_router(ai.router)


@app.get("/health")
async def health() -> dict:
    """Health check — also fires a metric so uptime monitors appear in the dashboard."""
    client.metric("health.check", payload={"value": 1})
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all error handler.
    Logs every unhandled exception to Watcher24 before returning a 500 so
    engineering can find errors in the dashboard even without a log aggregator.
    """
    client.log(
        "error",
        "unhandled.exception",
        payload={
            "type": type(exc).__name__,
            "message": str(exc),
            "path": request.url.path,
            "method": request.method,
        },
    )
    return JSONResponse(status_code=500, content={"detail": "internal server error"})
