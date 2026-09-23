# CPOE — Computerized Physician Order Entry

**FHIR Resources:** `ServiceRequest`, `MedicationRequest`, `DeviceRequest`, `NutritionOrder`, `Task`  
**Regulatory:** ONC 2015 Edition CPOE certification criteria (§170.315(a)(1)–(a)(4))

---

## What Is CPOE?

CPOE (Computerized Physician Order Entry) is the electronic system through which clinicians place clinical orders — eliminating handwritten orders and enabling decision support at the point of ordering. CPOE covers:

| Order Type | FHIR Resource |
|---|---|
| Medication orders | `MedicationRequest` |
| Lab orders | `ServiceRequest` (category=laboratory) |
| Imaging orders | `ServiceRequest` (category=imaging) |
| Procedure orders | `ServiceRequest` or `Procedure` |
| Diet orders | `NutritionOrder` |
| Device orders (oxygen, wheelchair, CPAP) | `DeviceRequest` |
| Referral orders | `ServiceRequest` (intent=referral) |
| Nursing orders | `ServiceRequest` (category=nursing) |

---

## CPOE Architecture

```
Clinician enters order in UI
         ↓
CPOE Service validates order:
  - Drug-allergy check (AllergyIntolerance)
  - Drug-drug interaction check (external formulary)
  - Dose range check (formulary + weight-based)
  - Duplicate order check (existing active orders)
  - Prior auth check (insurance coverage)
         ↓
CDS Hooks fire (order-select, order-sign)
         ↓
Clinician acknowledges alerts / proceeds
         ↓
Order signed → FHIR resource created (status: active)
         ↓
Fulfillment routed to appropriate department:
  - Lab → Lab Information System (LIS)
  - Imaging → Radiology Information System (RIS) / PACS
  - Pharmacy → Pharmacy dispensing system
  - Nursing → Nursing task board
```

---

## Order Sets

An **order set** is a group of pre-configured orders that clinicians can apply all at once — e.g., "Chest Pain Workup" orders ECG, troponin, CXR, aspirin, morphine PRN.

FHIR models order sets using `PlanDefinition` (type=order-set):

```json
{
  "resourceType": "PlanDefinition",
  "id": "chest-pain-workup",
  "status": "active",
  "type": { "coding": [{ "code": "order-set" }] },
  "title": "Chest Pain Workup — ED Protocol",
  "action": [
    {
      "title": "12-Lead ECG",
      "code": [{ "coding": [{ "system": "http://www.ama-assn.org/go/cpt", "code": "93000" }] }],
      "resource": { "reference": "ActivityDefinition/ecg-stat" }
    },
    {
      "title": "Troponin (High Sensitivity)",
      "code": [{ "coding": [{ "system": "http://loinc.org", "code": "89579-7" }] }],
      "resource": { "reference": "ActivityDefinition/troponin-hs" }
    },
    {
      "title": "Aspirin 325mg PO x1",
      "resource": { "reference": "ActivityDefinition/aspirin-325" }
    },
    {
      "title": "Chest X-Ray (PA + Lateral)",
      "code": [{ "coding": [{ "system": "http://www.ama-assn.org/go/cpt", "code": "71046" }] }],
      "resource": { "reference": "ActivityDefinition/cxr-pa-lat" }
    }
  ]
}
```

### `$apply` to Instantiate Order Set

```
POST /PlanDefinition/chest-pain-workup/$apply
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "subject", "valueReference": { "reference": "Patient/10001" } },
    { "name": "encounter", "valueReference": { "reference": "Encounter/20001" } },
    { "name": "practitioner", "valueReference": { "reference": "Practitioner/30001" } }
  ]
}

Response: Bundle of draft ServiceRequests + MedicationRequests to review/confirm
```

---

## CPOE Service Implementation

