# FHIRCast — Shared Clinical Context

**Spec:** https://fhircast.org/  
**Medplum reference:** `packages/server/src/fhir/fhircast.ts`

---

## What Is FHIRCast?

FHIRCast is a protocol for synchronizing the active clinical context across multiple  
co-launched healthcare applications. When a clinician is working in an EMR and opens  
a radiology viewer, imaging app, or AI assistant as a side-by-side tool:

- Without FHIRCast: each app has its own context; clinician must manually navigate to the same patient in each app
- With FHIRCast: when the clinician switches to Patient B in the EMR, all other open apps  
  automatically switch to Patient B

This is the "synchronization fabric" for multi-app clinical workspaces.

---

## FHIRCast Hub

The FHIRCast Hub is a server-side component that:
1. Manages *topics* (a topic = a shared session context)
2. Accepts *event* publishes from apps
3. Delivers events to all subscribers of a topic via WebHook or WebSocket

Our FHIR server acts as the FHIRCast Hub.

---

## FHIRCast Events

### `Patient-open`

A patient record has been opened.

```json
{
  "timestamp": "2018-01-08T01:37:05.14",
  "id": "q9v3jubddqt63n1",
  "event": {
    "hub.topic": "fdb2f928-5d77-45a7-964f-d866c37c1t7h",
    "hub.event": "Patient-open",
    "context": [
      {
        "key": "patient",
        "resource": { "resourceType": "Patient", "id": "10001" }
      }
    ]
  }
}
```

### `Encounter-open`

An encounter has been opened.

```json
{
  "event": {
    "hub.event": "Encounter-open",
    "context": [
      { "key": "patient", "resource": { "resourceType": "Patient", "id": "10001" } },
      { "key": "encounter", "resource": { "resourceType": "Encounter", "id": "20001" } }
    ]
  }
}
```

### `Patient-close`

A patient record has been closed.

```json
{
  "event": {
    "hub.event": "Patient-close",
    "context": [{ "key": "patient", "resource": { "resourceType": "Patient", "id": "10001" } }]
  }
}
```

### `ImagingStudy-open`

A DICOM imaging study has been opened.

### `DiagnosticReport-open`

A diagnostic report has been opened.

---

## FHIRCast API

### Subscribe to a Topic

```
POST /fhircast/hub

hub.callback=https://app.example.com/fhircast-callback
hub.events=Patient-open,Patient-close,Encounter-open
hub.secret=mysecret
hub.topic=session-uuid-abc123
hub.mode=subscribe
```

**Verification:** Hub sends GET to `hub.callback` with `hub.challenge`:

```
GET https://app.example.com/fhircast-callback
    ?hub.mode=subscribe&hub.topic=session-uuid-abc123&hub.challenge=ABCXYZ123&hub.lease_seconds=3600
```

App must respond with `hub.challenge` value to confirm subscription.

### Publish an Event

Any subscribed app can publish events:

```
POST /fhircast/hub
Content-Type: application/json

{
  "timestamp": "2024-01-15T10:30:00Z",
  "id": "unique-event-id",
  "event": {
    "hub.topic": "session-uuid-abc123",
    "hub.event": "Patient-open",
    "context": [{
      "key": "patient",
      "resource": { "resourceType": "Patient", "id": "10001" }
    }]
  }
}
```

### Get Current Context

```
GET /fhircast/hub/session-uuid-abc123
→ { "hub.topic": "...", "context": { "patient": { "resourceType": "Patient", "id": "10001" } } }
```

---

## Database Schema

```sql
CREATE TABLE fhircast_topics (
    id TEXT PRIMARY KEY,       -- the hub.topic value (UUID)
    created_by TEXT NOT NULL,
    org_id TEXT NOT NULL,
    current_context JSONB,     -- latest context
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fhircast_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id TEXT NOT NULL REFERENCES fhircast_topics(id),
    callback_url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL,
    lease_seconds INTEGER DEFAULT 3600,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Plan

```python
# app/services/fhircast_service.py

class FHIRCastService:
    async def subscribe(
        self,
        topic_id: str,
        callback_url: str,
        events: list[str],
        secret: str,
        lease_seconds: int = 3600,
    ) -> str:
        # 1. Create subscription record
        sub = await self.sub_repo.create(topic_id, callback_url, events, secret, lease_seconds)
        # 2. Send verification challenge
        challenge = secrets.token_urlsafe(20)
        await self._verify_subscription(callback_url, topic_id, challenge, lease_seconds)
        return sub.id

    async def publish_event(self, topic_id: str, event: dict) -> None:
        # 1. Update current context
        await self.topic_repo.update_context(topic_id, event["event"]["context"])
        # 2. Find matching subscriptions
        subs = await self.sub_repo.get_active_for_topic(topic_id, event["event"]["hub.event"])
        # 3. Fan out to all subscribers
        for sub in subs:
            await self.delivery_queue.enqueue(sub, event)

    async def _verify_subscription(self, callback_url: str, topic_id: str, challenge: str, lease: int):
        params = {
            "hub.mode": "subscribe",
            "hub.topic": topic_id,
            "hub.challenge": challenge,
            "hub.lease_seconds": lease,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(callback_url, params=params)
        if resp.text.strip() != challenge:
            raise SubscriptionVerificationError("Challenge response mismatch")
```

---

## FHIRCast in EMR Context

Our future EMR UI will:
1. Create a FHIRCast topic when a clinician starts a session
2. Publish `Patient-open` when the clinician opens a patient chart
3. Publish `Encounter-open` when they start an encounter
4. Any integrated app (AI assistant, medication checker, imaging viewer) subscribes to the topic
5. All apps stay synchronized automatically

This is the foundation of the **AI-enabled clinical workspace** where AI tools automatically  
have context about the current patient without the clinician needing to re-select it.
