# Patient Portal Secure Messaging

**FHIR Resources:** `Communication`, `CommunicationRequest`, `DocumentReference`  
**Regulatory:** HIPAA §164.312(e)(2)(ii) — Encryption in transit  
**Standard:** DIRECT Protocol (for cross-organization messaging)

---

## What Is Patient Portal Messaging?

Secure messaging allows patients to communicate with their care team through a HIPAA-compliant channel — the alternative to insecure email or phone tag. It is a core patient engagement feature required by:
- Meaningful Use Stage 2 / MIPS (secure messaging capability)
- Patient Access Final Rule (patients must be able to message providers)
- NCQA PCMH recognition criteria

---

## Features Required

| Feature | Priority |
|---|---|
| Patient sends message to provider | P0 |
| Provider replies to patient | P0 |
| Provider-to-provider messaging | P0 |
| Threaded conversations | P0 |
| Attachments (lab results, photos) | P1 |
| Automated notifications (new message alert) | P0 |
| Read receipts | P1 |
| Message expiration / archiving | P2 |
| DIRECT Protocol (cross-org) | P2 |

---

## Architecture

```
Patient Portal (React/mobile)
        ↓ HTTPS
POST /Communication  (sends message)
        ↓
CommunicationService
        ↓ stores ──→ communication table (PostgreSQL)
        ↓ notifies → Redis pub/sub → WebSocket push → provider inbox
        ↓ emails  → SES notification "You have a new message"
        ↓ creates → AuditEvent (HIPAA log)
```

---

## Message Thread Model

Since `Communication` doesn't have a native thread concept, we use:
1. A custom `thread_id` extension on each `Communication`
2. `inResponseTo` for explicit reply chains

```python
# Thread creation on first message:
thread_id = str(uuid.uuid4())

# Thread continuation via extension:
communication = {
    "resourceType": "Communication",
    "extension": [
        { "url": "https://your-fhir-server/StructureDefinition/thread-id", "valueString": thread_id }
    ],
    "inResponseTo": [{ "reference": "Communication/370001" }],
    ...
}
```

### Thread Query

```
GET /Communication?thread_id=abc123&_sort=sent
```

---

## Full Messaging API

### Send Message (Patient → Provider)

```
POST /Communication
Authorization: Bearer <patient_jwt>

{
  "status": "completed",
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/communication-category", "code": "notification" }] }],
  "priority": "routine",
  "subject": { "reference": "Patient/10001" },
  "sender": { "reference": "Patient/10001" },
  "recipient": [{ "reference": "Practitioner/30001" }],
  "sent": "2024-01-15T10:00:00Z",
  "payload": [{ "contentString": "I've been experiencing dizziness after starting the new medication. What should I do?" }]
}
```

### Provider Reply

```
POST /Communication
Authorization: Bearer <provider_jwt>

{
  "status": "completed",
  "priority": "urgent",
  "subject": { "reference": "Patient/10001" },
  "sender": { "reference": "Practitioner/30001" },
  "recipient": [{ "reference": "Patient/10001" }],
  "inResponseTo": [{ "reference": "Communication/370001" }],
  "sent": "2024-01-15T10:45:00Z",
  "payload": [{ "contentString": "Stop taking the medication and call the office immediately if dizziness is severe. If you feel faint, call 911." }]
}
```

### Send with Attachment

```
POST /Communication
{
  "payload": [
    { "contentString": "Here are your lab results from today's visit." },
    { "contentAttachment": {
      "contentType": "application/pdf",
      "url": "https://files.example.org/labs/dr-10001-20240115.pdf",
      "title": "Lab Results — January 15, 2024",
      "size": 45678,
      "hash": "BASE64_SHA256"
    }}
  ]
}
```

### List Inbox (Provider)

```
GET /Communication?recipient=Practitioner/30001&status=completed&_sort=-sent&_count=20

Response:
{
  "total": 45,
  "limit": 20,
  "offset": 0,
  "data": [
    { "id": 370010, "subject": { "reference": "Patient/10001" }, "sent": "2024-01-15T10:00:00Z", "payload": [{"contentString": "I've been experiencing..."}] },
    ...
  ]
}
```

### Mark as Read

```
PATCH /Communication/370001
{ "received": "2024-01-15T10:45:00Z" }
```

---

## WebSocket Real-Time Notifications

When a new message arrives, the provider's portal should update in real-time:

