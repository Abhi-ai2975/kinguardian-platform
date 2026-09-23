# Prior Authorization — Da Vinci PAS + X12 278

**Standards:** Da Vinci Prior Authorization Support (PAS) IG, X12 278 transaction  
**FHIR IG:** https://hl7.org/fhir/us/davinci-pas/  
**Regulatory driver:** CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F, January 2024)

---

## What Is Prior Authorization?

Prior authorization (PA) is a payer requirement for a provider to get approval before rendering certain services (medications, procedures, imaging, referrals) or the claim won't be paid. It is **the single biggest administrative burden in US healthcare** — 87 million PA requests per year, averaging 14 hours of clinician/staff time per week per practice.

The CMS 2024 rule requires payers to:
- Respond to PA requests within 72 hours (urgent) or 7 days (standard) by 2026
- Support FHIR-based PA via the Da Vinci PAS IG

---

## Prior Authorization Lifecycle

```
Provider identifies service needing PA
          ↓
Create Claim (type=predetermination or preauthorization)
          ↓
POST /Claim/$submit  →  converts to X12 278 →  payer adjudication system
          ↓
Payer responds within 72h (urgent) / 7d (standard)
          ↓
Create ClaimResponse with decision:
  - approved → proceed with service
  - denied → appeal or alter plan
  - pend → payer needs more information (may request ADR)
          ↓
If pended → collect supporting documentation
             POST /Claim/$submit with attachments
          ↓
Service rendered → reference PA number on Claim for billing
```

---

## FHIR Resources Involved

| Resource | Role |
|---|---|
| `Claim` | The PA request (`use: "preauthorization"`) |
| `ClaimResponse` | Payer's decision (approved/denied/pended) |
| `ServiceRequest` | The clinical order needing authorization |
| `Coverage` | Patient's insurance plan |
| `Organization` | Payer organization |
| `Practitioner` | Ordering/rendering provider |
| `DocumentReference` | Supporting clinical documentation |
| `Task` | Tracks workflow state (da Vinci PAS specific) |
| `Bundle` (transaction) | Wraps the PA request for submission |

---

## Da Vinci PAS — FHIR-Based PA

The Da Vinci PAS IG defines how to submit PA requests as FHIR Bundles via `POST /Claim/$submit`:

### PA Request Bundle

```json
POST /Claim/$submit

{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Claim",
        "status": "active",
        "type": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/claim-type", "code": "professional" }] },
        "use": "preauthorization",
        "patient": { "reference": "Patient/10001" },
        "created": "2024-01-15T10:00:00Z",
        "insurer": { "reference": "Organization/payer-bluecross" },
        "provider": { "reference": "Organization/190001" },
        "priority": { "coding": [{ "code": "normal" }] },
        "insurance": [{ "sequence": 1, "focal": true, "coverage": { "reference": "Coverage/240001" } }],
        "item": [{
          "sequence": 1,
          "category": { "coding": [{ "code": "medical" }] },
          "productOrService": { "coding": [{ "system": "http://www.ama-assn.org/go/cpt", "code": "70553", "display": "MRI brain with contrast" }] },
          "servicedDate": "2024-01-22",
          "quantity": { "value": 1 },
          "net": { "value": 2500.00, "currency": "USD" }
        }]
      }
    },
    {
      "resource": {
        "resourceType": "ServiceRequest",
        "status": "active",
        "intent": "order",
        "code": { "coding": [{ "system": "http://www.ama-assn.org/go/cpt", "code": "70553" }] },
        "subject": { "reference": "Patient/10001" },
        "requester": { "reference": "Practitioner/30001" },
        "reasonCode": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "230690007", "display": "Stroke" }] }]
      }
    }
  ]
}
```

### PA Response (ClaimResponse)

```json
{
  "resourceType": "ClaimResponse",
  "status": "active",
  "type": { "coding": [{ "code": "professional" }] },
  "use": "preauthorization",
  "patient": { "reference": "Patient/10001" },
  "created": "2024-01-16T09:00:00Z",
  "insurer": { "reference": "Organization/payer-bluecross" },
  "request": { "reference": "Claim/170001" },
  "outcome": "complete",
  "preAuthRef": "PA-2024-789456",
  "item": [{
    "itemSequence": 1,
    "adjudication": [{
      "category": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/adjudication", "code": "submitted" }] },
      "reason": { "coding": [{ "code": "A1", "display": "Approved" }] }
    }]
  }]
}
```

---

## Implementation — `$submit` Operation

```python
# app/routers/operations/prior_auth.py

@pa_router.post(
    "/Claim/$submit",
    operation_id="submit_prior_auth",
    summary="Submit a prior authorization request to payer",
    description="Converts a FHIR Claim (use=preauthorization) to X12 278 and submits to payer via Surescripts or direct payer API.",
    responses={200: {"content": {"application/fhir+json": {}}}},
)
async def submit_prior_auth(
    body: dict,
    request: Request,
    svc: PriorAuthService = Depends(get_pa_service),
):
    user = request.state.user
    result = await svc.submit(body, user["sub"], user["activeOrganizationId"])
    return JSONResponse(result)
```

