# watcher.py — Watcher24 client singleton for the FastAPI example.
# Import `client` from this module in routers and background tasks.
# One instance per process — the background flusher thread runs for the
# lifetime of the app and is stopped cleanly in the lifespan shutdown hook.
#
# app_id is optional when using an app-scoped key created via Settings → Apps
# in the console. The gateway resolves it automatically from the key.
# Only set W24_APP_ID if using a legacy org-level key with no app linked.
import os
from watcher_sdk import Client

_app_id = os.environ.get("W24_APP_ID") or None

client = Client(
    api_key=os.environ.get("W24_API_KEY", ""),
    app_id=_app_id,
    # service_name labels this component in the dashboard — filter by "fastapi-example"
    # to isolate these server events from other services in the same app.
    service_name=os.environ.get("W24_SERVICE_NAME", "fastapi-example"),
    # gateway_url defaults to https://ingest.watcher24.io — only set W24_GATEWAY_URL
    # for local dev (http://localhost:8080) or self-hosted deployments.
    gateway_url=os.environ.get("W24_GATEWAY_URL"),
    environment=os.environ.get("W24_ENVIRONMENT", "development"),
)
