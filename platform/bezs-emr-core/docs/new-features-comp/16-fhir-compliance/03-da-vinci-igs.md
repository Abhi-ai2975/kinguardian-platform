# Da Vinci Implementation Guides — Payer-Provider Exchange

**Da Vinci Project:** https://www.hl7.org/about/davinci/  
**Regulatory Basis:** CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F, January 2024)

---

## What Is the Da Vinci Project?

Da Vinci is an HL7 FHIR accelerator project that develops IGs specifically for **payer-provider data exchange** — solving the administrative burden between insurance companies and healthcare providers. The IGs are:

- Focused on US healthcare payer-provider interoperability
- Required by CMS rules (starting 2026-2027)
- Designed to reduce prior auth burden, streamline documentation, and enable value-based care

---

## Required Da Vinci IGs

| IG | Full Name | Purpose | CMS Deadline |
|---|---|---|---|
| **CRD** | Coverage Requirements Discovery | Payer tells provider what rules apply at order time | Jan 1, 2026 |
| **DTR** | Documentation Templates and Rules | Payer specifies what documentation is needed | Jan 1, 2026 |
| **PAS** | Prior Authorization Support | Submit PA requests in FHIR | Jan 1, 2027 |
| **PDex** | Payer Data Exchange | Patient data portability between payers | Jan 1, 2026 |
| **ATR** | Member Attribution List | Payer sends attributed member lists to ACOs | Jan 1, 2026 |
| **DEQM** | Data Exchange for Quality Measures | Submit quality measure data to payers | — |

This server needs at minimum: **CRD + DTR + PAS** for provider-side compliance.

---

## Coverage Requirements Discovery (CRD)

**IG:** https://hl7.org/fhir/us/davinci-crd/  
**Goal:** At the time a provider creates an order, the payer immediately tells them if prior auth is required, what documentation is needed, and whether alternatives are covered.

### How It Works

CRD uses **CDS Hooks** as the transport mechanism:

```
Provider creates order in EMR (e.g., MRI Brain)
    ↓
CDS Hooks fires → order-sign hook
    ↓
EMR sends CDS Hooks request to Payer's CRD endpoint
    ↓
Payer looks up coverage rules in real-time
    ↓
Payer responds with CDS Cards:
  Card 1: "Prior authorization required — click to submit"
  Card 2: "Alternative covered without PA: MRI Brain w/o contrast (CPT 70551)"
  Card 3: "Order requires ICD-10 code in Z category — add Z code"
```

### CRD Implementation

```python
# Our EMR acts as CDS Hooks client

class CRDClient:
    """Calls payer's CRD endpoint via CDS Hooks protocol."""

    async def check_coverage(
        self,
        order: dict,
        patient_id: int,
        coverage_id: int,
        user_id: str,
        org_id: str,
    ) -> list[dict]:
        patient = await self.patient_repo.get(patient_id, user_id, org_id)
        coverage = await self.coverage_repo.get(coverage_id, user_id, org_id)
        payer_crd_url = await self.payer_registry.get_crd_url(coverage.payer_organization_id)

        if not payer_crd_url:
            return []  # Payer doesn't support CRD

        # Build CDS Hooks request
        cds_request = {
            "hookInstance": str(uuid.uuid4()),
            "hook": "order-sign",
            "context": {
                "userId": f"Practitioner/{user_id}",
                "patientId": f"Patient/{patient.patient_id}",
                "encounterId": order.get("encounter_id"),
                "draftOrders": {
                    "resourceType": "Bundle",
                    "type": "collection",
                    "entry": [{"resource": order}]
                },
            },
            "prefetch": {
                "patient": to_fhir_patient(patient),
                "coverage": to_fhir_coverage(coverage),
            },
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{payer_crd_url}/cds-services/coverage-requirements-discovery",
                json=cds_request,
                headers={"Authorization": f"Bearer {await self._get_payer_token(coverage.payer_id)}"},
                timeout=aiohttp.ClientTimeout(total=5),  # CRD must respond fast
            ) as resp:
                response = await resp.json()

        return response.get("cards", [])
```

### Payer Response Cards

```json
{
  "cards": [
    {
      "uuid": "abc123",
      "summary": "Prior Authorization Required",
      "detail": "An MRI of the Brain with contrast (CPT 70553) requires prior authorization for this patient's plan.",
      "indicator": "critical",
      "source": { "label": "Blue Cross PA Requirements", "url": "https://bcbs.example.org/pa-policy" },
      "suggestions": [
        {
          "label": "Submit Prior Authorization",
          "actions": [{
            "type": "create",
            "description": "Create prior auth Claim",
            "resource": { "resourceType": "Claim", "use": "preauthorization", ... }
          }]
        }
      ],
      "links": [
        { "label": "Launch DTR App", "url": "https://payer.example.org/dtr?launch=...", "type": "smart" }
      ]
    },
    {
      "uuid": "def456",
      "summary": "Alternative without PA",
      "detail": "MRI Brain without contrast (CPT 70551) is covered without prior authorization for this indication.",
      "indicator": "info",
      "suggestions": [
        {
          "label": "Switch to MRI without contrast",
          "actions": [{
            "type": "update",
            "description": "Update order to CPT 70551",
            "resource": { "resourceType": "ServiceRequest", "code": { "coding": [{ "code": "70551" }] } }
          }]
        }
      ]
    }
  ]
}
```

