# realtime-go — Architecture

## Clean Architecture Layers

```
Domain (OrgEvent — pure data)
  ↑
Ports (EventSubscriber, KeyValidator — interfaces)
  ↑
Use Cases (AuthenticateConnection — validates key, returns org_id)
  ↑
Adapters (RedisSubscriber, PostgresKeyValidator)
  ↑
Transport (Hub, WebSocket handler, HTTP server)
  ↑
main.go (composition root)
```

---

## Layer Breakdown

### 1. Domain (`internal/domain/`)

`OrgEvent` — an event received from Redis pub/sub, ready to forward to clients.
Carries `OrgID` (for routing) and the raw JSON bytes (forwarded as-is to WebSocket).

---

### 2. Ports (`internal/ports/`)

| Interface | Purpose |
|-----------|---------|
| `EventSubscriber` | Subscribe to a Redis pub/sub channel for one org; returns a channel of raw event bytes |
| `KeyValidator` | Validate a raw API key against IAM; returns the resolved org_id |

Use cases depend on these interfaces, not on concrete implementations.

---

### 3. Use Cases (`internal/usecases/`)

`AuthenticateConnection` — the only use case. Validates the raw API key via
`KeyValidator` and returns the resolved `OrgID`. All connection logic (hub
registration, event pumping) lives in the transport layer since it is inherently
I/O-bound and tied to the WebSocket lifecycle.

---

### 4. Adapters (`internal/adapters/`)

| Package | Implements | Technology |
|---------|-----------|-----------|
| `redis` | `EventSubscriber` | go-redis pub/sub — SUBSCRIBE events:{orgID} |
| `postgres` | `KeyValidator` | pgx/v5 — same query as gateway |

---

### 5. Transport (`internal/transport/`)

**Hub** (`hub.go`) — the connection manager. Owns the per-org fan-out loop:
- Tracks `map[orgID] → set of WebSocket connections`
- When the first connection for an org joins, starts a Redis subscription goroutine
- When the last connection leaves, cancels the goroutine and cleans up
- Fan-out: for each pub/sub message, write raw JSON to every connection in the org

**WebSocket handler** (`handlers/ws.go`) — upgrades HTTP to WebSocket, calls
`AuthenticateConnection`, registers with the hub, then runs the read pump
(to detect client disconnects).

---

### 6. main.go (composition root)

Connects to Redis + PostgreSQL, creates adapters, creates use cases, creates hub,
builds the Fiber server, starts listening. Handles graceful shutdown on SIGINT/SIGTERM.
