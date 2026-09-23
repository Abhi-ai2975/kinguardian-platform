# HIPAA-Grade Audit Logging

**FHIR Spec:** https://www.hl7.org/fhir/R4/auditevent.html  
**HIPAA:** 45 CFR § 164.312(b) — Audit Controls  
**Medplum reference:** `packages/server/src/audit.ts`

---

## HIPAA Audit Requirements

HIPAA Security Rule §164.312(b) requires:
> "Implement hardware, software, and/or procedural mechanisms that record and examine  
> activity in information systems that contain or use ePHI."

This means:
- Log every access to PHI (reads AND writes)
- Log every authentication event (login, logout, failed login)
- Log every admin action
- Retain logs for 6 years
- Logs must be tamper-evident
- Alerts for suspicious activity

---

## AuditEvent Resource Structure

We already have the `AuditEvent` FHIR resource. We need to auto-write it on every operation.

```json
{
  "resourceType": "AuditEvent",
  "type": {
    "system": "http://dicom.nema.org/resources/ontology/DCM",
    "code": "110110",
    "display": "Patient Record"
  },
  "subtype": [{ "code": "read", "display": "Read resource" }],
  "action": "R",
  "recorded": "2024-01-15T10:30:00Z",
  "outcome": "0",
  "outcomeDesc": "Success",
  "agent": [{
    "who": { "reference": "Practitioner/30001" },
    "name": "Dr. Jane Smith",
    "requestor": true,
    "network": { "address": "192.168.1.50", "type": "2" }
  }],
  "source": {
    "observer": { "display": "FHIR Server" },
    "type": [{ "system": "http://terminology.hl7.org/CodeSystem/security-source-type", "code": "4" }]
  },
  "entity": [{
    "what": { "reference": "Patient/10001" },
    "type": { "code": "1", "display": "Person" },
    "role": { "code": "1", "display": "Patient" }
  }]
}
```

### AuditEvent.action Codes

| Code | Meaning |
|---|---|
| `C` | Create |
| `R` | Read |
| `U` | Update |
| `D` | Delete |
| `E` | Execute (operation) |

### AuditEvent.outcome Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `4` | Minor failure |
| `8` | Serious failure |
| `12` | Major failure |

---

## Audit Middleware Implementation

```python
# app/audit/middleware.py

class AuditMiddleware:
    """Automatically writes AuditEvent for every request that touches PHI."""

    # Resources containing PHI
    PHI_RESOURCES = {
        "Patient", "Encounter", "Condition", "MedicationRequest", "Observation",
        "DiagnosticReport", "Procedure", "AllergyIntolerance", "Immunization",
        "DocumentReference", "CarePlan", "ServiceRequest", "Task", "Coverage",
        "Claim", "ClaimResponse", "Invoice", "EpisodeOfCare", "Appointment",
    }

    def __init__(self, app, audit_repo: AuditEventRepository):
        self.app = app
        self.audit_repo = audit_repo

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive)
        start_time = time.time()
        response_status = 200

        # Capture response status
        async def send_with_capture(message):
            nonlocal response_status
            if message["type"] == "http.response.start":
                response_status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_with_capture)
        finally:
            elapsed = time.time() - start_time
            await self._write_audit(request, response_status, elapsed)

    async def _write_audit(self, request: Request, status: int, elapsed: float):
        resource_type = self._extract_resource_type(request.url.path)
        if resource_type not in self.PHI_RESOURCES:
            return  # Don't audit non-PHI endpoints

        user = getattr(request.state, "user", {})
        action = self._method_to_action(request.method)
        outcome = "0" if status < 400 else ("4" if status < 500 else "8")

        audit_event = {
            "type": {"system": "http://dicom.nema.org/resources/ontology/DCM", "code": "110110"},
            "action": action,
            "recorded": datetime.utcnow().isoformat() + "Z",
            "outcome": outcome,
            "outcomeDesc": f"HTTP {status}",
            "agent": [{
                "who": {"reference": f"Practitioner/{user.get('fhirUser', '').split('/')[-1]}"} if user.get("fhirUser") else {"display": user.get("sub", "anonymous")},
                "requestor": True,
                "network": {"address": request.client.host if request.client else "unknown", "type": "2"},
            }],
            "source": {"observer": {"display": "FHIR Server"}},
            "entity": [{"what": {"reference": f"{resource_type}/{self._extract_resource_id(request.url.path)}"}} if self._extract_resource_id(request.url.path) else {"what": {"display": f"{resource_type} collection"}}],
            "_latencyMs": int(elapsed * 1000),
        }

        # Write asynchronously without blocking the response
        asyncio.create_task(self._async_write_audit(audit_event, user))

    def _method_to_action(self, method: str) -> str:
        return {"GET": "R", "POST": "C", "PUT": "U", "PATCH": "U", "DELETE": "D"}.get(method, "E")
```

