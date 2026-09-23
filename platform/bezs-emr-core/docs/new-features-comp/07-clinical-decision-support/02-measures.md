# FHIR Measures — Quality Measure Evaluation

**FHIR Spec:** https://www.hl7.org/fhir/R4/measure.html  
**CQL:** https://cql.hl7.org/

---

## What Are FHIR Measures?

FHIR Measures are computable definitions of quality metrics used in value-based care:
- CMS pay-for-performance programs (MIPS, APM)
- HEDIS measures (preventive care gaps)
- Joint Commission accreditation requirements
- Population health dashboards

A `Measure` resource defines the logic. `MeasureReport` contains the results for a patient or population.

---

## Common Quality Measures

| Measure | CMS ID | Description |
|---|---|---|
| Diabetes HbA1c Control | CMS122 | % of diabetic patients with HbA1c < 9% |
| Controlling High Blood Pressure | CMS165 | % of hypertensive patients with BP < 140/90 |
| Breast Cancer Screening | CMS125 | % of women 50-74 with mammogram |
| Colorectal Cancer Screening | CMS130 | % of adults 50-75 with screening |
| Child Immunization Status | CMS117 | % of children with complete immunizations |
| Depression Screening | CMS2 | % of patients screened for depression |
| Medication Reconciliation | CMS50 | % of transitions with medication reconciliation |

---

## Measure Resource

```json
{
  "resourceType": "Measure",
  "id": "measure-diabetes-hba1c",
  "url": "http://example.org/Measure/diabetes-hba1c",
  "name": "DiabetesHbA1cControl",
  "title": "Diabetes HbA1c Control",
  "status": "active",
  "scoring": { "coding": [{ "code": "proportion" }] },
  "population": [
    {
      "code": { "coding": [{ "code": "initial-population" }] },
      "criteria": {
        "language": "text/fhirpath",
        "expression": "Patient.condition.where(code.coding.code = '44054006').exists() and Patient.age >= 18 and Patient.age <= 75"
      }
    },
    {
      "code": { "coding": [{ "code": "denominator" }] },
      "criteria": {
        "language": "text/fhirpath",
        "expression": "initial-population"
      }
    },
    {
      "code": { "coding": [{ "code": "numerator" }] },
      "criteria": {
        "language": "text/fhirpath",
        "expression": "Patient.observation.where(code.coding.code = '4548-4' and effective > today() - 1 year and value.ofType(Quantity).value < 9).exists()"
      }
    }
  ]
}
```

---

## `Measure/$evaluate-measure` Operation

```
POST /Measure/measure-diabetes-hba1c/$evaluate-measure
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "periodStart", "valueDate": "2024-01-01" },
    { "name": "periodEnd", "valueDate": "2024-12-31" },
    { "name": "reportType", "valueCode": "population" },
    { "name": "subject", "valueString": "Group/group-my-diabetic-patients" }
  ]
}
```

**Response — MeasureReport:**
```json
{
  "resourceType": "MeasureReport",
  "status": "complete",
  "type": "summary",
  "measure": "http://example.org/Measure/diabetes-hba1c",
  "period": { "start": "2024-01-01", "end": "2024-12-31" },
  "group": [{
    "population": [
      { "code": { "coding": [{ "code": "initial-population" }] }, "count": 312 },
      { "code": { "coding": [{ "code": "denominator" }] }, "count": 295 },
      { "code": { "coding": [{ "code": "numerator" }] }, "count": 241 }
    ],
    "measureScore": { "value": 0.817 }
  }]
}
```

Score = 241/295 = 81.7% — above the national average of 74%.

---

## Implementation Plan

### Step 1 — Measure Repository

Add standard CRUD for `Measure` and `MeasureReport` resources.

### Step 2 — Measure Evaluator

```python
# app/services/measure_evaluation_service.py

class MeasureEvaluationService:
    async def evaluate(
        self,
        measure_id: int,
        period_start: date,
        period_end: date,
        report_type: str,
        subject: str | None,
        user_id: str,
        org_id: str,
    ) -> dict:
        measure = await self.measure_repo.get(measure_id, user_id, org_id)
        populations = measure.get("population", [])

        # Evaluate each population
        counts = {}
        for pop in populations:
            code = pop["code"]["coding"][0]["code"]
            expr = pop["criteria"]["expression"]
            subjects = await self._eval_population(expr, period_start, period_end, org_id)
            counts[code] = len(subjects)

        numerator = counts.get("numerator", 0)
        denominator = counts.get("denominator", 1)
        score = numerator / denominator if denominator > 0 else 0

        # Create MeasureReport
        report = await self.measure_report_repo.create({
            "status": "complete",
            "type": report_type,
            "measure": f"Measure/{measure['id']}",
            "period": {"start": period_start.isoformat(), "end": period_end.isoformat()},
            "group": [{"population": [
                {"code": {"coding": [{"code": k}]}, "count": v}
                for k, v in counts.items()
            ], "measureScore": {"value": score}}],
        }, user_id, org_id)
        return to_fhir_measure_report(report)

    async def _eval_population(self, fhirpath_expr: str, start: date, end: date, org_id: str) -> list:
        """Evaluate FHIRPath expression against all patients in org, return matching patient IDs."""
        all_patients = await self.patient_repo.list_all(org_id=org_id)
        matching = []
        for patient in all_patients:
            fhir = to_fhir_patient(patient)
            enriched = await self._enrich_with_clinical_data(fhir, patient.id, org_id, start, end)
            result = fhirpath_eval(fhirpath_expr, enriched)
            if result and result[0]:
                matching.append(patient)
        return matching
```

### Step 3 — Router

```python
@router.post("/Measure/{measure_id}/$evaluate-measure", operation_id="evaluate_measure")
async def evaluate_measure(
    measure_id: int,
    body: dict,
    request: Request,
    svc=Depends(get_measure_evaluation_service),
):
    period_start = date.fromisoformat(get_param(body, "periodStart"))
    period_end = date.fromisoformat(get_param(body, "periodEnd"))
    report_type = get_param(body, "reportType") or "summary"
    result = await svc.evaluate(measure_id, period_start, period_end, report_type, ...)
    return JSONResponse(result)
```

---

## Population Health Dashboard

With `$evaluate-measure` implemented, we can build a population health dashboard:

```
GET /Measure/$evaluate-all?reportType=summary&periodStart=2024-01-01&periodEnd=2024-12-31
→ Runs all active Measures for the organization
→ Returns a collection of MeasureReports
→ Feeds a quality dashboard showing performance on every measure
```

---

## HEDIS Measure Library

Pre-built HEDIS measure definitions:

```python
HEDIS_MEASURES = {
    "CBP":    "Controlling High Blood Pressure",
    "CDC":    "Comprehensive Diabetes Care",
    "BCS":    "Breast Cancer Screening",
    "CCS":    "Cervical Cancer Screening",
    "COL":    "Colorectal Cancer Screening",
    "WCV":    "Well-Child Visits",
    "W15":    "Well-Child Visits 15 Months",
    "AMR":    "Asthma Medication Ratio",
    "ART":    "Disease-Modifying Anti-Rheumatic Drug Therapy",
    "MRP":    "Medication Reconciliation Post-Discharge",
}
```

Seed these as `Measure` resources on organization setup.