```python
# app/services/cpoe_service.py

class CPOEService:
    async def submit_order(
        self,
        order: dict,
        user_id: str,
        org_id: str,
        bypass_alerts: list[str] = None,
    ) -> dict:
        """
        Submit a clinical order through the full CPOE pipeline.
        Returns the created FHIR resource or a list of alerts to acknowledge.
        """
        patient_id = self._extract_patient_id(order)
        resource_type = order.get("resourceType")

        # Run pre-order checks
        alerts = await self._run_order_checks(order, patient_id, user_id, org_id)

        # Filter out acknowledged alerts
        unacknowledged = [a for a in alerts if a["id"] not in (bypass_alerts or [])]
        critical = [a for a in unacknowledged if a["severity"] == "critical"]

        if critical:
            # Hard stop — cannot bypass critical alerts
            return {"status": "blocked", "alerts": critical}
        if unacknowledged:
            # Soft stop — return alerts for acknowledgement
            return {"status": "requires_acknowledgement", "alerts": unacknowledged}

        # All checks passed — create the order
        created = await self._create_order(resource_type, order, user_id, org_id)

        # Route to fulfillment system
        await self._route_to_fulfillment(created, resource_type)

        return {"status": "submitted", "resource": to_fhir(created)}

    async def _run_order_checks(self, order: dict, patient_id: int, user_id: str, org_id: str) -> list:
        alerts = []

        # Drug-allergy interaction check
        if order.get("resourceType") == "MedicationRequest":
            drug_code = self._extract_drug_code(order)
            allergies = await self.allergy_repo.list(user_id, org_id, patient_id=patient_id)
            for allergy in allergies:
                if await self.drug_interaction_svc.check_allergy(drug_code, allergy):
                    alerts.append({
                        "id": f"allergy-{allergy.allergy_intolerance_id}",
                        "severity": "critical",
                        "type": "allergy",
                        "message": f"ALLERGY ALERT: {allergy.code_text} — Cannot prescribe {drug_code}",
                    })

        # Duplicate order check
        existing = await self._find_duplicate_order(order, patient_id, user_id, org_id)
        if existing:
            alerts.append({
                "id": f"duplicate-{existing.id}",
                "severity": "warning",
                "type": "duplicate",
                "message": f"Duplicate order: {order.get('code', {}).get('text', '')} already ordered (active)",
            })

        # Prior auth check
        if await self.pa_checker.needs_prior_auth(order):
            alerts.append({
                "id": "prior-auth-required",
                "severity": "info",
                "type": "prior-auth",
                "message": "This order may require prior authorization from the patient's insurance.",
            })

        return alerts

    async def _route_to_fulfillment(self, resource, resource_type: str):
        """Route completed order to the appropriate department system."""
        if resource_type == "MedicationRequest":
            await self.pharmacy_interface.send_new_rx(resource)
        elif resource_type == "ServiceRequest":
            category = resource.category_code or ""
            if "laboratory" in category:
                await self.lis_interface.send_lab_order(resource)
            elif "imaging" in category:
                await self.ris_interface.send_imaging_order(resource)
            else:
                await self.task_service.create_fulfillment_task(resource)
```

---

## Drug-Drug Interaction Check

```python
class DrugInteractionService:
    """Check for drug interactions using RxNav API or local DB."""

    async def check_interactions(self, rxnorm_codes: list[str]) -> list[dict]:
        """Check all active medications for interactions with new drug."""
        # Use NLM RxNav Drug Interaction API
        async with aiohttp.ClientSession() as session:
            codes_param = "+".join(rxnorm_codes)
            async with session.get(
                f"https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={codes_param}"
            ) as resp:
                data = await resp.json()

        interactions = []
        for group in data.get("fullInteractionTypeGroup", []):
            for interaction_type in group.get("fullInteractionType", []):
                severity = interaction_type.get("comment", "")
                interactions.append({
                    "severity": "critical" if "contraindicated" in severity.lower() else "warning",
                    "drugs": [m.get("name") for m in interaction_type.get("minConcept", [])],
                    "description": interaction_type.get("comment", ""),
                })
        return interactions
```

---

## Dose Range Checking

```python
async def check_dose_range(
    self,
    rxnorm_code: str,
    dose_value: float,
    dose_unit: str,
    patient_id: int,
) -> dict | None:
    """Verify dose is within safe range for this patient."""
    patient = await self.patient_repo.get_by_id(patient_id)

    # Get dose range from formulary (local DB or external)
    range_data = await self.formulary_service.get_dose_range(rxnorm_code, patient.weight_kg)
    if not range_data:
        return None

    normalized_dose = convert_to_mg(dose_value, dose_unit)
    if normalized_dose > range_data["max_single_dose_mg"]:
        return {
            "severity": "warning",
            "type": "dose-high",
            "message": f"Dose {dose_value}{dose_unit} exceeds maximum single dose of {range_data['max_single_dose_mg']}mg for this patient (weight: {patient.weight_kg}kg)",
        }
    if normalized_dose < range_data["min_dose_mg"]:
        return {
            "severity": "info",
            "type": "dose-low",
            "message": f"Dose {dose_value}{dose_unit} is below typical therapeutic range of {range_data['min_dose_mg']}mg",
        }
    return None
```

---

## CPOE API Endpoints

```python
# POST /cpoe/orders — Submit order through CPOE pipeline (with CDS checks)
# POST /cpoe/orders/{type}/{id}/$acknowledge — Acknowledge a specific alert and resubmit
# POST /PlanDefinition/{id}/$apply — Instantiate order set
# GET /cpoe/order-sets — List available order sets
# GET /cpoe/formulary?q=metformin — Search formulary for drug info
# GET /cpoe/drug-interactions?rxnorm=860975,29046 — Check interactions
```

---

## ONC Certification Requirements

For CPOE certification under ONC 2015 Edition:

| Requirement | Status |
|---|---|
| Medication CPOE with CDS | Must implement |
| Lab order CPOE | Must implement |
| Diagnostic imaging CPOE | Must implement |
| Inpatient (§170.315(a)(1)) | Required for hospitals |
| Ambulatory (§170.315(a)(4)) | Required for clinic certification |
| Drug-drug interaction checking | Must fire and be acknowledged |
| Drug-allergy interaction checking | Must fire and be acknowledged |
| Drug formulary and preferred drug list | Must integrate with payer formulary |

---

## Estimated Effort

| Component | Days |
|---|---|
| `CPOEService` with validation pipeline | 3 |
| Drug-allergy check | 1 |
| Drug-drug interaction (RxNav) | 2 |
| Dose range checking | 2 |
| Duplicate order detection | 1 |
| Order set `PlanDefinition/$apply` | 2 |
| Pharmacy / LIS / RIS routing stubs | 2 |
| CPOE API routes | 1 |
| ONC test scripts | 2 |
| **Total** | **16 days** |
