# Clinical NLP — Note Parsing, Code Extraction, De-identification

---

## Clinical NLP Use Cases

| Task | Input | Output |
|---|---|---|
| Problem extraction | Free-text note | SNOMED CT Condition codes |
| Medication extraction | Discharge summary | MedicationRequest resources |
| ICD-10 coding | Clinical note | ICD-10-CM codes |
| CPT coding | Procedure note | CPT codes |
| Lab value extraction | Lab narrative | Observation values |
| Named entity recognition | Any clinical text | Entities (people, places, dates, conditions) |
| De-identification | Patient note | PHI-removed version |
| SNOMED normalization | Free-text symptom | SNOMED CT code |
| Sentiment analysis | Patient message | Urgency score |

---

## Problem/Condition Extraction

```python
# app/nlp/condition_extractor.py

CONDITION_EXTRACTION_PROMPT = """You are a clinical NLP system. Extract all medical conditions
from the following clinical text and return them as a JSON array.

For each condition, provide:
- text: the exact text phrase
- snomed_code: the SNOMED CT code (or null if unknown)
- snomed_display: the standard SNOMED display name
- icd10_code: the ICD-10-CM code (or null if unknown)
- clinical_status: "active" | "resolved" | "historical"
- certainty: "confirmed" | "suspected" | "ruled-out"

Return only the JSON array, no other text.

Clinical text:
"""

class ConditionExtractor:
    async def extract(self, clinical_text: str) -> list[dict]:
        response = await ai_client.complete(
            model="claude-haiku-4-5",  # fast, structured output
            system=CONDITION_EXTRACTION_PROMPT,
            prompt=clinical_text,
        )
        conditions = json.loads(response)
        # Validate against our terminology service
        for condition in conditions:
            if condition.get("snomed_code"):
                valid = await terminology_svc.validate_code(
                    "http://snomed.info/sct", condition["snomed_code"]
                )
                condition["code_validated"] = valid
        return conditions

    async def extract_and_create(
        self, clinical_text: str, encounter_id: int, patient_id: int, user_id: str, org_id: str
    ) -> list[dict]:
        """Extract conditions and create Condition resources (as drafts)."""
        extracted = await self.extract(clinical_text)
        created = []
        for cond in extracted:
            if cond.get("certainty") == "confirmed":
                condition = await condition_repo.create({
                    "clinicalStatus": {"coding": [{"code": cond["clinical_status"]}]},
                    "code": {"coding": [{"system": "http://snomed.info/sct", "code": cond["snomed_code"], "display": cond["snomed_display"]}]},
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "encounter": {"reference": f"Encounter/{encounter_id}"},
                    "note": [{"text": f"AI-extracted from clinical note: '{cond['text']}'"}],
                    "meta": {"tag": [{"code": "ai-extracted", "system": "http://example.org/tags"}]},
                }, user_id, org_id)
                created.append(to_fhir_condition(condition))
        return created
```

---

## Medication Extraction

```python
MEDICATION_EXTRACTION_PROMPT = """Extract all medications from this clinical text.
Return JSON array with:
- name: medication name as written
- rxnorm_code: RxNorm code (or null)
- rxnorm_display: standard name
- dose: dose amount (e.g., "500mg")
- frequency: dosing frequency (e.g., "twice daily")
- route: administration route (e.g., "oral")
- status: "current" | "discontinued" | "historical"
"""

class MedicationExtractor:
    async def extract(self, text: str) -> list[dict]:
        raw = await ai_client.complete("claude-haiku-4-5", MEDICATION_EXTRACTION_PROMPT, text)
        medications = json.loads(raw)
        # Normalize via RxNorm lookup
        for med in medications:
            if not med.get("rxnorm_code"):
                lookup = await terminology_svc.lookup_code("http://www.nlm.nih.gov/research/umls/rxnorm", med["name"])
                if lookup:
                    med["rxnorm_code"] = lookup["code"]
                    med["rxnorm_display"] = lookup["display"]
        return medications
```

---

## ICD-10 Coding Assistance

