# Document Bundles — FHIR-Native Clinical Documents

**FHIR Spec:** https://www.hl7.org/fhir/R4/documents.html

---

## What Is a Document Bundle?

A `document` bundle is a **persistent, signed, human-readable** clinical document — the FHIR-native equivalent of a C-CDA XML file. Unlike transaction or batch bundles, document bundles represent a snapshot in time that must not be altered after creation.

Key properties:
- `type: "document"`
- First entry is always a `Composition` resource (the "header")
- All referenced resources must be included inline (self-contained)
- Has an `identifier` (document ID) and `timestamp`
- May be digitally signed (via `Signature`)

---

## Document Bundle Structure

```json
{
  "resourceType": "Bundle",
  "id": "doc-discharge-10001",
  "type": "document",
  "timestamp": "2024-01-15T14:30:00Z",
  "identifier": { "system": "urn:ietf:rfc:3986", "value": "urn:uuid:a9291350-f4e4-4f79-8b0e-b4a0db4f7fea" },
  "entry": [
    {
      "fullUrl": "Composition/1",
      "resource": {
        "resourceType": "Composition",
        "id": "1",
        "status": "final",
        "type": {
          "coding": [{ "system": "http://loinc.org", "code": "18842-5", "display": "Discharge summary" }]
        },
        "subject": { "reference": "Patient/10001" },
        "date": "2024-01-15T14:30:00Z",
        "author": [{ "reference": "Practitioner/30001" }],
        "title": "Discharge Summary — John Smith",
        "section": [
          {
            "title": "Active Problems",
            "code": { "coding": [{ "system": "http://loinc.org", "code": "11450-4" }] },
            "entry": [{ "reference": "Condition/120001" }, { "reference": "Condition/120002" }]
          },
          {
            "title": "Medications at Discharge",
            "code": { "coding": [{ "system": "http://loinc.org", "code": "10183-2" }] },
            "entry": [{ "reference": "MedicationRequest/90001" }]
          },
          {
            "title": "Vital Signs",
            "code": { "coding": [{ "system": "http://loinc.org", "code": "8716-3" }] },
            "entry": [{ "reference": "Observation/160001" }]
          }
        ]
      }
    },
    {
      "fullUrl": "Patient/10001",
      "resource": { "resourceType": "Patient", "id": "10001", "name": [{ "family": "Smith", "given": ["John"] }], "birthDate": "1985-03-15" }
    },
    {
      "fullUrl": "Condition/120001",
      "resource": { "resourceType": "Condition", "id": "120001", "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "44054006", "display": "Type 2 diabetes" }] }, "subject": { "reference": "Patient/10001" } }
    }
  ]
}
```

---

## Common Document Types (LOINC Codes)

| LOINC | Document Type |
|---|---|
| `18842-5` | Discharge summary |
| `11488-4` | Consultation note |
| `34133-9` | Summary of episode note (CCD) |
| `11506-3` | Progress note |
| `11504-8` | Surgical operation note |
| `34117-2` | History and physical note |
| `28570-0` | Procedure note |
| `57016-8` | Privacy policy acknowledgement |
| `11369-6` | Immunization summary |
| `18748-4` | Diagnostic imaging report |

---

## Why Document Bundles Matter

| Scenario | Why Document Bundle |
|---|---|
| Patient transitions of care | Discharge summary sent to receiving provider |
| Patient portal downloads | Patient requests their medical records |
| CMS referral requirements | Care summaries for specialists |
| Immunization registries | Complete immunization history export |
| Legal/insurance requests | Certified copy with timestamp + signature |
| Interoperability with C-CDA systems | FHIR equivalent accepted by HL7 tooling |

---

## `DocumentReference` — Storing and Retrieving Documents

Generated document bundles should be stored as `DocumentReference` resources:

```json
{
  "resourceType": "DocumentReference",
  "status": "current",
  "type": { "coding": [{ "system": "http://loinc.org", "code": "18842-5", "display": "Discharge summary" }] },
  "subject": { "reference": "Patient/10001" },
  "date": "2024-01-15T14:30:00Z",
  "author": [{ "reference": "Practitioner/30001" }],
  "content": [
    {
      "attachment": {
        "contentType": "application/fhir+json",
        "url": "https://fhir.example.org/document/a9291350-f4e4-4f79-8b0e-b4a0db4f7fea"
      }
    }
  ]
}
```

---

## Implementation Plan

### Document Generator Service

