# Subscriptions & Real-time Communication

FHIR Subscriptions allow clients to receive notifications when resources change —  
instead of polling the server repeatedly. This is essential for:
- Real-time clinical dashboards
- Automated workflows triggered by resource changes
- EHR-to-EHR data sync
- Patient monitoring alerts

---

## Files in This Section

| File | Topic |
|---|---|
| [01-fhir-subscriptions.md](./01-fhir-subscriptions.md) | FHIR R4B Subscription resource — REST-hook, email, websocket |
| [02-websockets.md](./02-websockets.md) | WebSocket server for real-time subscription delivery |
| [03-webhooks.md](./03-webhooks.md) | Outbound webhook delivery with retry and signing |
| [04-fhircast.md](./04-fhircast.md) | FHIRCast — shared clinical context protocol |

---

## Current State

We have no subscription or real-time mechanism. Every client must poll.

---

## Event Flow

```
1. Client creates Subscription resource
   POST /Subscription
   { criteria: "Observation?patient=10001&code=8867-4", channel: { type: "rest-hook", endpoint: "https://app.example.com/fhir-events" } }

2. FHIR server stores the Subscription

3. When a matching Observation is created/updated:
   POST /Observation   ← triggers event
   Server evaluates all active Subscriptions
   Matching subscriptions are queued for delivery

4. Delivery worker sends notifications:
   - REST-hook: POST to endpoint URL
   - WebSocket: push to connected client
   - Email: send notification email

5. Client receives notification and fetches full resource if needed
```

---

## Subscription Architecture

```
FHIR Mutation → Event Bus (Redis Pub/Sub or PostgreSQL LISTEN/NOTIFY)
                         ↓
              Subscription Matcher (evaluate criteria)
                         ↓
              Delivery Queue (Redis/Celery)
              ├── REST-hook worker
              ├── WebSocket pusher
              └── Email sender
```