```python
# app/nlp/icd10_coder.py

ICD10_PROMPT = """You are a medical billing specialist. Given a clinical description,
suggest the most specific ICD-10-CM code(s).

Return JSON: { "codes": [{"code": "E11.9", "display": "Type 2 DM without complications", "confidence": 0.95}] }
Order by confidence descending. Include up to 5 suggestions."""

class ICD10Coder:
    async def suggest_codes(self, description: str) -> list[dict]:
        response = await ai_client.complete("claude-sonnet-4-6", ICD10_PROMPT, description)
        suggestions = json.loads(response)["codes"]
        # Validate codes exist in our ICD-10-CM ValueSet
        for s in suggestions:
            s["validated"] = await terminology_svc.validate_code(
                "http://hl7.org/fhir/sid/icd-10-cm", s["code"]
            )
        return [s for s in suggestions if s["validated"]]
```

---

## De-identification

For research datasets, audit logs, or AI training, PHI must be removed.

```python
# app/nlp/deidentifier.py

DEIDENTIFY_PROMPT = """De-identify the following clinical text by replacing all PHI with placeholders.

PHI to remove:
- Names → [NAME]
- Dates → [DATE] (keep only year for dates > 3 months ago)
- Ages > 89 → [AGE]
- Geographic identifiers smaller than state → [LOCATION]
- Phone numbers → [PHONE]
- Email addresses → [EMAIL]
- SSN/MRN/account numbers → [ID]
- Device identifiers → [DEVICE]
- Biometric identifiers → [BIOMETRIC]

Return only the de-identified text, nothing else.

Text to de-identify:
"""

class Deidentifier:
    async def deidentify(self, text: str) -> str:
        return await ai_client.complete("claude-sonnet-4-6", DEIDENTIFY_PROMPT, text)

    async def deidentify_resource(self, fhir_resource: dict) -> dict:
        """De-identify a FHIR resource by replacing PHI fields."""
        resource_type = fhir_resource.get("resourceType")
        deidentified = dict(fhir_resource)

        if resource_type == "Patient":
            deidentified["name"] = [{"family": "[FAMILY]", "given": ["[GIVEN]"]}]
            deidentified["birthDate"] = deidentified.get("birthDate", "")[:4] + "-01-01"  # year only
            deidentified["telecom"] = []
            deidentified["address"] = [{"state": addr.get("state"), "country": addr.get("country")} for addr in deidentified.get("address", [])]
            deidentified["identifier"] = [{"system": i.get("system"), "value": "[ID]"} for i in deidentified.get("identifier", [])]

        return deidentified
```

---

## Clinical NLP API Endpoints

```
POST /Patient/{id}/$extract-conditions     — Extract conditions from text
POST /Patient/{id}/$extract-medications    — Extract medications from text
POST /$suggest-icd10                       — Suggest ICD-10 codes for description
POST /$suggest-cpt                         — Suggest CPT codes for procedure description
POST /$deidentify                          — De-identify clinical text
POST /$nlp-analyze                         — General NLP analysis (returns entities + codes)
```

---

## NLP Pipeline API

```python
@router.post("/$nlp-analyze", operation_id="nlp_analyze")
async def nlp_analyze(body: NLPAnalysisRequest, request: Request):
    """
    Run NLP pipeline on clinical text.
    Returns extracted: conditions, medications, procedures, labs, entities.
    """
    text = body.text
    tasks = body.tasks or ["conditions", "medications", "entities"]

    results = {}
    if "conditions" in tasks:
        results["conditions"] = await condition_extractor.extract(text)
    if "medications" in tasks:
        results["medications"] = await medication_extractor.extract(text)
    if "icd10" in tasks:
        results["icd10_codes"] = await icd10_coder.suggest_codes(text)
    if "deidentify" in tasks:
        results["deidentified"] = await deidentifier.deidentify(text)

    return results
```

---

## SNOMED Normalization

Map free-text symptoms to SNOMED CT codes:

```python
@router.post("/$snomed-normalize", operation_id="snomed_normalize")
async def snomed_normalize(body: SnomedNormalizeRequest):
    """Convert free-text clinical phrase to SNOMED CT code."""
    phrase = body.phrase

    # Step 1: Try semantic search (our existing vector embedding service)
    candidates = await terminology_svc.semantic_search(phrase, limit=5)

    # Step 2: If no confident match, use AI for disambiguation
    if not candidates or candidates[0].score < 0.85:
        ai_result = await ai_client.complete(
            model="claude-haiku-4-5",
            system="Map this clinical phrase to the most specific SNOMED CT concept. Return JSON: {snomed_code, display, confidence}",
            prompt=phrase,
        )
        ai_code = json.loads(ai_result)
        candidates.insert(0, ai_code)

    return {"phrase": phrase, "candidates": candidates}
```
