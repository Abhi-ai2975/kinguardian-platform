# Lab Results Viewing & Health Records Access

**Regulatory:** ONC 21st Century Cures Act requires immediate (not delayed) patient access to results  
**FHIR Operation:** `Patient/{id}/$everything`

---

## ONC Information Blocking Rule

Since April 2021, providers **cannot** delay releasing lab results to patients through their portal (with narrow exceptions). The old practice of holding results for 5-7 days while a physician calls is now an "information blocking" violation subject to fines up to $1M.

Exceptions (results can be temporarily withheld):
- Patient safety (e.g., positive cancer result with no clinician available to counsel)
- Clinician can add a brief delay (max 3 days) if there's documented clinical reason

---

## Patient Results Dashboard

```
GET /portal/results?patient={portal_patient_id}

Returns aggregated view:
{
  "pending": [
    { "id": 160001, "name": "CBC", "ordered": "2024-01-14", "status": "preliminary" }
  ],
  "available": [
    { "id": 160002, "name": "HbA1c", "value": "8.2%", "date": "2024-01-15", "flag": "high", "reference_range": "< 5.7%" }
  ],
  "imaging": [
    { "id": 110001, "name": "Chest X-Ray", "date": "2024-01-10", "conclusion": "No acute findings", "report_url": "..." }
  ]
}
```

---

## Patient-Scoped Results API

```python
@portal_router.get("/portal/observations")
async def get_patient_observations(
    category: str | None = Query(None),   # "laboratory", "vital-signs", "imaging"
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    _count: int = Query(50),
    request: Request = ...,
):
    user = request.state.user
    patient_internal_id = user["patient_internal_id"]

    # Only returns the authenticated patient's own data
    rows = await observation_repo.list(
        user_id=user["sub"],
        org_id=user["org_id"],
        patient_id=patient_internal_id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        limit=_count,
    )
    return format_paginated_response(request, rows, to_plain_observation, ...)
```

---

## Result Interpretation for Patients

Raw lab values mean nothing to most patients. Add plain-language interpretation:

```python
class PatientResultInterpreter:
    """
    Adds patient-friendly explanations to lab results.
    Uses reference ranges + AI to generate plain-language summaries.
    """

    REFERENCE_RANGES = {
        "4548-4": {"name": "HbA1c", "low": 0, "high": 5.6, "unit": "%",
                   "patient_text": {
                       "normal": "Your blood sugar control is good.",
                       "borderline": "Your blood sugar is a bit high. This is called prediabetes.",
                       "abnormal": "Your blood sugar is too high. This means diabetes is not well-controlled.",
                   }},
        "2339-0": {"name": "Blood Glucose", "low": 70, "high": 99, "unit": "mg/dL",
                   "patient_text": {
                       "low": "Your blood sugar is too low (hypoglycemia).",
                       "normal": "Your blood sugar is normal.",
                       "high": "Your blood sugar is higher than normal.",
                   }},
    }

    def interpret(self, observation: dict) -> dict:
        loinc = self._extract_loinc(observation)
        ref = self.REFERENCE_RANGES.get(loinc)
        if not ref:
            return observation

        value = observation.get("valueQuantity", {}).get("value")
        if value is None:
            return observation

        if value < ref["low"]:
            status = "low" if "low" in ref["patient_text"] else "abnormal"
            flag = "L"
        elif value > ref["high"]:
            status = "high" if "high" in ref["patient_text"] else "abnormal"
            flag = "H"
        else:
            status = "normal"
            flag = "N"

        observation["_patient_interpretation"] = {
            "flag": flag,
            "status": status,
            "plain_text": ref["patient_text"].get(status, ""),
            "reference_range": f"{ref['low']}–{ref['high']} {ref['unit']}",
        }
        return observation
```

---

## Health Record Download — Patient Access Final Rule

Patients have the right to download their complete records in FHIR format. This is required by the Patient Access Final Rule:

```python
@portal_router.get("/portal/my-records")
async def download_my_records(
    format: str = Query("fhir", description="fhir | pdf | ccda"),
    request: Request = ...,
):
    user = request.state.user
    patient_id = user["patient_id"]

    if format == "fhir":
        # $everything operation — returns all patient data as Bundle
        bundle = await patient_everything_service.get_everything(
            patient_id=patient_id,
            org_id=user["org_id"],
            user_id=user["sub"],
        )
        return JSONResponse(bundle, media_type="application/fhir+json",
                           headers={"Content-Disposition": f"attachment; filename=health-records-{patient_id}.json"})

    elif format == "ccda":
        # C-CDA XML export (see section 08)
        ccda = await ccda_service.generate_ccd(patient_id, user["org_id"])
        return Response(ccda, media_type="application/xml",
                       headers={"Content-Disposition": f"attachment; filename=health-summary-{patient_id}.xml"})

    elif format == "pdf":
        # Human-readable PDF
        pdf = await pdf_service.generate_health_summary(patient_id, user["org_id"])
        return Response(pdf, media_type="application/pdf",
                       headers={"Content-Disposition": f"attachment; filename=health-summary-{patient_id}.pdf"})
```

---

## Notification on New Results

When a lab result is finalized, notify the patient:

```python
# In ObservationService.create() / patch() when status → final:
async def _notify_patient_of_result(self, observation: Observation):
    patient = observation.patient
    result_name = observation.code_text or "Lab Result"

    # 1. Portal notification (badge/bell)
    await self.portal_notification_service.create({
        "patient_id": patient.patient_id,
        "type": "new_result",
        "title": f"New result: {result_name}",
        "body": "Your results are available. Log in to view them.",
        "link": f"/portal/results/{observation.observation_id}",
    })

    # 2. Email (no PHI in email body per HIPAA)
    await email_service.send(
        to=patient.email,
        subject="New Health Result Available",
        body=f"Hi {patient.given_name}, a new result is available in your health portal. Log in at {settings.PORTAL_URL} to view it.",
    )

    # 3. SMS if opted in
    if patient.sms_opt_in:
        await sms_service.send(patient.phone, f"New result ready at {settings.PORTAL_URL}")
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Patient-scoped results API | 1 |
| Result interpretation (reference ranges + plain text) | 2 |
| `$everything` FHIR bundle download | 2 |
| C-CDA export for patient download | (already in section 08) |
| PDF health summary generator | 2 |
| New result notification pipeline | 1 |
| Information blocking audit log | 0.5 |
| **Total** | **8.5 days** |