```python
# app/services/prior_auth_service.py

class PriorAuthService:
    async def submit(self, bundle: dict, user_id: str, org_id: str) -> dict:
        claim = self._extract_claim(bundle)

        # Persist the Claim
        saved_claim = await self.claim_service.create(claim, user_id, org_id)

        # Create pending Task for tracking
        task = await self.task_service.create({
            "status": "requested",
            "code": {"coding": [{"code": "prior-authorization"}]},
            "focus": {"reference": f"Claim/{saved_claim.claim_id}"},
            "description": "Prior authorization request pending payer review",
        }, user_id, org_id)

        # Convert to X12 278 and submit to payer
        x12_message = self._to_x12_278(claim)
        payer_response = await self.payer_client.submit_x12(x12_message)

        # If synchronous response:
        if payer_response.decision:
            return await self._process_response(payer_response, saved_claim.claim_id, task.task_id, user_id, org_id)

        # If async (payer will call back):
        return {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [{"resource": to_fhir_claim(saved_claim)}, {"resource": to_fhir_task(task)}],
        }

    async def _process_response(self, payer_response, claim_id, task_id, user_id, org_id):
        decision = payer_response.decision  # "approved" | "denied" | "pended"

        claim_response = await self.claim_response_service.create({
            "status": "active",
            "use": "preauthorization",
            "outcome": "complete" if decision != "pended" else "partial",
            "preAuthRef": payer_response.auth_number,
            "request": {"reference": f"Claim/{claim_id}"},
        }, user_id, org_id)

        await self.task_service.patch(task_id, {
            "status": "completed" if decision == "approved" else ("failed" if decision == "denied" else "in-progress"),
        }, user_id, org_id)

        return {"resourceType": "Bundle", "type": "collection", "entry": [{"resource": to_fhir_claim_response(claim_response)}]}
```

---

## X12 278 Message Structure

For payers that don't support FHIR yet, X12 278 is required:

```python
def _to_x12_278(self, claim: dict) -> str:
    """Convert FHIR Claim to X12 278 transaction set."""
    lines = [
        "ISA*00*          *00*          *ZZ*PROVIDER_ID     *ZZ*PAYER_ID        *240115*1000*^*00501*000000001*0*T*:",
        "GS*HI*PROVIDER_ID*PAYER_ID*20240115*1000*1*X*005010X217",
        "ST*278*0001*005010X217",
        f"BHT*0007*13*{claim['id']}*20240115*1000*RQ",  # RQ = request
        # Loop 2000A — Utilization Management Organization
        "HL*1**20*1",
        "NM1*X3*2*BLUE CROSS*****PI*PAYER123",
        # Loop 2000B — Requester
        "HL*2*1*21*1",
        f"NM1*1P*1*{claim['provider_last']}*{claim['provider_first']}****NPI*{claim['provider_npi']}",
        # Loop 2000E — Patient
        "HL*5*4*22*0",
        f"NM1*IP*1*{claim['patient_last']}*{claim['patient_first']}****MI*{claim['member_id']}",
        # Loop 2000F — Event (the service)
        "HL*6*5*EV*0",
        f"DTP*472*D8*20240122",  # service date
        f"HI*ABK:{claim['diagnosis_code']}",  # diagnosis
        f"HSD*VS*1*UN*{claim['procedure_code']}*4",  # units
        "SE*20*0001",
        "GE*1*1",
        "IEA*1*000000001",
    ]
    return "\n".join(lines)
```

---

## PA Decision Tracking (Task-Based)

Track the PA workflow state in `Task`:

| Task.status | Meaning |
|---|---|
| `requested` | PA submitted to payer, awaiting response |
| `in-progress` | Payer has acknowledged, under review (pended) |
| `completed` | PA approved — include `Task.output[preAuthRef]` |
| `failed` | PA denied — include `Task.output[denialReason]` |
| `on-hold` | Payer requested additional information |
| `cancelled` | Provider cancelled the PA request |

---

## Supporting Documentation (Attachments)

When payer pends a PA request for more info:

```python
POST /Claim/$submit-attachment
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "TrackingId", "valueString": "PA-2024-789456" },
    { "name": "AttachTo", "resource": { "resourceType": "Claim", "id": "170001" } },
    { "name": "Content", "resource": {
      "resourceType": "DocumentReference",
      "type": { "coding": [{ "code": "clinical-notes" }] },
      "content": [{ "attachment": { "contentType": "application/pdf", "data": "BASE64_PDF_DATA" } }]
    }}
  ]
}
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `Claim/$submit` operation + PA bundle parsing | 3 |
| X12 278 generator + payer mock | 3 |
| ClaimResponse creation + outcome handling | 2 |
| Task-based workflow tracking | 1 |
| Supporting attachment submission | 1 |
| Payer webhook callback handler | 2 |
| Da Vinci PAS conformance testing | 3 |
| **Total** | **15 days** |
