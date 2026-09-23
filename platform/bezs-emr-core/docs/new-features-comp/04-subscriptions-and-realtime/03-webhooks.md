# Outbound Webhooks

Webhooks are the infrastructure layer under FHIR REST-hook subscriptions — but they can also  
be used independently for non-FHIR event delivery (e.g., notify a CRM when a new patient registers).

---

## Webhook Use Cases

| Trigger | Recipient | Payload |
|---|---|---|
| Patient created | CRM / Salesforce Health Cloud | Patient demographics |
| Appointment scheduled | SMS gateway | Patient notification |
| Lab result received | Care manager | Critical value alert |
| Claim submitted | Billing system | Claim details |
| Condition added | Population health registry | New diagnosis |
| Task completed | Workflow system | Task outcome |

---

## Webhook Delivery Contract

### Request

```
POST https://recipient.example.com/webhook
Content-Type: application/json
X-Webhook-Id: wh-uuid-abc123
X-Webhook-Timestamp: 2024-01-15T10:30:00Z
X-Webhook-Signature: sha256=a1b2c3d4...   (HMAC of body with shared secret)

{
  "event": "resource.created",
  "resourceType": "Patient",
  "resourceId": 10001,
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "resourceType": "Patient",
    "id": "10001",
    ...
  }
}
```

### Signature Verification

Recipients verify the `X-Webhook-Signature` header:

```python
import hmac, hashlib

def verify_webhook(body: bytes, secret: str, signature: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Database Schema

```sql
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,         -- HMAC signing secret
    events TEXT[] NOT NULL,       -- list of subscribed event types
    active BOOLEAN DEFAULT TRUE,
    headers JSONB,                -- additional headers to include
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    http_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_attempt_at);
```

---

## Event Types

```python
WEBHOOK_EVENTS = [
    "patient.created",
    "patient.updated",
    "patient.deleted",
    "encounter.created",
    "encounter.updated",
    "encounter.status_changed",
    "appointment.created",
    "appointment.booked",
    "appointment.cancelled",
    "observation.created",          # lab results, vitals
    "condition.created",
    "medication_request.created",
    "task.completed",
    "claim.submitted",
    "document_reference.created",
]
```

---

## Implementation Plan

### Step 1 — Event Emitter

```python
# app/core/event_bus.py

class EventBus:
    def __init__(self, redis):
        self.redis = redis

    async def emit(self, event_type: str, resource_type: str, resource_id: int, payload: dict):
        event = {
            "event": event_type,
            "resourceType": resource_type,
            "resourceId": resource_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": payload,
        }
        await self.redis.publish("fhir:events", json.dumps(event))

event_bus = EventBus(redis_client)
```

### Step 2 — Webhook Dispatcher

```python
# app/workers/webhook_dispatcher.py

class WebhookDispatcher:
    BACKOFF = [10, 60, 300, 1800, 7200]  # 10s, 1m, 5m, 30m, 2h

    async def dispatch(self, delivery_id: str) -> None:
        delivery = await self.repo.get(delivery_id)
        endpoint = await self.endpoint_repo.get(delivery.endpoint_id)

        signature = self._sign(delivery.payload, endpoint.secret)
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Id": str(delivery.id),
            "X-Webhook-Timestamp": delivery.created_at.isoformat() + "Z",
            "X-Webhook-Signature": f"sha256={signature}",
            **(endpoint.headers or {}),
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(endpoint.url, json=delivery.payload, headers=headers)
            await self.repo.mark_delivered(delivery.id, resp.status_code, resp.text[:2000])
        except Exception as e:
            await self.schedule_retry(delivery, str(e))

    async def schedule_retry(self, delivery, error: str) -> None:
        attempt = delivery.attempts + 1
        if attempt >= len(self.BACKOFF):
            await self.repo.mark_permanently_failed(delivery.id, error)
            return
        delay = self.BACKOFF[attempt]
        next_at = datetime.utcnow() + timedelta(seconds=delay)
        await self.repo.schedule_retry(delivery.id, attempt + 1, next_at, error)

    def _sign(self, payload: dict, secret: str) -> str:
        body = json.dumps(payload, separators=(",", ":")).encode()
        return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
```

### Step 3 — Integration with Mutations

```python
# In any repository's create/update/delete:

async def after_create(self, resource, fhir_payload, user_id, org_id):
    await event_bus.emit(
        f"{resource.__tablename__}.created",
        resource.__fhir_type__,
        resource.public_id,
        fhir_payload,
    )
```

---

## Webhook Management Endpoints

```
POST   /WebhookEndpoint          — Register a webhook endpoint
GET    /WebhookEndpoint          — List registered endpoints
GET    /WebhookEndpoint/{id}     — Get endpoint + stats
PUT    /WebhookEndpoint/{id}     — Update endpoint
DELETE /WebhookEndpoint/{id}     — Remove endpoint

GET    /WebhookEndpoint/{id}/deliveries  — List recent deliveries
POST   /WebhookEndpoint/{id}/$test       — Send a test event
POST   /WebhookEndpoint/{id}/$redeliver  — Retry failed deliveries
```

---

## Monitoring & Alerting

- Alert when a webhook endpoint has >5 consecutive failures → mark endpoint inactive
- Dashboard showing delivery success rate per endpoint
- Retention: keep delivery logs for 30 days, then archive/delete
