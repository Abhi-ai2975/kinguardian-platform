# Message Bundles — Async FHIR Messaging

**FHIR Spec:** https://www.hl7.org/fhir/R4/messaging.html

---

## What Is FHIR Messaging?

FHIR Messaging is the async, event-driven communication pattern — the FHIR equivalent of HL7 v2 message passing. Unlike the REST paradigm (request/response), messaging is fire-and-forget with optional acknowledgement.

A `message` bundle:
- `type: "message"`
- First entry is always a `MessageHeader` resource
- Has a defined `event` (what happened)
- Has a `source` (sender endpoint) and `destination` (receiver endpoint)
- May carry any FHIR resources as payload

---

## Message Bundle Structure

```json
{
  "resourceType": "Bundle",
  "type": "message",
  "timestamp": "2024-01-15T10:30:00Z",
  "entry": [
    {
      "fullUrl": "MessageHeader/1",
      "resource": {
        "resourceType": "MessageHeader",
        "id": "1",
        "eventCoding": {
          "system": "http://example.org/fhir/message-events",
          "code": "patient-referral",
          "display": "Patient Referral"
        },
        "source": {
          "name": "Riverside Clinic",
          "endpoint": "https://riverside.example.org/fhir"
        },
        "destination": [{
          "name": "Valley Specialist",
          "endpoint": "https://valley.example.org/fhir/messaging"
        }],
        "sender": { "reference": "Practitioner/30001" },
        "responsible": { "reference": "Organization/190001" },
        "focus": [{ "reference": "ServiceRequest/80001" }]
      }
    },
    {
      "fullUrl": "ServiceRequest/80001",
      "resource": {
        "resourceType": "ServiceRequest",
        "id": "80001",
        "status": "active",
        "intent": "referral",
        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "306206005", "display": "Referral to cardiology" }] },
        "subject": { "reference": "Patient/10001" },
        "requester": { "reference": "Practitioner/30001" }
      }
    },
    {
      "fullUrl": "Patient/10001",
      "resource": { "resourceType": "Patient", "id": "10001", "name": [{ "family": "Smith" }] }
    }
  ]
}
```

---

## Standard Message Events

| Event Code | Meaning | Payload Resources |
|---|---|---|
| `patient-referral` | Refer patient to specialist | ServiceRequest, Patient, Coverage |
| `lab-result` | Lab results available | DiagnosticReport, Observation |
| `prescription-change` | Medication order changed | MedicationRequest, Patient |
| `discharge-notification` | Patient discharged | Encounter, Patient, Composition |
| `appointment-notification` | Appointment booked/cancelled | Appointment, Patient |
| `order-response` | Response to a clinical order | ServiceRequest, Task |
| `care-provision` | Care plan update | CarePlan, Patient |
| `admin-notify` | Administrative notification | Any |

---

## Message Acknowledgement

When a receiver processes a message, they return an `ACK` message bundle:

```json
{
  "resourceType": "Bundle",
  "type": "message",
  "entry": [
    {
      "resource": {
        "resourceType": "MessageHeader",
        "eventCoding": { "system": "http://hl7.org/fhir/message-events", "code": "message-response" },
        "source": { "endpoint": "https://valley.example.org/fhir/messaging" },
        "response": {
          "identifier": "msg-original-id",
          "code": "ok"
        }
      }
    }
  ]
}
```

`response.code` values: `ok` | `transient-error` | `fatal-error`

---

## Message Endpoint

```
POST /fhir/$process-message
```

FHIR defines this as the standard entry point for receiving messages.

---

## Implementation Plan

### Message Model (DB)

```sql
CREATE TABLE fhir_messages (
    id              BIGSERIAL PRIMARY KEY,
    message_id      VARCHAR(64) NOT NULL UNIQUE,
    event_code      VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'received',  -- received|processing|processed|error|acknowledged
    source_endpoint TEXT NOT NULL,
    dest_endpoint   TEXT,
    payload         JSONB NOT NULL,           -- full bundle
    focus_refs      JSONB,                    -- [{ type, id }]
    org_id          UUID NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    ack_sent_at     TIMESTAMPTZ,
    error_details   TEXT,
    INDEX (org_id, event_code),
    INDEX (status, received_at)
);
```

### Message Processor