---

## Documentation Templates and Rules (DTR)

**IG:** https://hl7.org/fhir/us/davinci-dtr/  
**Goal:** When PA is needed, payer provides a SMART app that launches inside the EMR, pre-fills documentation from the patient's FHIR data, and guides the provider through completing the required prior auth forms.

### How DTR Works

```
CRD Card contains a SMART app link: "Launch DTR App"
    ↓
Provider clicks → SMART app launches in embedded iframe in EMR
    ↓
DTR app calls EMR FHIR API to prefetch patient data
    ↓
DTR app renders a Questionnaire (payer-provided)
    ↓
DTR auto-populates answers from FHIR data:
  - Diagnosis codes from Condition resources
  - Lab values from Observation resources
  - Prior treatments from Procedure resources
    ↓
Provider reviews and signs
    ↓
QuestionnaireResponse submitted to payer API
    ↓
PA decision returned or forwarded to PA system
```

### DTR FHIR Requirements

Our server must support these DTR FHIR interactions:

```python
# DTR App needs to call:
GET /Patient/{id}                           # Patient demographics
GET /Condition?patient={id}&status=active   # Active diagnoses
GET /Observation?patient={id}&category=laboratory&code={loinc}  # Lab values
GET /Procedure?patient={id}&date=gt{date}   # Recent procedures
GET /Coverage?patient={id}                  # Insurance info
POST /QuestionnaireResponse                 # Save completed DTR form
```

Our FHIR API must support **SMART on FHIR app launch** for DTR to function — the payer's DTR app needs to authenticate with our server using SMART launch.

---

## Prior Authorization Support (PAS)

**IG:** https://hl7.org/fhir/us/davinci-pas/  
**Goal:** Standardize PA request/response format using FHIR (vs. X12 278).

This is covered in detail in `15-emr-workflows/02-prior-authorization.md`. Key additions for full PAS compliance:

### PAS-Specific Profiles

PAS uses US Core profiles but with additional constraints:

| Profile | Description |
|---|---|
| `PASClaim` | US Core Claim + PA-specific extensions (pa-number, item PA status) |
| `PASClaimResponse` | US Core ClaimResponse + decision explanation |
| `PASServiceRequest` | US Core ServiceRequest + clinical documentation links |
| `PASCoverage` | Coverage with member/group numbers |

### PAS Compliance Requirements

- [ ] `POST /Claim/$submit` accepts PAS-profiled Bundles
- [ ] Returns `PASClaimResponse` with `preAuthRef`
- [ ] Supports `PA-Update` for updates to pending PA
- [ ] Supports `Cancel-Request` for PA cancellations
- [ ] Logs all PA transactions to AuditEvent
- [ ] Supports polling via `ClaimResponse` GET

---

## Payer Data Exchange (PDex)

**IG:** https://hl7.org/fhir/us/davinci-pdex/  
**Goal:** Allow patients to receive their insurance claims data + clinical data from payers in FHIR format, and allow new payers to receive it when patients switch plans.

### PDex Implementation (Patient Perspective)

```
Patient switches from Blue Cross to Aetna
    ↓
Patient authorizes Aetna to receive their data from Blue Cross
    ↓
Aetna calls Blue Cross's PDex endpoint:
  GET /fhir/Patient/$member-match (find patient by demographics)
  GET /fhir/Patient/{id}/$everything (pull all clinical data)
    ↓
Aetna imports patient history
```

Our server's role: serve patient FHIR data when authorized by patient via OAuth2.

**Required:** `Patient/$everything` operation (covered in `01-fhir-operations/03-patient-operations.md`)

---

## Da Vinci Compliance Roadmap

### Phase 1 — CRD Client (6 weeks)

```
Week 1-2: Payer CRD endpoint registry
Week 2-3: CDS Hooks client for order-sign + order-select
Week 4-5: CRD card display in order workflow
Week 6:   Testing with payer sandbox environments
```

### Phase 2 — DTR Support (4 weeks)

```
Week 7-8:  SMART app launch support (from section 02-auth)
Week 9:    DTR FHIR API access patterns (ensure all queries work)
Week 10:   QuestionnaireResponse as DTR output
```

### Phase 3 — PAS (6 weeks)

```
Week 11-12: PASClaim + PASClaimResponse profiles
Week 13-14: $submit operation + X12 gateway
Week 15-16: PA tracking workflow + notifications
```

### Phase 4 — Testing + Certification (4 weeks)

```
Week 17-18: Da Vinci Reference Implementation testing
Week 19-20: CMS certification testing via Touchstone or Aegis
```

---

## Testing Tools

| Tool | Purpose |
|---|---|
| Touchstone (AEGIS) | Da Vinci conformance testing |
| CMS CCSQ FHIR Sandbox | CMS API testing environment |
| Inferno Da Vinci Test Suite | Automated CRD/DTR/PAS validation |
| Reference Payer (Da Vinci RI) | Test against open-source payer implementation |

---

## Estimated Total Effort

| IG | Effort |
|---|---|
| CRD Client | 3 weeks |
| DTR Support | 2 weeks |
| PAS (full implementation) | 4 weeks |
| PDex `$everything` + OAuth | 2 weeks |
| Testing + certification | 4 weeks |
| **Total** | **~15 weeks** |

Note: Da Vinci certification requires coordination with HL7/CMS testing events — plan for a 6-month certification timeline even with implementation complete.