```python
# app/services/document_service.py

class DocumentService:
    """Generates FHIR document bundles from patient data."""

    SECTION_QUERIES = {
        "11450-4": ("Condition", "patient={patient_id}&clinical-status=active"),
        "10183-2": ("MedicationRequest", "patient={patient_id}&status=active"),
        "8716-3": ("Observation", "patient={patient_id}&category=vital-signs&_sort=-date&_count=5"),
        "48765-2": ("AllergyIntolerance", "patient={patient_id}"),
        "11369-6": ("Immunization", "patient={patient_id}"),
        "29762-2": ("Encounter", "patient={patient_id}&_sort=-date&_count=10"),
    }

    async def generate_discharge_summary(
        self,
        patient_id: int,
        encounter_id: int,
        author_practitioner_id: int,
        user_id: str,
        org_id: str,
    ) -> dict:
        """Generate a complete discharge summary document bundle."""
        patient = await self.patient_repo.get(patient_id, user_id, org_id)
        encounter = await self.encounter_repo.get(encounter_id, user_id, org_id)
        practitioner = await self.practitioner_repo.get(author_practitioner_id, user_id, org_id)

        entries = []
        doc_id = str(uuid.uuid4())

        # Gather all referenced resources
        conditions = await self.condition_repo.list(user_id, org_id, patient_id=patient_id, limit=50)
        medications = await self.medication_repo.list(user_id, org_id, patient_id=patient_id, limit=50)
        vitals = await self.observation_repo.list(user_id, org_id, patient_id=patient_id, limit=10)

        # Build Composition sections
        sections = [
            self._section("Active Problems", "11450-4", [f"Condition/{c.condition_id}" for c in conditions.items]),
            self._section("Medications", "10183-2", [f"MedicationRequest/{m.medication_request_id}" for m in medications.items]),
            self._section("Vital Signs", "8716-3", [f"Observation/{v.observation_id}" for v in vitals.items]),
        ]

        # First entry must be Composition
        composition = self._build_composition(patient, encounter, practitioner, sections, doc_id)
        entries.append({"fullUrl": f"Composition/{doc_id}", "resource": composition})

        # Include all referenced resources inline
        entries.append({"fullUrl": f"Patient/{patient.patient_id}", "resource": to_fhir_patient(patient)})
        entries.append({"fullUrl": f"Practitioner/{practitioner.practitioner_id}", "resource": to_fhir_practitioner(practitioner)})
        entries.append({"fullUrl": f"Encounter/{encounter.encounter_id}", "resource": to_fhir_encounter(encounter)})
        for c in conditions.items:
            entries.append({"fullUrl": f"Condition/{c.condition_id}", "resource": to_fhir_condition(c)})
        for m in medications.items:
            entries.append({"fullUrl": f"MedicationRequest/{m.medication_request_id}", "resource": to_fhir_medication_request(m)})

        return {
            "resourceType": "Bundle",
            "id": doc_id,
            "type": "document",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "identifier": {"system": "urn:ietf:rfc:3986", "value": f"urn:uuid:{doc_id}"},
            "entry": entries,
        }

    def _section(self, title: str, loinc: str, refs: list[str]) -> dict:
        return {
            "title": title,
            "code": {"coding": [{"system": "http://loinc.org", "code": loinc}]},
            "entry": [{"reference": ref} for ref in refs],
        }

    def _build_composition(self, patient, encounter, practitioner, sections, doc_id):
        return {
            "resourceType": "Composition",
            "id": doc_id,
            "status": "final",
            "type": {"coding": [{"system": "http://loinc.org", "code": "18842-5", "display": "Discharge summary"}]},
            "subject": {"reference": f"Patient/{patient.patient_id}"},
            "encounter": {"reference": f"Encounter/{encounter.encounter_id}"},
            "date": datetime.utcnow().isoformat() + "Z",
            "author": [{"reference": f"Practitioner/{practitioner.practitioner_id}"}],
            "title": "Discharge Summary",
            "section": sections,
        }
```

### Router Endpoints

```python
# app/routers/operations/documents.py

@document_router.get(
    "/Patient/{patient_id}/$discharge-summary",
    operation_id="generate_discharge_summary",
    summary="Generate a FHIR Discharge Summary document bundle",
    description="Returns a FHIR document Bundle (type=document) with Composition as first entry.",
    responses={200: {"content": {"application/fhir+json": {}}}},
)
async def generate_discharge_summary(
    patient_id: int,
    encounter_id: int = Query(...),
    request: Request = ...,
    svc: DocumentService = Depends(get_document_service),
):
    user = request.state.user
    bundle = await svc.generate_discharge_summary(
        patient_id, encounter_id, user["practitioner_id"], user["sub"], user["activeOrganizationId"]
    )
    return JSONResponse(bundle)
```

---

## Digital Signatures

For legal documents (court-ordered records, HIPAA releases), add a `Signature` to the bundle:

```json
{
  "resourceType": "Bundle",
  "type": "document",
  "signature": {
    "type": [{ "system": "urn:iso-astm:E1762-95:2013", "code": "1.2.840.10065.1.12.1.1", "display": "Author's Signature" }],
    "when": "2024-01-15T14:30:00Z",
    "who": { "reference": "Practitioner/30001" },
    "sigFormat": "application/signature+json",
    "data": "BASE64_ENCODED_JWS_SIGNATURE"
  }
}
```

Implementation uses Python's `jwcrypto` library to sign the canonical JSON representation.
