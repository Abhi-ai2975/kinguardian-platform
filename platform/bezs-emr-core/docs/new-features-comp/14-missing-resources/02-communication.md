# Communication + CommunicationRequest — Secure Messaging

**FHIR R4 Spec (Communication):** https://www.hl7.org/fhir/R4/communication.html  
**FHIR R4 Spec (CommunicationRequest):** https://www.hl7.org/fhir/R4/communicationrequest.html  
**Sequence Start:** Communication = 370000, CommunicationRequest = 380000

---

## What Are These Resources?

| Resource | Purpose |
|---|---|
| `Communication` | A message that **has been sent** (event record) |
| `CommunicationRequest` | A request to **send** a message (order record) |

They form the foundation of the **secure messaging** system in an EMR — patient portal messages, provider-to-provider consultations, care coordination notes, and automated notifications.

---

## Communication — Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `preparation` \| `in-progress` \| `not-done` \| `on-hold` \| `stopped` \| `completed` \| `entered-in-error` \| `unknown` |
| `category` | CodeableConcept[] | Type of communication (alert, instruction, notification) |
| `priority` | code | `routine` \| `urgent` \| `asap` \| `stat` |
| `subject` | Reference(Patient) | Patient the message is about |
| `about` | Reference(Any)[] | Other resources the message concerns |
| `encounter` | Reference(Encounter) | Clinical context |
| `sent` | dateTime | When sent |
| `received` | dateTime | When received/read |
| `recipient` | Reference[]  | Who receives it (Patient, Practitioner, RelatedPerson) |
| `sender` | Reference | Who sent it |
| `payload` | BackboneElement[] | Message content (text, attachment, or FHIR reference) |
| `payload.contentString` | string | Plain text content |
| `payload.contentAttachment` | Attachment | File attachment |
| `payload.contentReference` | Reference | Link to FHIR resource |
| `inResponseTo` | Reference(Communication)[] | Thread chain |
| `basedOn` | Reference(CommunicationRequest)[] | The request this fulfills |

---

## Communication Category Codes

| Code | Meaning |
|---|---|
| `alert` | Critical alert (abnormal lab, allergy) |
| `notification` | Routine notification (appointment reminder) |
| `reminder` | Medication or appointment reminder |
| `instruction` | Patient education / discharge instruction |
| `consultation` | Provider-to-provider consult |
| `lab-result` | Lab result notification |
| `referral-response` | Response to a referral |

System: `http://terminology.hl7.org/CodeSystem/communication-category`

---

## DB Model — Communication

```python
# app/models/communication.py

class CommunicationStatus(str, Enum):
    preparation = "preparation"
    in_progress = "in-progress"
    not_done = "not-done"
    on_hold = "on-hold"
    stopped = "stopped"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"

class CommunicationPriority(str, Enum):
    routine = "routine"
    urgent = "urgent"
    asap = "asap"
    stat = "stat"

class Communication(Base):
    __tablename__ = "communication"

    id = Column(BigInteger, primary_key=True)
    communication_id = Column(
        BigInteger, Sequence("communication_id_seq", start=370000),
        nullable=False, unique=True, index=True,
    )
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(CommunicationStatus, name="communication_status", create_type=True), nullable=False)
    priority = Column(ENUM(CommunicationPriority, name="communication_priority", create_type=True))
    category = Column(JSONB)                        # [CodeableConcept]

    # Subject (patient context)
    patient_id = Column(BigInteger, ForeignKey("patient.id"), index=True)
    patient = relationship("Patient", lazy="selectin")

    # Context
    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")
    about = Column(JSONB)                           # [Reference]

    # Timing
    sent = Column(TIMESTAMP(timezone=True))
    received = Column(TIMESTAMP(timezone=True))

    # Participants (stored as JSONB since recipients vary by type)
    sender_reference = Column(String)               # "Practitioner/30001" or "Patient/10001"
    recipient_references = Column(JSONB)            # ["Practitioner/30001", "Patient/10001"]

    # Content
    payload = Column(JSONB)                         # [{ contentString | contentAttachment | contentReference }]

    # Threading
    in_response_to = Column(JSONB)                 # [{ reference: "Communication/370001" }]
    thread_id = Column(String, index=True)         # custom: UUID shared across a thread

    # Read receipts (custom extension for UI)
    read_by = Column(JSONB)                        # [{ who: "...", at: "..." }]

    # Base request
    based_on = Column(JSONB)                       # [{ reference: "CommunicationRequest/..." }]

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

---

## FHIR Mapper

```python
def to_fhir_communication(c: Communication) -> dict:
    resource = {
        "resourceType": "Communication",
        "id": str(c.communication_id),
        "status": c.status.value if hasattr(c.status, "value") else c.status,
    }
    if c.priority:
        resource["priority"] = c.priority.value if hasattr(c.priority, "value") else c.priority
    if c.category:
        resource["category"] = c.category
    if c.patient:
        resource["subject"] = {"reference": f"Patient/{c.patient.patient_id}"}
    if c.encounter:
        resource["encounter"] = {"reference": f"Encounter/{c.encounter.encounter_id}"}
    if c.sent:
        resource["sent"] = c.sent.isoformat()
    if c.received:
        resource["received"] = c.received.isoformat()
    if c.sender_reference:
        resource["sender"] = {"reference": c.sender_reference}
    if c.recipient_references:
        resource["recipient"] = [{"reference": r} for r in c.recipient_references]
    if c.payload:
        resource["payload"] = c.payload
    if c.in_response_to:
        resource["inResponseTo"] = c.in_response_to
    if c.about:
        resource["about"] = c.about
    return {k: v for k, v in resource.items() if v is not None}
