# Charge Capture — From Clinical Event to Billable Charge

**FHIR Resource:** `ChargeItem`  
**Standard:** CPT (Current Procedural Terminology), ICD-10-PCS  
**Integration point:** CDM (Charge Description Master)

---

## What Is Charge Capture?

Charge capture is the process of recording every billable service rendered during a patient encounter — medications given, procedures performed, supplies used, time-based services — so they can be billed to the payer. Missed charges = lost revenue. Incorrect charges = claim denials.

In a FHIR-based EMR, `ChargeItem` is the bridge between clinical documentation and billing.

---

## ChargeItem FHIR Resource

```json
POST /ChargeItem
{
  "resourceType": "ChargeItem",
  "status": "billable",
  "code": {
    "coding": [
      { "system": "http://www.ama-assn.org/go/cpt", "code": "99213", "display": "Office visit, established patient, low complexity" },
      { "system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "E11.9", "display": "Type 2 diabetes mellitus without complications" }
    ]
  },
  "subject": { "reference": "Patient/10001" },
  "context": { "reference": "Encounter/20001" },
  "occurrencePeriod": { "start": "2024-01-15T14:00:00Z", "end": "2024-01-15T14:30:00Z" },
  "performer": [{ "actor": { "reference": "Practitioner/30001" }, "function": { "coding": [{ "code": "AP", "display": "Administering Provider" }] } }],
  "quantity": { "value": 1 },
  "factorOverride": 1.0,
  "priceOverride": { "value": 125.00, "currency": "USD" },
  "enterer": { "reference": "Practitioner/30001" }
}
```

---

## Charge Description Master (CDM)

The CDM maps procedure codes to standard prices. Every organization has a CDM:

```sql
CREATE TABLE charge_description_master (
    id              BIGSERIAL PRIMARY KEY,
    org_id          UUID NOT NULL,
    cpt_code        VARCHAR(10) NOT NULL,
    hcpcs_code      VARCHAR(10),
    description     TEXT NOT NULL,
    standard_price  NUMERIC(12, 2) NOT NULL,
    rev_code        VARCHAR(4),             -- UB-04 revenue code (for facility billing)
    department      VARCHAR(100),
    active          BOOLEAN DEFAULT TRUE,
    effective_date  DATE NOT NULL,
    UNIQUE (org_id, cpt_code, effective_date)
);

-- Sample entries:
-- 99213 | Office Visit, Low Complexity | $125.00
-- 99214 | Office Visit, Moderate Complexity | $185.00
-- 93000 | ECG with interpretation | $95.00
-- 85025 | CBC with differential | $45.00
-- 80053 | Comprehensive metabolic panel | $55.00
```

---

## Automated Charge Capture

Charges should be captured automatically from clinical events — not manually entered:

```python
# app/services/billing/auto_charge_capture.py

class AutoChargeCaptureService:
    """
    Maps clinical FHIR resource creation events to ChargeItem creation.
    Triggered by service events in the resource pipeline.
    """

    PROCEDURE_TO_CPT = {
        # ServiceRequest.code → CPT code
        "70553": "70553",   # MRI Brain with contrast
        "93000": "93000",   # ECG
        "85025": "85025",   # CBC
    }

    ENCOUNTER_TYPE_TO_VISIT_LEVEL = {
        # Determines E&M code based on encounter complexity
        "new-patient-low": "99202",
        "new-patient-moderate": "99203",
        "new-patient-high": "99204",
        "established-low": "99212",
        "established-moderate": "99213",
        "established-high": "99214",
    }

    async def capture_from_service_request(self, service_request: ServiceRequest, org_id: str):
        """When a ServiceRequest is marked 'completed', create a ChargeItem."""
        cpt = self.PROCEDURE_TO_CPT.get(self._extract_code(service_request))
        if not cpt:
            return  # Not a billable procedure in CDM

        cdm_entry = await self.cdm_repo.get(cpt, org_id)
        if not cdm_entry:
            return

        await self.charge_item_service.create({
            "status": "billable",
            "code": {"coding": [{"system": "http://www.ama-assn.org/go/cpt", "code": cpt}]},
            "subject": {"reference": f"Patient/{service_request.patient.patient_id}"},
            "context": {"reference": f"Encounter/{service_request.encounter.encounter_id}"} if service_request.encounter else None,
            "occurrenceDateTime": datetime.utcnow().isoformat() + "Z",
            "priceOverride": {"value": float(cdm_entry.standard_price), "currency": "USD"},
        }, org_id=org_id)

    async def capture_encounter_em_code(self, encounter: Encounter, org_id: str):
        """
        Suggest an E&M code based on encounter documentation.
        Uses MDM (Medical Decision Making) complexity assessment.
        """
        mdm_score = await self._calculate_mdm(encounter)
        visit_type = "new-patient" if encounter.is_new_patient else "established"
        level_key = f"{visit_type}-{mdm_score}"
        cpt = self.ENCOUNTER_TYPE_TO_VISIT_LEVEL.get(level_key, "99213")

        await self.charge_item_service.create({
            "status": "draft",   # Draft — provider must confirm
            "code": {"coding": [{"system": "http://www.ama-assn.org/go/cpt", "code": cpt}]},
            "subject": {"reference": f"Patient/{encounter.patient.patient_id}"},
            "context": {"reference": f"Encounter/{encounter.encounter_id}"},
        }, org_id=org_id)
```

---

## Charge Reconciliation Workflow

Before submitting a Claim, a billing specialist reconciles charges:

```
GET /ChargeItem?context=Encounter/20001&status=billable

Review:
  ✓ 99213 — Office visit (auto-captured)
  ✓ 85025 — CBC (auto-captured from lab order)
  ✗ 36415 — Venipuncture (missed — must add manually)
  ? 99000 — Handling/conveyance (need to confirm)

Provider/biller confirms/modifies
→ All ChargeItems status: "billed"
→ POST /Claim (aggregates all billable ChargeItems)
```

---

## ChargeItem → Claim Aggregation

```python
class ClaimBuilder:
    async def build_from_encounter(self, encounter_id: int, org_id: str) -> dict:
        """Aggregate all billable ChargeItems for an encounter into a single Claim."""
        charges = await charge_item_repo.list(
            org_id=org_id, encounter_id=encounter_id, status="billable"
        )
        patient = charges[0].patient
        encounter = charges[0].encounter
        coverage = await coverage_repo.get_primary(patient.id, org_id)

        items = []
        for i, charge in enumerate(charges, 1):
            items.append({
                "sequence": i,
                "productOrService": charge.code,
                "servicedDate": charge.occurrence_datetime.date().isoformat() if charge.occurrence_datetime else None,
                "quantity": {"value": float(charge.quantity or 1)},
                "unitPrice": {"value": float(charge.price_override.value), "currency": "USD"} if charge.price_override else None,
            })

        return {
            "resourceType": "Claim",
            "status": "active",
            "type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/claim-type", "code": "professional"}]},
            "use": "claim",
            "patient": {"reference": f"Patient/{patient.patient_id}"},
            "created": date.today().isoformat(),
            "provider": {"reference": f"Organization/{org_id}"},
            "insurance": [{"sequence": 1, "focal": True, "coverage": {"reference": f"Coverage/{coverage.coverage_id}"}}],
            "item": items,
        }
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `ChargeItem` FHIR resource (model + CRUD) | 2 |
| CDM table + API | 1 |
| Auto charge capture from ServiceRequest | 1.5 |
| E&M code suggestion from MDM | 2 |
| Charge reconciliation API | 1 |
| ClaimBuilder (ChargeItem → Claim) | 1.5 |
| **Total** | **9 days** |
