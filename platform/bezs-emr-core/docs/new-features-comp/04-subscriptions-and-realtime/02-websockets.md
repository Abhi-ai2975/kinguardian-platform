# WebSocket Server for Real-time Subscriptions

**Medplum reference:** `packages/server/src/ws/`

---

## Why WebSockets for FHIR?

REST-hooks require the subscriber to have a public HTTPS endpoint — impossible for browser  
apps or devices behind firewalls. WebSockets solve this: the client maintains a persistent  
connection and receives pushes directly.

---

## WebSocket Endpoints

```
ws://fhir.example.com/ws/subscriptions      — FHIR Subscription channel
ws://fhir.example.com/ws/agent              — On-premise agent channel
ws://fhir.example.com/ws/realtime           — AI streaming channel
ws://fhir.example.com/ws/echo              — Echo/test channel
```

---

## FHIR Subscription via WebSocket

### Step 1 — Create WebSocket Subscription

```
POST /Subscription
{
  "resourceType": "Subscription",
  "status": "active",
  "criteria": "Observation?patient=Patient/10001",
  "channel": {
    "type": "websocket",
    "endpoint": "ws://fhir.example.com/ws/subscriptions",
    "payload": "application/fhir+json"
  }
}
→ { "id": "sub-ws-001", ... }
```

### Step 2 — Client Connects via WebSocket

```javascript
// JavaScript client
const ws = new WebSocket(
  'wss://fhir.example.com/ws/subscriptions',
  [],
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

ws.onopen = () => {
  // Subscribe to specific subscription IDs
  ws.send(JSON.stringify({
    type: 'bind-with-token',
    payload: { subscriptionId: 'sub-ws-001' }
  }));
};

ws.onmessage = (event) => {
  const bundle = JSON.parse(event.data);
  // Process FHIR notification bundle
  const observation = bundle.entry?.[1]?.resource;
  console.log('New observation:', observation);
};
```

### Step 3 — Server Pushes Notifications

When a matching Observation is created, the server pushes to connected clients:

```json
{
  "resourceType": "Bundle",
  "type": "history",
  "entry": [
    { "resource": {
        "resourceType": "SubscriptionStatus",
        "type": "event-notification",
        "subscription": { "reference": "Subscription/sub-ws-001" }
    }},
    { "resource": {
        "resourceType": "Observation",
        "id": "160001",
        "status": "final",
        "code": { "coding": [{ "system": "http://loinc.org", "code": "8867-4" }] },
        "valueQuantity": { "value": 72, "unit": "beats/min" }
    }}
  ]
}
```

---

## Implementation Plan

### Step 1 — WebSocket Manager

```python
# app/ws/manager.py

import asyncio
from fastapi import WebSocket
from collections import defaultdict

class WebSocketManager:
    def __init__(self):
        # subscription_id → set of connected websockets
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, subscription_ids: list[str]) -> None:
        await ws.accept()
        for sub_id in subscription_ids:
            self._connections[sub_id].add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        for sub_id, sockets in self._connections.items():
            sockets.discard(ws)

    async def push_to_subscription(self, sub_id: str, payload: dict) -> None:
        dead = set()
        for ws in self._connections.get(sub_id, set()):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[sub_id].discard(ws)

ws_manager = WebSocketManager()
```

### Step 2 — WebSocket Router

```python
# app/routers/ws.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.ws.manager import ws_manager
from app.auth.jwt import verify_ws_token

ws_router = APIRouter()

@ws_router.websocket("/ws/subscriptions")
async def subscription_ws(ws: WebSocket):
    # Authenticate via token in query param (WS can't set headers in browser)
    token = ws.query_params.get("token")
    user = await verify_ws_token(token)
    if not user:
        await ws.close(code=1008)
        return

    subscription_ids = []
    await ws.accept()

    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "bind-with-token":
                sub_id = data["payload"]["subscriptionId"]
                await ws_manager.connect(ws, [sub_id])
                subscription_ids.append(sub_id)
                # Send confirmation
                await ws.send_json({"type": "subscription-confirmed", "subscriptionId": sub_id})
            elif data.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
```

### Step 3 — Redis Pub/Sub for Multi-Process Scaling

If we run multiple FastAPI workers, WebSocket connections are split across processes.  
We need a message bus:

```python
# app/ws/pubsub.py

import redis.asyncio as aioredis

class WebSocketPubSub:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)

    async def publish(self, channel: str, message: dict) -> None:
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe_and_forward(self, channel: str) -> None:
        """Subscribe to Redis channel and forward to local WebSocket clients."""
        async with self.redis.pubsub() as pubsub:
            await pubsub.subscribe(channel)
            async for message in pubsub.listen():
                if message["type"] == "message":
                    payload = json.loads(message["data"])
                    sub_id = channel.replace("sub:", "")
                    await ws_manager.push_to_subscription(sub_id, payload)
```

### Step 4 — Modify Delivery Worker

After queuing a rest-hook delivery, also push to WebSocket subscribers:

```python
# In SubscriptionMatcher.match_and_queue:
if sub.channel_type == "rest-hook":
    await self.rest_hook_queue.enqueue(sub, event)
elif sub.channel_type == "websocket":
    payload = await self.build_notification_bundle(sub, event)
    await self.pubsub.publish(f"sub:{sub.subscription_id}", payload)
```

---

## Heartbeat / Keep-Alive

```python
@ws_router.websocket("/ws/subscriptions")
async def subscription_ws(ws: WebSocket):
    ...
    # Start heartbeat task
    async def heartbeat():
        while True:
            await asyncio.sleep(30)
            try:
                await ws.send_json({"type": "heartbeat", "timestamp": datetime.utcnow().isoformat()})
            except Exception:
                break

    asyncio.create_task(heartbeat())
```

---

## AI Streaming WebSocket

For `$ai` operations with streaming output:

```python
@ws_router.websocket("/ws/realtime")
async def ai_realtime_ws(ws: WebSocket):
    """Stream AI model responses via WebSocket."""
    await ws.accept()
    async for event in ws.iter_json():
        if event["type"] == "ai.request":
            patient_id = event.get("patientId")
            prompt = event["prompt"]
            model = event.get("model", "claude-sonnet-4-6")

            async for chunk in ai_service.stream(patient_id, model, prompt, ...):
                await ws.send_json({"type": "ai.chunk", "content": chunk})
            await ws.send_json({"type": "ai.done"})
```
