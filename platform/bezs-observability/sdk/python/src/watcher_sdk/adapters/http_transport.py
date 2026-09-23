# Adapter: delivers event batches to the gateway over HTTP.
# Uses stdlib urllib to keep the SDK dependency-free.
# Retries with exponential backoff before giving up on a batch.
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict

from watcher_sdk._config import DEFAULT_GATEWAY_URL
from watcher_sdk.domain.event import EventInput
from watcher_sdk.ports.transport import Transport

_RETRY_DELAYS = [0.1, 0.2, 0.4]  # seconds between retry attempts


class HttpTransport(Transport):
    def __init__(self, gateway_url: str | None, api_key: str, app_id: str, environment: str, service_name: str = "") -> None:
        self._url = (gateway_url or DEFAULT_GATEWAY_URL).rstrip("/") + "/v1/events"
        headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-Environment": environment,
            "X-SDK-Version": "0.1.0",
            "X-Runtime": f"python/{sys.version_info.major}.{sys.version_info.minor}",
        }
        # Only send X-App-ID when explicitly provided — app-scoped keys and public
        # tokens (wpub_) don't need it; the gateway resolves the application from the key.
        if app_id:
            headers["X-App-ID"] = app_id
        # Only send X-Service-Name when the developer has set one.
        if service_name:
            headers["X-Service-Name"] = service_name
        self._headers = headers

    def send(self, events: list[EventInput]) -> None:
        body = json.dumps([_serialize(e) for e in events]).encode()
        last_err: Exception | None = None

        for attempt, delay in enumerate([0] + _RETRY_DELAYS):
            if delay:
                time.sleep(delay)
            try:
                req = urllib.request.Request(self._url, data=body, headers=self._headers, method="POST")
                with urllib.request.urlopen(req, timeout=10):
                    return
            except urllib.error.HTTPError as exc:
                # 4xx errors are not retryable — bad request or auth failure.
                if exc.code < 500:
                    print(f"[watcher] HTTP {exc.code} — batch dropped", file=sys.stderr)
                    return
                last_err = exc
            except OSError as exc:
                last_err = exc

        print(f"[watcher] batch dropped after {len(_RETRY_DELAYS) + 1} attempts: {last_err}", file=sys.stderr)


def _serialize(event: EventInput) -> dict:
    d = asdict(event)
    # Gateway expects snake_case fields matching the EventInput field names.
    return {k: v for k, v in d.items() if v or v == 0}