---

## Dedicated Audit Log Table

While we have an `audit_events` FHIR resource table, we also need a separate,  
**immutable** audit log table for compliance:

```sql
-- Separate from FHIR AuditEvent resource — this is the compliance log
CREATE TABLE phi_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,           -- C, R, U, D, E
    outcome TEXT NOT NULL,          -- 0=success, 4=minor-fail, 8=serious-fail
    user_id TEXT NOT NULL,
    user_display TEXT,
    client_ip INET,
    user_agent TEXT,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    http_method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    org_id TEXT NOT NULL,
    latency_ms INTEGER,
    session_id TEXT,
    oauth_client_id TEXT,
    -- Immutability
    checksum TEXT NOT NULL          -- SHA256 of all other fields
);

-- Append-only: never UPDATE or DELETE
CREATE RULE phi_access_log_no_delete AS ON DELETE TO phi_access_log DO INSTEAD NOTHING;
CREATE RULE phi_access_log_no_update AS ON UPDATE TO phi_access_log DO INSTEAD NOTHING;

CREATE INDEX idx_phi_access_log_time ON phi_access_log(event_time DESC);
CREATE INDEX idx_phi_access_log_user ON phi_access_log(user_id, event_time DESC);
CREATE INDEX idx_phi_access_log_resource ON phi_access_log(resource_type, resource_id, event_time DESC);
```

---

## Audit Log API

```
GET /AuditEvent?date=ge2024-01-01     — Query audit events
GET /AuditEvent?agent=Practitioner/30001  — Audit events by user
GET /AuditEvent?entity=Patient/10001  — Audit events for a patient (who accessed)
GET /AuditEvent?action=D              — All deletes
GET /AuditEvent?outcome=8             — All serious failures
```

---

## Breach Detection

```python
# app/audit/breach_detector.py

SUSPICIOUS_PATTERNS = {
    "mass_download": {
        "description": "User downloaded >100 patient records in 1 hour",
        "query": """
            SELECT user_id, COUNT(*) as count
            FROM phi_access_log
            WHERE action = 'R' AND resource_type = 'Patient'
              AND event_time > NOW() - INTERVAL '1 hour'
            GROUP BY user_id
            HAVING COUNT(*) > 100
        """,
    },
    "after_hours_access": {
        "description": "Access between 11pm and 5am local time",
    },
    "unusual_patient_access": {
        "description": "Access to a patient with no clinical relationship",
    },
    "bulk_export_without_justification": {
        "description": "$export operation with no recorded reason",
    },
}

class BreachDetector:
    async def scan(self) -> list[BreachAlert]:
        alerts = []
        for pattern_id, pattern in SUSPICIOUS_PATTERNS.items():
            if "query" in pattern:
                results = await self.db.execute(text(pattern["query"]))
                if results:
                    alerts.extend([
                        BreachAlert(pattern_id=pattern_id, user_id=r.user_id, description=pattern["description"])
                        for r in results
                    ])
        return alerts
```

---

## Retention Policy

HIPAA requires audit logs be retained for 6 years:

```python
# Schedule: run monthly
async def archive_old_audit_logs():
    """Archive logs older than 6 years to cold storage."""
    cutoff = datetime.utcnow() - timedelta(days=6*365)
    old_logs = await db.execute(
        select(PHIAccessLog).where(PHIAccessLog.event_time < cutoff)
    )
    # Export to S3 Glacier or equivalent
    await s3_client.put_object(
        Bucket=AUDIT_ARCHIVE_BUCKET,
        Key=f"audit-archive/{cutoff.year}/{cutoff.month}.json.gz",
        Body=compress(serialize(old_logs)),
    )
    # After confirming archive, safe to delete from hot storage
    await db.execute(delete(PHIAccessLog).where(PHIAccessLog.event_time < cutoff))
```
