# realtime-go — Overview

## What Is This?

The realtime service is a Go WebSocket server that streams live telemetry events
to connected dashboard clients. It bridges Redis pub/sub and browser WebSocket
connections, providing sub-second event delivery to the Watcher24 dashboard.

---

## Why a Separate Service?

The gateway is optimised for high-throughput HTTP ingestion. Keeping WebSocket
fan-out in a separate process means:
- The gateway is never blocked by slow dashboard connections
- The realtime service can be scaled independently
- WebSocket connection state is isolated from ingestion

---

## How It Works

```
SDK → Gateway → Redis XADD (stream) + PUBLISH events:{org_id}
                                           ↓
                              realtime-go SUBSCRIBE events:{org_id}
                                           ↓
                              Hub fans out to all WebSocket clients for that org
                                           ↓
                              Dashboard receives live event stream
```

---

## Public Interface

```
GET  /health        — liveness check
GET  /ws            — WebSocket upgrade (requires ?token=wtch_... or Authorization header)
```

Once connected, the server streams newline-delimited JSON events:

```json
{"organization_id":"org_123","event_type":"audit","severity":"info","message":"user.login",...}
```

---

## Where It Fits

```
Go Gateway ──XADD──► Redis Streams ──► Python Worker ──► ClickHouse
               └──PUBLISH──► Redis Pub/Sub
                                  ↓
                          realtime-go
                                  ↓  WebSocket
                          Next.js Dashboard
```
