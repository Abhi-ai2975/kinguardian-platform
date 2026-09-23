# realtime-go — API Reference

## Endpoints

### `GET /health`

Returns service health including Redis and IAM database connectivity.

**Response 200:**
```json
{ "status": "ok", "redis": "ok", "db": "ok" }
```

**Response 503:**
```json
{ "status": "degraded", "redis": "error: ...", "db": "ok" }
```

---

### `GET /ws`

Upgrades to a WebSocket connection. Requires authentication.

**Authentication** — provide the API key in one of two ways:

```
# Query parameter (simpler for browser WebSocket API)
ws://localhost:8081/ws?token=wtch_your_key_here

# Authorization header (preferred for server-to-server)
Authorization: Bearer wtch_your_key_here
```

**On success:** connection is upgraded to WebSocket. The server streams
newline-delimited JSON events for the authenticated org.

**On failure:** HTTP 401 Unauthorized before upgrade.

---

## WebSocket Protocol

### Server → Client

The server sends one JSON message per event, as a text frame:

```json
{
  "organization_id": "org_abc123",
  "event_type": "audit",
  "severity": "info",
  "message": "user.login",
  "timestamp": "2026-05-25T10:00:00.000Z",
  "ingested_at": "2026-05-25T10:00:00.012Z",
  "user_id": "u_123",
  "payload": { "method": "email", "ip": "1.2.3.4" }
}
```

### Client → Server

The client may send ping frames to keep the connection alive.
All other messages from the client are ignored.

### Disconnection

The server sends a close frame if:
- The API key is revoked or expired (the connection is re-validated periodically)
- The server is shutting down gracefully

---

## JavaScript Example

```ts
const ws = new WebSocket("ws://localhost:8081/ws?token=wtch_your_key_here");

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.event_type, event.message);
};

ws.onclose = () => {
  console.log("disconnected — reconnect with backoff");
};
```