```

---

## Secure Messaging Use Cases

### 1. Patient Portal Message to Provider

```json
POST /Communication
{
  "status": "completed",
  "category": [{ "coding": [{ "code": "notification" }] }],
  "priority": "routine",
  "subject": { "reference": "Patient/10001" },
  "sender": { "reference": "Patient/10001" },
  "recipient": [{ "reference": "Practitioner/30001" }],
  "sent": "2024-01-15T10:00:00Z",
  "payload": [{ "contentString": "I have been having chest pain since yesterday. Should I be concerned?" }]
}
```

### 2. Provider Response (Thread)

```json
POST /Communication
{
  "status": "completed",
  "priority": "urgent",
  "subject": { "reference": "Patient/10001" },
  "sender": { "reference": "Practitioner/30001" },
  "recipient": [{ "reference": "Patient/10001" }],
  "sent": "2024-01-15T10:30:00Z",
  "inResponseTo": [{ "reference": "Communication/370001" }],
  "payload": [{ "contentString": "Please call 911 if pain is severe. Otherwise come in today." }]
}
```

### 3. Lab Result Notification (Automated)

```json
POST /Communication
{
  "status": "completed",
  "category": [{ "coding": [{ "code": "lab-result" }] }],
  "subject": { "reference": "Patient/10001" },
  "sender": { "reference": "Organization/190001" },
  "recipient": [{ "reference": "Patient/10001" }, { "reference": "Practitioner/30001" }],
  "sent": "2024-01-15T08:00:00Z",
  "about": [{ "reference": "DiagnosticReport/110001" }],
  "payload": [
    { "contentString": "Your lab results are available." },
    { "contentReference": { "reference": "DiagnosticReport/110001" } }
  ]
}
```

---

## CommunicationRequest

`CommunicationRequest` is the **order** to send a communication — useful for:
- Scheduled appointment reminders
- Automated post-visit surveys
- Care gap closure outreach
- Referral coordination requests

```json
POST /CommunicationRequest
{
  "status": "active",
  "category": [{ "coding": [{ "code": "reminder" }] }],
  "priority": "routine",
  "subject": { "reference": "Patient/10001" },
  "recipient": [{ "reference": "Patient/10001" }],
  "occurrenceDateTime": "2024-01-20T09:00:00Z",
  "payload": [{ "contentString": "Reminder: Your appointment is on January 22nd at 2 PM." }],
  "requester": { "reference": "Practitioner/30001" }
}
```

A background worker processes `CommunicationRequest` resources with `occurrenceDateTime` in the past and creates `Communication` fulfillment records.

---

## Thread Management (Custom Extension)

For a patient portal UI, add a `thread_id` (extension or custom field) to group messages:

```python
GET /Communication?subject=Patient/10001&_sort=-sent
# Returns all communications for patient, sorted newest first

GET /Communication?thread_id=abc123&_sort=sent
# Returns a specific thread in chronological order
```

---

## Estimated Effort

| Resource | Days |
|---|---|
| `Communication` full CRUD | 2.5 |
| `CommunicationRequest` full CRUD | 2 |
| Thread query support | 0.5 |
| Background worker for scheduled sends | 1 |
| **Total** | **6 days** |
