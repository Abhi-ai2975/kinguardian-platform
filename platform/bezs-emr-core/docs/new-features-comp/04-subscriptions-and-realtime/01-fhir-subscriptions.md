# FHIR Subscriptions

**FHIR Spec:** https://www.hl7.org/fhir/R4/subscription.html  
**R4B/R5 Subscription Topics:** https://www.hl7.org/fhir/uv/subscriptions-backport/  
**Medplum reference:** `packages/server/src/subscriptions/`

---

## Subscription Resource

```json
{
  "resourceType": "Subscription",
  "id": "sub-001",
  "status": "active",
  "reason": "Monitor heart rate for patient 10001",
  "criteria": "Observation?patient=Patient/10001&code=http://loinc.org|8867-4",
  "channel": {
    "type": "rest-hook",
    "endpoint": "https://app.example.com/webhook/fhir",
    "payload": "application/fhir+json",
    "header": ["Authorization: Bearer webhook-token-xyz"]
  }
}
```

### Subscription Fields

| Field | Description |
|---|---|
| `status` | `requested` → `active` → `error` / `off` |
| `reason` | Human description |
| `criteria` | FHIR search expression — events fire when a resource matches |
| `channel.type` | `rest-hook`, `websocket`, `email`, `message`, `sms` |
| `channel.endpoint` | URL for rest-hook delivery |
| `channel.payload` | Content type: `application/fhir+json` (full resource) or `id-only` |
| `channel.header` | HTTP headers to include in rest-hook requests |
| `end` | DateTime when this subscription expires |

---

## Subscription Lifecycle

### 1. Client Creates Subscription

```
POST /Subscription
→ 201 Created
→ Status is "requested"
```

### 2. Server Validates and Activates

Server sends a handshake notification to verify the endpoint is reachable:

```
POST https://app.example.com/webhook/fhir
Content-Type: application/fhir+json

{
  "resourceType": "Bundle",
  "type": "history",
  "entry": [{
    "resource": {
      "resourceType": "SubscriptionStatus",
      "subscription": { "reference": "Subscription/sub-001" },
      "type": "handshake",
      "notificationEvent": []
    }
  }]
}
```

If endpoint responds 2xx, subscription status → `active`.

### 3. Event Fires

When a matching resource is created/updated:

```
POST https://app.example.com/webhook/fhir
Content-Type: application/fhir+json
X-Subscription-Id: sub-001

{
  "resourceType": "Bundle",
  "type": "history",
  "entry": [
    {
      "resource": {
        "resourceType": "SubscriptionStatus",
        "subscription": { "reference": "Subscription/sub-001" },
        "type": "event-notification",
        "eventsSinceSubscriptionStart": 1,
        "notificationEvent": [{
          "eventNumber": 1,
          "timestamp": "2024-01-15T10:30:00Z",
          "focus": { "reference": "Observation/160001" }
        }]
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "160001",
        ...
      }
    }
  ]
}
```

---

## Database Schema

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    reason TEXT,
    criteria TEXT NOT NULL,           -- FHIR search expression
    channel_type TEXT NOT NULL,       -- rest-hook, websocket, email
    endpoint TEXT,                    -- URL for rest-hook
    payload_type TEXT DEFAULT 'application/fhir+json',
    headers JSONB,                    -- array of "Key: Value" strings
    end_time TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    events_sent INTEGER DEFAULT 0,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_criteria ON subscriptions(criteria);

-- Delivery log
CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(subscription_id),
    resource_type TEXT NOT NULL,
    resource_id INTEGER NOT NULL,
    event_number BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, delivered, failed, retrying
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Subscription Matching

When a resource mutation occurs, we must evaluate all active subscriptions:

```python
# app/services/subscription_matcher.py

class SubscriptionMatcher:
    async def match_and_queue(
        self,
        resource_type: str,
        resource_id: int,
        operation: str,  # 'create', 'update', 'delete'
        resource: dict,  # full FHIR resource dict
        user_id: str,
        org_id: str,
    ) -> None:
        subscriptions = await self.sub_repo.get_active_for_org(org_id)
        for sub in subscriptions:
            if await self._matches(sub.criteria, resource_type, resource):
                await self.event_queue.enqueue(sub, resource_type, resource_id)

    async def _matches(self, criteria: str, resource_type: str, resource: dict) -> bool:
        """Evaluate the FHIR search criteria against the changed resource."""
        # Parse: "Observation?patient=Patient/10001&code=http://loinc.org|8867-4"
        crit_resource, _, params_str = criteria.partition("?")
        if crit_resource != resource_type:
            return False
        params = parse_qs(params_str)
        return self.search_engine.matches_params(resource, params)
```

### Integration with Repository

Call the matcher in every repository mutation:

```python
# In base repository or a middleware

async def after_create(self, resource, resource_type: str, user_id: str, org_id: str):
    fhir = self._to_fhir(resource)
    await self.subscription_matcher.match_and_queue(resource_type, resource.public_id, "create", fhir, user_id, org_id)

async def after_update(self, resource, resource_type: str, user_id: str, org_id: str):
    fhir = self._to_fhir(resource)
    await self.subscription_matcher.match_and_queue(resource_type, resource.public_id, "update", fhir, user_id, org_id)
```

---

## REST-hook Delivery Worker

```python
# app/workers/subscription_delivery.py

import httpx
from datetime import datetime

class RestHookDeliveryWorker:
    RETRY_DELAYS = [30, 120, 600, 3600]  # seconds

    async def deliver(self, event: SubscriptionEvent) -> None:
        sub = await self.sub_repo.get(event.subscription_id)
        payload = await self.build_notification_bundle(sub, event)
        headers = self._parse_headers(sub.headers) | {
            "Content-Type": "application/fhir+json",
            "X-Subscription-Id": str(sub.subscription_id),
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(sub.endpoint, json=payload, headers=headers)
                resp.raise_for_status()
            await self.event_repo.mark_delivered(event.id)
        except Exception as e:
            await self.handle_failure(event, str(e))

    async def handle_failure(self, event: SubscriptionEvent, error: str) -> None:
        attempt = event.attempts + 1
        if attempt >= len(self.RETRY_DELAYS):
            await self.event_repo.mark_failed(event.id, error)
            await self.sub_repo.increment_error(event.subscription_id, error)
            if await self.sub_repo.get_error_count(event.subscription_id) >= 10:
                await self.sub_repo.set_status(event.subscription_id, "error")
        else:
            delay = self.RETRY_DELAYS[attempt]
            next_attempt = datetime.utcnow() + timedelta(seconds=delay)
            await self.event_repo.schedule_retry(event.id, attempt, next_attempt, error)
```

---

## Subscription Endpoints

```
POST   /Subscription           — Create subscription
GET    /Subscription           — List my subscriptions
GET    /Subscription/{id}      — Get subscription
PUT    /Subscription/{id}      — Update subscription
DELETE /Subscription/{id}      — Cancel subscription

GET    /Subscription/{id}/$status  — Get subscription status + event count
POST   /Subscription/{id}/$events  — Get missed events (backfill)
```
