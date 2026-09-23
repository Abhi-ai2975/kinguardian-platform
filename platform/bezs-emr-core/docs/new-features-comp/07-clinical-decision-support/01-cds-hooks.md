# CDS Hooks — Clinical Decision Support Hooks

**Spec:** https://cds-hooks.org/  
**Medplum reference:** `packages/server/src/cds/`

---

## What Are CDS Hooks?

CDS Hooks is a standard protocol for embedding clinical decision support into EHR workflows.  
When a clinician performs a specific action (opening a chart, ordering a medication, signing a note),  
the EHR calls a *CDS Service* endpoint. The service returns *Cards* — contextual recommendations.

```
Clinician opens patient chart
    ↓
EHR calls POST /cds-services/patient-view
    with { patient: "Patient/10001", encounter: "Encounter/20001" }
    ↓
CDS Service fetches relevant data and evaluates rules
    ↓
Returns Cards:
    - "Patient is overdue for HbA1c (last: 8 months ago)" [suggestion: order HbA1c]
    - "Patient on metformin — check eGFR before next refill" [suggestion: order eGFR]
    ↓
EHR displays cards in sidebar
```

---

## Discovery Endpoint

A CDS-capable server must expose:

```
GET /cds-services
```

**Response:**
```json
{
  "services": [
    {
      "hook": "patient-view",
      "title": "Diabetes Care Gap Alerts",
      "description": "Alerts for diabetes patients missing annual screenings",
      "id": "diabetes-care-gaps",
      "prefetch": {
        "patient": "Patient/{{context.patientId}}",
        "conditions": "Condition?patient={{context.patientId}}&clinical-status=active",
        "observations": "Observation?patient={{context.patientId}}&code=4548-4&_sort=-date&_count=1"
      }
    },
    {
      "hook": "order-select",
      "title": "Drug Interaction Checker",
      "description": "Checks ordered medication against active medications",
      "id": "drug-interaction-check",
      "prefetch": {
        "patient": "Patient/{{context.patientId}}",
        "medications": "MedicationRequest?patient={{context.patientId}}&status=active"
      }
    },
    {
      "hook": "order-sign",
      "title": "Prior Authorization Check",
      "description": "Checks if ordered item requires prior authorization",
      "id": "prior-auth-check"
    }
  ]
}
```

---

## Standard CDS Hooks

| Hook | Fired When |
|---|---|
| `patient-view` | EHR opens a patient chart |
| `encounter-start` | New encounter begins |
| `encounter-discharge` | Patient is being discharged |
| `order-select` | Clinician selects an order from a list |
| `order-sign` | Clinician signs/submits orders |
| `appointment-book` | Appointment is being scheduled |
| `problem-list-item-create` | A problem is being added |
| `medication-prescribe` | A medication is being prescribed |

---

## CDS Hook Request

```json
{
  "hookInstance": "d1577c69-dfbe-44ad-ba6d-3e05e953b2ea",
  "fhirServer": "https://fhir.example.com",
  "hook": "patient-view",
  "fhirAuthorization": {
    "access_token": "...",
    "token_type": "Bearer",
    "scope": "patient/Patient.read patient/Observation.read"
  },
  "context": {
    "userId": "Practitioner/30001",
    "patientId": "10001",
    "encounterId": "20001"
  },
  "prefetch": {
    "patient": { "resourceType": "Patient", "id": "10001", ... },
    "conditions": { "resourceType": "Bundle", "entry": [...] },
    "observations": { "resourceType": "Bundle", "entry": [] }
  }
}
```

---

## CDS Hook Response — Cards

```json
{
  "cards": [
    {
      "uuid": "card-001",
      "summary": "HbA1c overdue",
      "detail": "Last HbA1c was 8 months ago (result: 8.2%). Guidelines recommend testing every 3-6 months for uncontrolled diabetes.",
      "indicator": "warning",
      "source": {
        "label": "Diabetes Care Protocol",
        "url": "https://fhir.example.com/protocols/diabetes"
      },
      "suggestions": [
        {
          "label": "Order HbA1c",
          "actions": [{
            "type": "create",
            "description": "Order HbA1c lab test",
            "resource": {
              "resourceType": "ServiceRequest",
              "status": "draft",
              "intent": "original-order",
              "code": { "coding": [{ "system": "http://loinc.org", "code": "4548-4", "display": "Hemoglobin A1c" }] }
            }
          }]
        }
      ],
      "selectionBehavior": "at-most-one",
      "overrideReasons": [
        { "code": { "code": "already-ordered" }, "display": "Already ordered elsewhere" },
        { "code": { "code": "patient-declined" }, "display": "Patient declined" }
      ]
    },
    {
      "uuid": "card-002",
      "summary": "Retinal exam overdue (14 months)",
      "indicator": "critical",
      "source": { "label": "Diabetes Retinopathy Guideline" },
      "suggestions": [{
        "label": "Refer to Ophthalmology",
        "actions": [{ "type": "create", "resource": { "resourceType": "ServiceRequest", "code": { "text": "Ophthalmology referral" } } }]
      }]
    }
  ],
  "systemActions": []
}
```

