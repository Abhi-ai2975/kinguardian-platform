# PlanDefinition — Protocol-Driven Clinical Automation

**FHIR Spec:** https://www.hl7.org/fhir/R4/plandefinition.html  
**Medplum reference:** `packages/server/src/fhir/operations/plandefinitionapply.ts`

---

## What Is PlanDefinition?

`PlanDefinition` is a FHIR resource that represents a shareable, computable definition of a clinical  
protocol, care pathway, or order set. When *applied* via `$apply`, it produces a `CarePlan` or  
`RequestGroup` with concrete tasks, orders, and activities.

Examples:
- Diabetes management protocol → produces annual HbA1c, eye exam, foot exam orders
- Sepsis bundle → produces blood culture, lactate, antibiotic orders within 3 hours
- Preventive care checklist → produces screening recommendations based on patient age/gender
- CMS Quality Measure → produces measure outcome via data collection activities

---

## PlanDefinition Resource

```json
{
  "resourceType": "PlanDefinition",
  "id": "pd-diabetes-annual-review",
  "name": "DiabetesAnnualReview",
  "title": "Annual Diabetes Review Protocol",
  "type": { "coding": [{ "code": "clinical-protocol" }] },
  "status": "active",
  "action": [
    {
      "title": "HbA1c Test",
      "description": "Order HbA1c if not done in past 3 months",
      "condition": [{
        "kind": "applicability",
        "expression": {
          "language": "text/fhirpath",
          "expression": "%resource.getObservation('2345-7', 90).empty()"
        }
      }],
      "definitionCanonical": "ActivityDefinition/order-hba1c"
    },
    {
      "title": "Retinal Exam",
      "description": "Order annual retinal exam",
      "timing": { "duration": 1, "durationUnit": "a" },
      "definitionCanonical": "ActivityDefinition/order-retinal-exam"
    },
    {
      "title": "Foot Exam",
      "description": "Order annual foot exam",
      "definitionCanonical": "ActivityDefinition/order-foot-exam"
    },
    {
      "title": "Blood Pressure Check",
      "description": "Ensure BP < 140/90 in past 6 months",
      "condition": [{
        "kind": "applicability",
        "expression": {
          "language": "text/fhirpath",
          "expression": "%resource.getVitals('8462-4', 180).empty()"
        }
      }],
      "definitionCanonical": "ActivityDefinition/bp-check"
    }
  ]
}
```

---

## `PlanDefinition/$apply` Operation

```
POST /PlanDefinition/pd-diabetes-annual-review/$apply
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "subject", "valueReference": { "reference": "Patient/10001" } },
    { "name": "encounter", "valueReference": { "reference": "Encounter/20001" } },
    { "name": "practitioner", "valueReference": { "reference": "Practitioner/30001" } }
  ]
}
```

**Response:**
```json
{
  "resourceType": "CarePlan",
  "status": "draft",
  "intent": "proposal",
  "subject": { "reference": "Patient/10001" },
  "activity": [
    {
      "detail": {
        "kind": "ServiceRequest",
        "code": { "coding": [{ "system": "http://loinc.org", "code": "4548-4", "display": "Hemoglobin A1c" }] },
        "status": "not-started"
      }
    },
    {
      "detail": {
        "kind": "ServiceRequest",
        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "252779009", "display": "Retinal examination" }] },
        "status": "not-started"
      }
    }
  ]
}
```

---

## ActivityDefinition

Each action in a PlanDefinition references an `ActivityDefinition` — the blueprint for creating orders:

```json
{
  "resourceType": "ActivityDefinition",
  "id": "order-hba1c",
  "name": "OrderHbA1c",
  "title": "Order HbA1c",
  "kind": "ServiceRequest",
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "4548-4", "display": "Hemoglobin A1c" }]
  },
  "intent": "original-order",
  "priority": "routine",
  "timing": { "repeat": { "duration": 3, "durationUnit": "mo", "frequency": 1, "period": 3, "periodUnit": "mo" } }
}
```

---

## Implementation Plan

### Step 1 — PlanDefinition and ActivityDefinition Repositories

Add standard CRUD for these FHIR resources (they're already in our resource list via ServiceRequest/CarePlan).

### Step 2 — `$apply` Service

```python
# app/services/plan_definition_service.py

class PlanDefinitionService:
    async def apply(
        self,
        plan_def_id: int,
        subject_ref: str,
        encounter_ref: str | None,
        practitioner_ref: str | None,
        user_id: str,
        org_id: str,
    ) -> dict:
        plan_def = await self.plan_def_repo.get(plan_def_id, user_id, org_id)
        patient_id = int(subject_ref.split("/")[1])
        patient_context = await self._build_patient_context(patient_id, user_id, org_id)

        activities = []
        for action in plan_def.get("action", []):
            # Evaluate applicability conditions
            if not await self._eval_conditions(action.get("condition", []), patient_context):
                continue
            # Create the activity
            activity = await self._apply_action(action, subject_ref, encounter_ref, practitioner_ref)
            activities.append(activity)

        # Create CarePlan
        care_plan = await self.care_plan_repo.create({
            "status": "draft",
            "intent": "proposal",
            "subject": { "reference": subject_ref },
            "encounter": { "reference": encounter_ref } if encounter_ref else None,
            "activity": activities,
            "instantiatesCanonical": [f"PlanDefinition/{plan_def['id']}"],
        }, user_id, org_id)
        return to_fhir_care_plan(care_plan)

    async def _eval_conditions(self, conditions: list, context: dict) -> bool:
        for cond in conditions:
            if cond["kind"] == "applicability":
                expr = cond["expression"]["expression"]
                result = fhirpath_eval(expr, context)
                if not result:
                    return False
        return True
```

### Step 3 — Router

```python
@router.post("/PlanDefinition/{plan_def_id}/$apply", operation_id="apply_plan_definition")
async def apply_plan_definition(
    plan_def_id: int,
    body: dict,
    request: Request,
    svc=Depends(get_plan_def_service),
):
    subject = get_param(body, "subject")
    encounter = get_param(body, "encounter")
    practitioner = get_param(body, "practitioner")
    result = await svc.apply(plan_def_id, subject, encounter, practitioner, ...)
    return JSONResponse(result, status_code=201)
```

---

## Order Sets

PlanDefinition can also represent *order sets* — groups of orders a clinician can place at once:

```json
{
  "resourceType": "PlanDefinition",
  "type": { "coding": [{ "code": "order-set" }] },
  "title": "Sepsis Bundle",
  "action": [
    { "title": "Blood cultures x2", "definitionCanonical": "ActivityDefinition/blood-culture" },
    { "title": "Lactate level", "definitionCanonical": "ActivityDefinition/lactate" },
    { "title": "IV fluids 30mL/kg", "definitionCanonical": "ActivityDefinition/iv-fluids" },
    { "title": "Broad-spectrum antibiotics", "definitionCanonical": "ActivityDefinition/antibiotics-broad" }
  ]
}
```

When `$apply` is called on this, it creates a `RequestGroup` with all orders pre-filled.
