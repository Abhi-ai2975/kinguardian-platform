# Referral Management — Lifecycle Tracking

**FHIR Resources:** `ServiceRequest`, `Task`, `Communication`, `Appointment`  
**Standard:** Da Vinci CDex for referral documentation exchange

---

## What Is Referral Management?

A referral is a provider's request for a patient to see another provider (specialist) or receive a specific service (imaging, lab, PT). Referral management tracks the entire lifecycle:

1. **Ordering provider** creates the referral
2. **Referral coordinator** processes it and contacts the specialist
3. **Specialist** accepts or declines
4. **Appointment** is scheduled
5. **Specialist** sees the patient and sends notes back
6. **Ordering provider** receives and reviews the consult note

Without proper tracking, referrals get lost — a leading cause of adverse events and patient dissatisfaction.

---

## Referral Lifecycle States

```
draft → active → on-hold (awaiting auth) → [prior auth approved]
                                               ↓
                                          completed (appointment kept)
                                       OR revoked (patient cancelled)
                                       OR entered-in-error
```

Using `ServiceRequest.status`:

| Status | Meaning |
|---|---|
| `draft` | Created, not yet sent |
| `active` | Sent to specialist, awaiting acceptance |
| `on-hold` | Awaiting prior authorization from payer |
| `completed` | Referral fulfilled (appointment + consult note received) |
| `revoked` | Cancelled (patient declined, not indicated, duplicate) |
| `entered-in-error` | Created by mistake |

---

## FHIR Resource Choreography

```
ServiceRequest (type=referral, intent=referral)
    → Task (tracks workflow: requested → accepted → scheduled → completed)
    → Communication (outbound referral request to specialist)
    → Appointment (once scheduled)
    → Communication (specialist's consult note back to ordering provider)
    → DiagnosticReport (if specialist orders labs/imaging)
```

---

## Creating a Referral

```
POST /ServiceRequest
{
  "status": "draft",
  "intent": "referral",
  "category": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "103696004", "display": "Patient referral to specialist" }] }],
  "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "306206005", "display": "Referral to cardiology" }] },
  "subject": { "reference": "Patient/10001" },
  "encounter": { "reference": "Encounter/20001" },
  "requester": { "reference": "Practitioner/30001" },
  "performer": [{ "reference": "Practitioner/30005" }],
  "priority": "routine",
  "reasonCode": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "194828000", "display": "Angina pectoris" }] }],
  "reasonReference": [{ "reference": "Condition/120001" }],
  "note": [{ "text": "Patient with new-onset exertional chest pain. Prior stress test 2 years ago was negative. Please evaluate for ACS." }],
  "occurrencePeriod": { "start": "2024-01-15", "end": "2024-02-15" }
}
```

---

## Referral Workflow Service