```python
# app/services/communication_service.py

async def create(self, data: dict, user_id: str, org_id: str) -> Communication:
    comm = await self._create_in_db(data, user_id, org_id)

    # Notify each recipient via WebSocket
    for recipient_ref in (comm.recipient_references or []):
        resource_type, resource_id = recipient_ref.split("/")
        channel = f"inbox:{resource_type}:{resource_id}"
        await self.redis.publish(channel, json.dumps({
            "type": "new_message",
            "communication_id": comm.communication_id,
            "sender": comm.sender_reference,
            "subject": f"Patient/{comm.patient.patient_id}" if comm.patient else None,
            "preview": (comm.payload or [{}])[0].get("contentString", "")[:100],
        }))

    # Send email notification (non-blocking)
    asyncio.create_task(self._send_email_notification(comm))

    # Log to AuditEvent
    await self.audit_service.log_phi_access(
        user_id=user_id,
        action="create",
        resource_type="Communication",
        resource_id=comm.communication_id,
        patient_id=comm.patient_id,
    )

    return comm
```

```python
# app/routers/websocket.py

@ws_router.websocket("/ws/inbox/{practitioner_id}")
async def inbox_websocket(
    websocket: WebSocket,
    practitioner_id: int,
    token: str = Query(...),
):
    # Validate JWT
    user = await validate_ws_token(token)
    if str(practitioner_id) not in (user.get("practitioner_id", ""),):
        await websocket.close(code=4003)
        return

    await websocket.accept()
    channel = f"inbox:Practitioner:{practitioner_id}"

    async with redis_client.pubsub() as pubsub:
        await pubsub.subscribe(channel)
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
```

---

## HIPAA Compliance Requirements

| Requirement | Implementation |
|---|---|
| Encryption in transit | TLS 1.2+ (nginx, all API calls) |
| Encryption at rest | PostgreSQL TDE or Fernet on payload |
| Access control | JWT-scoped: patient can only read their own messages |
| Audit logging | Every message send/read logged to AuditEvent |
| Session timeout | Redis session expires after 30 minutes of inactivity |
| No PHI in email | Email notification says "You have a new message" — no clinical content |
| Message retention | 7-year retention (US), jurisdiction-specific |

---

## Message Access Control Rules

```python
class CommunicationAuthz:
    def can_read(self, user: dict, comm: Communication) -> bool:
        user_ref = f"{user['role']}/{user['resource_id']}"
        return (
            comm.sender_reference == user_ref
            or user_ref in (comm.recipient_references or [])
            or (user['role'] == 'Practitioner' and comm.patient_id in user.get('patient_panel', []))
        )

    def can_create_to(self, sender_ref: str, recipient_ref: str, relationship_svc) -> bool:
        # Patients can only message practitioners in their care team
        # Practitioners can message any patient in their org
        if sender_ref.startswith("Patient/"):
            patient_id = int(sender_ref.split("/")[1])
            return relationship_svc.is_in_care_team(patient_id, recipient_ref)
        return True
```

---

## DIRECT Protocol (Cross-Organization)

For messaging between different healthcare organizations:

```
Provider A (our system) → [DIRECT message] → Provider B (Epic/Cerner)
```

Implementation uses the DIRECT Project's S/MIME encrypted email standard:

```python
class DirectMessagingService:
    """Send FHIR Communication as DIRECT protocol message (S/MIME encrypted email)."""

    async def send_direct(self, comm: Communication, recipient_direct_address: str):
        # Convert Communication to C-CDA or plain text
        content = await self.ccda_service.from_communication(comm)

        # Encrypt with recipient's certificate from HISP
        cert = await self.hisp_client.get_certificate(recipient_direct_address)
        encrypted = self.encrypt_smime(content, cert)

        # Send via SMTP to DIRECT endpoint
        await self.smtp_client.send(
            from_addr=f"{self.org_direct_id}@direct.example.org",
            to_addr=recipient_direct_address,
            subject="Secure Health Message",
            body=encrypted,
        )
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `Communication` CRUD (from section 14) | 2.5 |
| Thread query support + `thread_id` | 0.5 |
| WebSocket inbox notifications | 2 |
| Email notification (SES) | 1 |
| HIPAA audit logging integration | 0.5 |
| Patient access control rules | 1 |
| Attachment upload + storage (S3) | 1 |
| DIRECT protocol integration | 4 |
| **Total** | **12.5 days** |
