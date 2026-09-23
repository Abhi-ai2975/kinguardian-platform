# KinGuardian Platform API Documentation

## 1. Overview
The KinGuardian Platform REST & Realtime APIs provide secure, mobile-optimized, high-performance interfaces for family caregivers, care coordinators, and parents.

### Base URLs & Versioning
- **REST Base Path**: `/api/v1`
- **Health Checks**: `/health`, `/health/readiness`, `/health/liveness`
- **OpenAPI Schema**: `/openapi.json`
- **Interactive Swagger Docs**: `/docs`
- **Interactive ReDoc**: `/redoc`

---

## 2. Authentication & Authorization
All authenticated API requests require an HTTP Authorization Bearer token header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
The token is validated against the IAM JWKS endpoint, containing user identity (`sub`, `user_id`, `email`, `role`).

---

## 3. Mobile-Optimized Home Endpoints

### `GET /api/v1/families/{family_id}/home`
Aggregated home screen payload delivering the entire mobile state in a single roundtrip.

**Query Parameters:**
- `fields` *(optional, string)*: Comma-separated list of fields for partial response (e.g. `subjects,guardian_moments,pending_tasks`).
- `clinical_outage` *(optional, boolean)*: Simulates or signals clinical platform degradation.

**Response (200 OK):**
```json
{
  "family_id": "09eee0ec-a785-4945-8943-9518a5c541f4",
  "family_name": "Sharma Family Circle",
  "user_role": "coordinator",
  "timezone": "America/New_York",
  "subjects": [
    {
      "subject_id": "5c84ffad-ac0a-4847-9e64-4ea99cf41f7c",
      "fhir_patient_id": "fhir-pat-101",
      "display_name": "Father",
      "relationship": "father",
      "latest_feeling": "good",
      "vital_summary": { "blood_pressure": "124/80", "heart_rate": "72 bpm" },
      "today_adherence_rate": "100%"
    }
  ],
  "guardian_moments": [
    {
      "moment_id": "b3e09871-2291-4c40-8431-89309200aa01",
      "subject_id": "5c84ffad-ac0a-4847-9e64-4ea99cf41f7c",
      "type": "adherence_trend",
      "severity": "info",
      "title": "Consistent Blood Pressure",
      "summary": "Morning systolic readings have remained within optimal baseline for 14 days.",
      "recommendation": "Maintain current walking and medication routine.",
      "created_at": "2026-08-24T06:30:00Z"
    }
  ],
  "medications_today": [
    {
      "medication_id": "med-1",
      "subject_id": "5c84ffad-ac0a-4847-9e64-4ea99cf41f7c",
      "name": "Amlodipine 5mg",
      "dosage": "1 tablet",
      "scheduled_time": "08:00 AM",
      "status": "taken"
    }
  ],
  "upcoming_appointments": [
    {
      "coordination_id": "ac-991",
      "subject_id": "5c84ffad-ac0a-4847-9e64-4ea99cf41f7c",
      "title": "Cardiology Consultation",
      "scheduled_at": "2026-08-26T10:00:00Z",
      "preparation_status": "ready"
    }
  ],
  "pending_tasks": [
    {
      "task_id": "task-501",
      "subject_id": "5c84ffad-ac0a-4847-9e64-4ea99cf41f7c",
      "title": "Log Evening Vitals",
      "category": "vital",
      "priority": "medium",
      "status": "pending",
      "due_at": "2026-08-24T18:00:00Z"
    }
  ],
  "unread_notifications_count": 2,
  "clinical_data_status": "available",
  "clinical_warning": null,
  "generated_at": "2026-08-24T07:45:00Z"
}
```

---

## 4. Subject Timeline API

### `GET /api/v1/subjects/{subject_id}/timeline`
Cursor-paginated timeline aggregating check-ins, medication logs, AI insights, health documents, and appointments.

**Query Parameters:**
- `cursor` *(optional, string)*: Opaque pagination cursor.
- `limit` *(optional, integer, default: 20)*: Page size limit (max 50).
- `type` *(optional, string)*: Filter by event type (`checkin`, `medication`, `insight`, `document`, `appointment`, `task`).
- `from` *(optional, ISO 8601 timestamp)*: Earliest timestamp.
- `to` *(optional, ISO 8601 timestamp)*: Latest timestamp.

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "tl-99120",
      "event_type": "checkin",
      "title": "Wellbeing Check-in",
      "summary": "Parent feeling energetic with no symptoms reported.",
      "category": "checkin",
      "occurred_at": "2026-08-24T07:15:00Z",
      "actor_name": "Kishore Sharma",
      "metadata": { "feeling": "great", "severity": "none" }
    }
  ],
  "next_cursor": "eyJ0cyI6ICIyMDI2LTA4LTI0VDA3OjE1OjAwWiIsICJpZCI6ICJ0bC05OTEyMCJ9"
}
```

---

## 5. Family Conversations & Chat API

### `GET /api/v1/families/{family_id}/conversations`
Lists all chat rooms and channels within a family circle.

### `GET /api/v1/conversations/{conversation_id}/messages`
Retrieves cursor-paginated chat messages.

### `POST /api/v1/conversations/{conversation_id}/messages`
Sends a new message to the family conversation.

**Request Body:**
```json
{
  "message_type": "text",
  "body": "Dad completed his morning walk and took BP medication."
}
```

---

## 6. Realtime Communication Endpoints

### WebSocket: `/ws/families/{family_id}`
Real-time bidirectional event channel for active foreground app sessions.
- Invalidation events: `{ "event": "invalidation", "affected_projections": ["home", "timeline", "medications"] }`
- Heartbeat: Ping/Pong frame every 30 seconds.

### Server-Sent Events: `GET /api/v1/families/{family_id}/events/stream`
SSE endpoint for streaming real-time projection invalidation directives to web and desktop clients.

---

## 7. Standard Error Model (RFC 7807)
All errors return consistent, machine-readable JSON envelopes:
```json
{
  "code": "CONSENT_NOT_GRANTED",
  "message": "Consent not granted for clinical vitals access.",
  "status_code": 403,
  "request_id": "req-8910-ab34",
  "details": { "required_scope": "vitals" },
  "timestamp": "2026-08-24T07:45:00Z"
}
```