```python
# app/services/message_service.py

class MessageService:
    HANDLERS: dict[str, "MessageHandler"] = {}

    @classmethod
    def register(cls, event_code: str):
        """Decorator to register a handler for a specific event code."""
        def decorator(fn):
            cls.HANDLERS[event_code] = fn
            return fn
        return decorator

    async def process_message(self, bundle: dict, org_id: str) -> dict:
        """Process an inbound FHIR message bundle."""
        if bundle.get("type") != "message":
            raise ValueError("Bundle type must be 'message'")

        entries = bundle.get("entry", [])
        if not entries:
            raise ValueError("Message bundle must have at least one entry (MessageHeader)")

        header = entries[0].get("resource", {})
        if header.get("resourceType") != "MessageHeader":
            raise ValueError("First entry must be a MessageHeader")

        event_code = header.get("eventCoding", {}).get("code")
        message_id = header.get("id", str(uuid.uuid4()))

        # Persist the message
        await self._store_message(message_id, event_code, bundle, org_id)

        # Dispatch to handler
        handler = self.HANDLERS.get(event_code)
        if handler:
            try:
                await handler(bundle, org_id, self)
                await self._mark_processed(message_id)
            except Exception as e:
                await self._mark_error(message_id, str(e))

        # Return ACK bundle
        return self._build_ack(message_id, "ok", header)

    def _build_ack(self, original_id: str, code: str, original_header: dict) -> dict:
        return {
            "resourceType": "Bundle",
            "type": "message",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "entry": [{
                "resource": {
                    "resourceType": "MessageHeader",
                    "eventCoding": {"system": "http://hl7.org/fhir/message-events", "code": "message-response"},
                    "source": {"endpoint": "https://our-fhir-server.example.org/fhir"},
                    "destination": [{"endpoint": original_header.get("source", {}).get("endpoint", "")}],
                    "response": {"identifier": original_id, "code": code},
                }
            }],
        }
```

### Sample Event Handler — Lab Result

```python
@MessageService.register("lab-result")
async def handle_lab_result(bundle: dict, org_id: str, svc: MessageService):
    """When a lab sends results, create Observation + DiagnosticReport."""
    entries_by_type = {e["resource"]["resourceType"]: e["resource"] for e in bundle.get("entry", []) if "resource" in e}

    diagnostic_report = entries_by_type.get("DiagnosticReport")
    observations = [v for k, v in entries_by_type.items() if k == "Observation"]

    if diagnostic_report:
        await svc.diagnostic_report_service.create_from_fhir(diagnostic_report, org_id)
    for obs in observations:
        await svc.observation_service.create_from_fhir(obs, org_id)
```

### Router

```python
# app/routers/operations/messaging.py

@messaging_router.post(
    "/$process-message",
    operation_id="process_message",
    summary="Receive and process a FHIR message Bundle",
    description=(
        "Accepts a Bundle of type 'message'. The first entry must be a MessageHeader. "
        "Returns an acknowledgement message bundle. Supported events: patient-referral, lab-result, discharge-notification."
    ),
    responses={200: {"content": {"application/fhir+json": {}}}},
)
async def process_message(
    body: dict,
    request: Request,
    svc: MessageService = Depends(get_message_service),
):
    user = request.state.user
    ack = await svc.process_message(body, user["activeOrganizationId"])
    return JSONResponse(ack)
```

---

## Outbound Messaging

To send FHIR messages to external systems:

```python
class MessageSender:
    async def send(self, event_code: str, payload: list[dict], destination: str) -> bool:
        """Send a FHIR message bundle to an external endpoint."""
        bundle = {
            "resourceType": "Bundle",
            "type": "message",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "entry": [
                {
                    "resource": {
                        "resourceType": "MessageHeader",
                        "eventCoding": {"system": "http://example.org/fhir/message-events", "code": event_code},
                        "source": {"endpoint": settings.FHIR_BASE_URL},
                        "destination": [{"endpoint": destination}],
                        "focus": [{"reference": e["resource"]["resourceType"] + "/" + e["resource"]["id"]} for e in payload if "resource" in e],
                    }
                },
                *payload,
            ],
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{destination}/$process-message",
                json=bundle,
                headers={"Content-Type": "application/fhir+json"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                return resp.status == 200
```

---

## Message vs. Subscription vs. Webhook

| Pattern | When to Use |
|---|---|
| FHIR Messaging (`$process-message`) | Point-to-point structured clinical messaging between care organizations |
| FHIR Subscriptions | Notify your own clients when a resource changes |
| Webhooks | Push events to third-party apps (non-FHIR) |
| HL7 v2 MLLP | Legacy systems that cannot speak FHIR |

FHIR messaging is best for **inter-organization** clinical data exchange where both sides are FHIR-capable.