```python
# app/services/referral_service.py

class ReferralService:
    async def create_referral(
        self,
        service_request: dict,
        user_id: str,
        org_id: str,
    ) -> dict:
        # 1. Save the ServiceRequest
        sr = await self.service_request_service.create(service_request, user_id, org_id)

        # 2. Check if prior auth needed
        needs_auth = await self.pa_checker.needs_prior_auth(
            procedure_code=self._extract_code(service_request),
            insurance_coverage_id=service_request.get("insurance_id"),
        )

        if needs_auth:
            # 3a. Place on hold and create PA request
            await self.service_request_service.patch(sr.service_request_id, {"status": "on-hold"}, user_id, org_id)
            pa_task = await self.prior_auth_service.submit_for_service_request(sr)
            task_status = "on-hold"
            task_description = "Prior authorization required before referral can be processed"
        else:
            task_status = "requested"
            task_description = "Referral sent to specialist for acceptance"

        # 3. Create tracking Task
        task = await self.task_service.create({
            "status": task_status,
            "intent": "order",
            "code": {"coding": [{"system": "http://snomed.info/sct", "code": "306206005"}]},
            "focus": {"reference": f"ServiceRequest/{sr.service_request_id}"},
            "for": {"reference": f"Patient/{sr.patient.patient_id}"},
            "owner": service_request.get("performer", [{}])[0],
            "requester": service_request.get("requester"),
            "description": task_description,
            "authoredOn": datetime.utcnow().isoformat() + "Z",
        }, user_id, org_id)

        # 4. Send referral notification to specialist
        await self.communication_service.create({
            "status": "completed",
            "category": [{"coding": [{"code": "consultation"}]}],
            "subject": {"reference": f"Patient/{sr.patient.patient_id}"},
            "sender": service_request.get("requester"),
            "recipient": service_request.get("performer", []),
            "sent": datetime.utcnow().isoformat() + "Z",
            "about": [{"reference": f"ServiceRequest/{sr.service_request_id}"}],
            "payload": [{"contentString": self._build_referral_text(sr)}],
        }, user_id, org_id)

        return {
            "serviceRequest": to_fhir_service_request(sr),
            "task": to_fhir_task(task),
        }

    async def accept_referral(self, task_id: int, practitioner_id: int, user_id: str, org_id: str):
        """Specialist accepts the referral."""
        await self.task_service.patch(task_id, {"status": "accepted"}, user_id, org_id)
        task = await self.task_service.get(task_id, user_id, org_id)

        # Update ServiceRequest to active
        sr_ref = task.focus_reference
        sr_id = int(sr_ref.split("/")[1])
        await self.service_request_service.patch(sr_id, {"status": "active"}, user_id, org_id)

        # Notify ordering provider
        await self.communication_service.create({
            "status": "completed",
            "category": [{"coding": [{"code": "referral-response"}]}],
            "sender": {"reference": f"Practitioner/{practitioner_id}"},
            "recipient": [task.requester],
            "about": [{"reference": sr_ref}],
            "payload": [{"contentString": "Referral accepted. Appointment scheduling in progress."}],
        }, user_id, org_id)

    async def complete_referral(self, task_id: int, consult_note: str, user_id: str, org_id: str):
        """Specialist completes the referral and sends consult note."""
        task = await self.task_service.get(task_id, user_id, org_id)

        # Complete the Task
        await self.task_service.patch(task_id, {
            "status": "completed",
            "lastModified": datetime.utcnow().isoformat() + "Z",
        }, user_id, org_id)

        # Complete the ServiceRequest
        sr_id = int(task.focus_reference.split("/")[1])
        await self.service_request_service.patch(sr_id, {"status": "completed"}, user_id, org_id)

        # Send consult note back to ordering provider
        await self.communication_service.create({
            "status": "completed",
            "category": [{"coding": [{"code": "consultation"}]}],
            "about": [{"reference": task.focus_reference}],
            "payload": [{"contentString": consult_note}],
        }, user_id, org_id)
```

---

## Referral Management API

| Method | Path | Description |
|---|---|---|
| `POST` | `/ServiceRequest` | Create referral (intent=referral) |
| `GET` | `/ServiceRequest?intent=referral` | List all referrals |
| `GET` | `/ServiceRequest?intent=referral&patient=Patient/10001` | Patient's referrals |
| `GET` | `/ServiceRequest?intent=referral&status=active` | Pending referrals |
| `POST` | `/referrals/{id}/$accept` | Specialist accepts referral |
| `POST` | `/referrals/{id}/$decline` | Specialist declines |
| `POST` | `/referrals/{id}/$complete` | Mark complete with consult note |
| `GET` | `/Task?code=referral&owner=Practitioner/30005` | Specialist's inbox |

---

## Referral Dashboard Queries

### Outbound Referrals (Ordering Provider View)

```
GET /ServiceRequest?
  intent=referral&
  requester=Practitioner/30001&
  _include=ServiceRequest:performer&
  _include=ServiceRequest:subject&
  _revinclude=Task:focus&
  _sort=-authored-on
```

### Inbound Referrals (Specialist View)

```
GET /Task?
  code=referral-workflow&
  owner=Practitioner/30005&
  status=requested,accepted,in-progress&
  _include=Task:focus&
  _sort=-authored-on
```

---

## Referral Closure Automation

A background bot closes stale referrals:

```python
@automation_registry.register("referral-follow-up")
async def follow_up_stale_referrals(ctx: AutomationContext):
    """Flag referrals with no activity after 30 days."""
    stale = await service_request_repo.list(
        intent="referral",
        status="active",
        authored_before=datetime.utcnow() - timedelta(days=30),
    )
    for sr in stale:
        # Create a Task for the referral coordinator
        await task_service.create({
            "status": "requested",
            "code": {"coding": [{"code": "follow-up-needed"}]},
            "focus": {"reference": f"ServiceRequest/{sr.service_request_id}"},
            "description": f"Referral inactive for 30+ days. Patient: {sr.patient.family_name}",
        })
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Referral workflow service (`create_referral`, `accept`, `complete`) | 3 |
| Referral API routes (`$accept`, `$decline`, `$complete`) | 1 |
| PA integration for referrals needing auth | 1 |
| Dashboard queries + list endpoints | 1 |
| Stale referral automation | 1 |
| Communication notifications | 1 |
| **Total** | **8 days** |
