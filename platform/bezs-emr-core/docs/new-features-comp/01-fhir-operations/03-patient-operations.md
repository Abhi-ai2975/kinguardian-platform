# Patient Operations — $everything, $match, $summary, $merge

**FHIR Spec:**
- `$everything`: https://www.hl7.org/fhir/R4/patient-operation-everything.html
- `$match`: https://www.hl7.org/fhir/R4/patient-operation-match.html

**Medplum reference:** `packages/server/src/fhir/operations/patienteverything.ts`, `resourcemerge.ts`

---

## `Patient/$everything`

Returns a Bundle containing the patient record AND every other resource that references it:  
Encounters, Conditions, MedicationRequests, Observations, Procedures, DiagnosticReports,  
Immunizations, AllergyIntolerances, CarePlans, DocumentReferences, etc.

This is the **clinical summary export** — essential for care transitions, referrals, and patient portals.

### API

```
GET  /Patient/10001/$everything
POST /Patient/10001/$everything
GET  /Patient/$everything          (scoped to current user — /me equivalent)
```

**Query Parameters:**

| Param | Description |
|---|---|
| `_since` | Only include resources modified after this date (ISO 8601) |
| `_count` | Number of resources per page |
| `start` | Filter by clinical date start |
| `end` | Filter by clinical date end |

### Response

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 47,
  "entry": [
    { "resource": { "resourceType": "Patient", "id": "10001", ... } },
    { "resource": { "resourceType": "Encounter", "id": "20001", ... } },
    { "resource": { "resourceType": "Condition", "id": "120001", ... } },
    { "resource": { "resourceType": "MedicationRequest", "id": "90001", ... } }
  ]
}
```

### Implementation Plan

```python
# app/services/patient_everything_service.py

PATIENT_LINKED_RESOURCES = [
    ("encounters",          "subject_id",   EncounterRepository),
    ("conditions",          "subject_id",   ConditionRepository),
    ("medication_requests", "subject_id",   MedicationRequestRepository),
    ("observations",        "subject_id",   ObservationRepository),
    ("procedures",          "subject_id",   ProcedureRepository),
    ("diagnostic_reports",  "subject_id",   DiagnosticReportRepository),
    ("immunizations",       "patient_id",   ImmunizationRepository),
    ("allergy_intolerances","patient_id",   AllergyIntoleranceRepository),
    ("care_plans",          "subject_id",   CarePlanRepository),
    ("document_references", "subject_id",   DocumentReferenceRepository),
]

class PatientEverythingService:
    async def get_everything(
        self,
        patient_id: int,
        user_id: str,
        org_id: str,
        since: datetime | None = None,
    ) -> dict:
        patient = await self.patient_repo.get_by_public_id(patient_id, user_id, org_id)
        entries = [{"resource": self._to_fhir(patient)}]

        for _, _, repo_class in PATIENT_LINKED_RESOURCES:
            repo = repo_class(self.session_factory)
            resources = await repo.list_by_patient(patient.id, since=since)
            entries.extend({"resource": self._to_fhir(r)} for r in resources)

        return {
            "resourceType": "Bundle",
            "type": "searchset",
            "total": len(entries),
            "entry": entries,
        }
```

**Router:**
```python
@router.get("/Patient/{patient_id}/$everything", operation_id="patient_everything")
async def patient_everything(
    patient_id: int,
    request: Request,
    _since: str | None = Query(None, alias="_since"),
    svc=Depends(get_patient_everything_service),
):
    user_id = request.state.user.get("sub")
    org_id = request.state.user.get("activeOrganizationId")
    since = datetime.fromisoformat(_since) if _since else None
    result = await svc.get_everything(patient_id, user_id, org_id, since)
    return JSONResponse(result)
```

---

## `Patient/$match`

Probabilistic patient matching — takes a partial patient record and returns a ranked list  
of candidate matches from the database. Essential for:
- MPI (Master Patient Index) deduplication
- Cross-system patient linking
- Avoiding duplicate record creation

### How Matching Works

Medplum uses a weighted scoring algorithm:

| Field | Weight |
|---|---|
| name (family) exact | 30 |
| name (given) exact | 15 |
| birthDate exact | 25 |
| identifier (SSN, MRN) | 40 |
| gender | 5 |
| address | 10 |
| telecom (phone/email) | 10 |

Score ≥ 80: `certain`  
Score 60–79: `probable`  
Score 40–59: `possible`  
Score < 40: excluded

### Request Body

```json
{
  "resourceType": "Parameters",
  "parameter": [{
    "name": "resource",
    "resource": {
      "resourceType": "Patient",
      "name": [{ "family": "Smith", "given": ["John"] }],
      "birthDate": "1985-03-15",
      "identifier": [{ "system": "http://example.org/mrn", "value": "MRN-12345" }]
    }
  }]
}
```

### Response

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "entry": [
    {
      "resource": { "resourceType": "Patient", "id": "10001", ... },
      "search": { "mode": "match", "score": 0.95 },
      "extension": [{
        "url": "http://hl7.org/fhir/StructureDefinition/match-grade",
        "valueCode": "certain"
      }]
    }
  ]
}
```

### Implementation Plan

```python
# app/services/patient_match_service.py

MATCH_WEIGHTS = {
    "family_name": 30,
    "given_name": 15,
    "birth_date": 25,
    "identifier": 40,
    "gender": 5,
    "phone": 10,
    "email": 10,
}

class PatientMatchService:
    async def match(self, candidate: dict, count: int = 10) -> dict:
        candidates = await self.patient_repo.list_all()
        scores = []
        for patient in candidates:
            score = self._score(candidate, patient)
            if score >= 40:
                scores.append((score, patient))
        scores.sort(key=lambda x: x[0], reverse=True)
        entries = []
        for score, patient in scores[:count]:
            grade = "certain" if score >= 80 else "probable" if score >= 60 else "possible"
            entries.append({
                "resource": to_fhir_patient(patient),
                "search": {"mode": "match", "score": score / 100},
                "extension": [{"url": "...match-grade", "valueCode": grade}],
            })
        return {"resourceType": "Bundle", "type": "searchset", "entry": entries}
```

---

## `Patient/$summary`

Returns an International Patient Summary (IPS) — a standardized clinical document containing:
- Active problems (Conditions)
- Current medications (MedicationRequests)
- Known allergies (AllergyIntolerances)
- Recent immunizations
- Key lab results (Observations)

**FHIR Spec:** https://hl7.org/fhir/uv/ips/  
This is a composition resource following the IPS ImplementationGuide.

### Response

```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "resource": {
        "resourceType": "Composition",
        "type": { "coding": [{ "system": "http://loinc.org", "code": "60591-5", "display": "Patient Summary" }] },
        "section": [
          { "title": "Active Problems", "entry": [{ "reference": "Condition/120001" }] },
          { "title": "Medications", "entry": [{ "reference": "MedicationRequest/90001" }] },
          { "title": "Allergies", "entry": [{ "reference": "AllergyIntolerance/260001" }] }
        ]
      }
    }
  ]
}
```

---

## `Patient/$merge`

Merges two patient records — the source patient's resources are relinked to the target,  
and the source is marked as `replaced-by` with a link to the target.

```
POST /Patient/10002/$merge
{
  "resourceType": "Parameters",
  "parameter": [{ "name": "source-patient", "valueReference": { "reference": "Patient/10003" } }]
}
```

After merge: `Patient/10003` gets `link: [{ other: { reference: "Patient/10002" }, type: "replaced-by" }]`  
and all resources referencing `Patient/10002` are updated to point to `Patient/10003`.

**This is a complex operation requiring a database transaction.**