---

## Implementation Plan

### Step 1 — CDS Service Registry

```python
# app/cds/registry.py

@dataclass
class CDSService:
    id: str
    hook: str
    title: str
    description: str
    handler: Callable
    prefetch: dict[str, str]

class CDSServiceRegistry:
    def __init__(self):
        self._services: dict[str, CDSService] = {}

    def register(self, service: CDSService):
        self._services[service.id] = service

    def get_discovery(self) -> dict:
        return {"services": [
            {"hook": s.hook, "title": s.title, "description": s.description, "id": s.id, "prefetch": s.prefetch}
            for s in self._services.values()
        ]}

cds_registry = CDSServiceRegistry()
```

### Step 2 — CDS Handlers

```python
# app/cds/services/diabetes_care_gaps.py

async def diabetes_care_gaps_handler(request: CDSHookRequest, session_factory) -> CDSResponse:
    patient = request.prefetch.get("patient", {})
    conditions = request.prefetch.get("conditions", {}).get("entry", [])
    observations = request.prefetch.get("observations", {}).get("entry", [])

    # Is this a diabetic patient?
    has_diabetes = any(
        "44054006" in json.dumps(e.get("resource", {}).get("code", {}))
        for e in conditions
    )
    if not has_diabetes:
        return CDSResponse(cards=[])

    cards = []

    # Check HbA1c
    last_hba1c = observations[0]["resource"] if observations else None
    if not last_hba1c or is_older_than(last_hba1c.get("effectiveDateTime"), months=3):
        cards.append(CDSCard(
            summary="HbA1c overdue",
            indicator="warning",
            suggestions=[{"label": "Order HbA1c", "actions": [create_sr_action("4548-4", "HbA1c")]}],
        ))

    return CDSResponse(cards=cards)

cds_registry.register(CDSService(
    id="diabetes-care-gaps",
    hook="patient-view",
    title="Diabetes Care Gaps",
    description="Identifies missing diabetes screenings",
    handler=diabetes_care_gaps_handler,
    prefetch={
        "patient": "Patient/{{context.patientId}}",
        "conditions": "Condition?patient={{context.patientId}}&clinical-status=active",
        "observations": "Observation?patient={{context.patientId}}&code=4548-4&_sort=-date&_count=1",
    },
))
```

### Step 3 — CDS Router

```python
# app/routers/cds.py

cds_router = APIRouter(prefix="/cds-services", tags=["CDS Hooks"])

@cds_router.get("", operation_id="cds_discovery")
async def discovery():
    return cds_registry.get_discovery()

@cds_router.post("/{service_id}", operation_id="cds_hook_call")
async def cds_hook(service_id: str, body: CDSHookRequest, svc_factory=Depends(get_session_factory)):
    service = cds_registry.get(service_id)
    if not service:
        raise HTTPException(404, f"CDS service {service_id} not found")
    # Fill missing prefetch from FHIR server
    await fill_prefetch(body, service.prefetch, svc_factory)
    result = await service.handler(body, svc_factory)
    return result.dict()
```

---

## AI-Enhanced CDS Cards

Combine CDS Hooks with our `$ai` operation for dynamic, context-aware recommendations:

```python
async def ai_enhanced_cds_handler(request: CDSHookRequest, session_factory) -> CDSResponse:
    patient_context = build_context_from_prefetch(request.prefetch)
    ai_recommendation = await ai_client.complete(
        model="claude-sonnet-4-6",
        system=f"""You are a clinical decision support system. 
        Return clinical recommendations in JSON format with fields:
        summary, detail, indicator (info/warning/critical), and optional order suggestions.
        Patient context: {json.dumps(patient_context)}""",
        prompt="Based on this patient's data, what are the most important clinical actions?",
    )
    # Parse AI response into CDS Cards
    return parse_ai_to_cards(ai_recommendation)
```
