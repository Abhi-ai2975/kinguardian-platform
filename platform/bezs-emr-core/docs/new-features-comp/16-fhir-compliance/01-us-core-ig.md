# US Core Implementation Guide — ONC Mandatory Compliance

**IG Version:** US Core 6.1.0 (tied to USCDI v3)  
**Spec:** https://hl7.org/fhir/us/core/STU6.1/  
**Regulatory Basis:** ONC 21st Century Cures Act Final Rule, §170.315(g)(10)

---

## What Is US Core IG?

The US Core Implementation Guide (IG) defines the **minimum required profiles** that a FHIR server must support to comply with ONC certification requirements. Think of it as a "floor" — each resource must include certain fields, use specific code systems, and support specific search parameters.

Non-compliance means your server cannot be used by certified EHRs or payer systems that expect US Core-conformant data.

---

## Required US Core Profiles (USCDI v3)

### Patient — US Core Patient Profile

**Required fields** (must be present or have Data Absent Reason extension):

| Field | Requirement | Code System |
|---|---|---|
| `name` | Must include `family` | — |
| `identifier` | Must include MRN or SSN | — |
| `gender` | Must use `administrative-gender` | http://hl7.org/fhir/ValueSet/administrative-gender |
| `birthDate` | Required | — |
| `race` | **USCDI required** — use US Core Race extension | urn:oid:2.16.840.1.113883.6.238 |
| `ethnicity` | **USCDI required** — use US Core Ethnicity extension | urn:oid:2.16.840.1.113883.6.238 |
| `tribalAffiliation` | New in USCDI v3 | — |
| `sex` | **USCDI v3 new** — biological sex at birth (vs. gender) | http://hl7.org/fhir/us/core/ValueSet/birthsex |
| `genderIdentity` | **USCDI v3 new** | http://hl7.org/fhir/us/core/ValueSet/gender-identity |
| `pronouns` | **USCDI v3 new** | — |
| `address` | Required | — |
| `telecom` | Required | — |

**Race + Ethnicity Extensions** (US Core-specific):

```json
{
  "extension": [
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      "extension": [
        { "url": "ombCategory", "valueCoding": { "system": "urn:oid:2.16.840.1.113883.6.238", "code": "2054-5", "display": "Black or African American" } },
        { "url": "text", "valueString": "Black or African American" }
      ]
    },
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      "extension": [
        { "url": "ombCategory", "valueCoding": { "system": "urn:oid:2.16.840.1.113883.6.238", "code": "2186-5", "display": "Not Hispanic or Latino" } },
        { "url": "text", "valueString": "Not Hispanic or Latino" }
      ]
    },
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex",
      "valueCode": "male"
    },
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-genderIdentity",
      "valueCodeableConcept": { "coding": [{ "system": "http://snomed.info/sct", "code": "446151000124109", "display": "Identifies as male gender" }] }
    }
  ]
}
```

### DB Changes for US Core Patient

```python
# Add to Patient model:
race_code = Column(String)         # OMB category code
race_text = Column(String)         # display text
ethnicity_code = Column(String)    # OMB ethnicity code
ethnicity_text = Column(String)
sex_at_birth = Column(String)      # administrative-gender (separate from gender)
gender_identity = Column(JSONB)    # CodeableConcept
pronouns = Column(JSONB)           # CodeableConcept
tribal_affiliation = Column(JSONB) # [{tribeName, isEnrolled}]
```

---

### Observation — US Core Laboratory Result Profile

**Required for lab results:**

| Field | Requirement |
|---|---|
| `status` | Required; `final` or `amended` |
| `category` | Required; must include `laboratory` |
| `code` | Required; **must include LOINC code** |
| `subject` | Required; Reference(Patient) |
| `effective[x]` | Required |
| `value[x]` or `dataAbsentReason` | One of these must be present |

**Required LOINC codes** for common labs:

| Test | LOINC |
|---|---|
| HbA1c | 4548-4 |
| eGFR | 62238-1 |
| LDL | 2089-1 |
| HDL | 2085-9 |
| Glucose | 2345-7 |
| Creatinine | 2160-0 |
| Hemoglobin | 718-7 |

---

### Condition — US Core Condition Profile

| Field | Requirement |
|---|---|
| `code` | Required; must include **SNOMED CT or ICD-10-CM** |
| `clinicalStatus` | Required (`active`, `resolved`, `inactive`) |
| `verificationStatus` | Required (`confirmed`, `unconfirmed`, `differential`) |
| `subject` | Required |
| `category` | Required; `problem-list-item` or `encounter-diagnosis` |

---

### MedicationRequest — US Core MedicationRequest Profile

| Field | Requirement |
|---|---|
| `status` | Required |
| `intent` | Required; `order` or `plan` |
| `medication[x]` | Required; **RxNorm code** preferred |
| `subject` | Required |
| `requester` | Required |
| `dosageInstruction` | Recommended |

---

### AllergyIntolerance — US Core AllergyIntolerance Profile

| Field | Requirement |
|---|---|
| `code` | Required; **RxNorm** for drugs, **SNOMED** for foods/environmental |
| `patient` | Required |
| `clinicalStatus` | Required |
| `verificationStatus` | Required |

---

### Practitioner — US Core Practitioner Profile

| Field | Requirement |
|---|---|
| `identifier` | Required; **NPI required** (`http://hl7.org/fhir/sid/us-npi`) |
| `name` | Required; must include `family` |
| `qualification` | Required for licensing; must include NUCC taxonomy |

**NPI in FHIR:**

```json
{
  "identifier": [
    { "system": "http://hl7.org/fhir/sid/us-npi", "value": "1234567890" }
  ]
}
```

The current `Practitioner` model has `npi_number` — it must be mapped in the FHIR response as an `identifier` with this system URL.

---

## Required Search Parameters per Profile

### Patient

```
GET /Patient?family=Smith
GET /Patient?given=John
GET /Patient?identifier=http://example.org/mrn|001
GET /Patient?birthdate=1985-03-15
GET /Patient?gender=male
GET /Patient?name=Smith
```

### Observation

```
GET /Observation?patient=Patient/10001
GET /Observation?category=laboratory
GET /Observation?code=4548-4            ← LOINC
GET /Observation?date=ge2024-01-01
GET /Observation?status=final
```

### Condition

```
GET /Condition?patient=Patient/10001
GET /Condition?clinical-status=active
GET /Condition?category=problem-list-item
GET /Condition?code=44054006            ← SNOMED
```

---

## CapabilityStatement — `GET /metadata`

Every US Core-conformant server must publish a `CapabilityStatement`:

```python
# app/routers/metadata.py

@metadata_router.get(
    "/metadata",
    operation_id="get_capability_statement",
    summary="FHIR CapabilityStatement",
    responses={200: {"content": {"application/fhir+json": {}}}},
)
async def get_capability_statement():
    return JSONResponse({
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": "2024-01-15",
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json", "application/json"],
        "implementationGuide": [
            "http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core"
        ],
        "rest": [{
            "mode": "server",
            "resource": [
                {
                    "type": "Patient",
                    "profile": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                    "interaction": [
                        {"code": "read"}, {"code": "search-type"}, {"code": "create"}, {"code": "update"}
                    ],
                    "searchParam": [
                        {"name": "family", "type": "string"},
                        {"name": "given", "type": "string"},
                        {"name": "identifier", "type": "token"},
                        {"name": "birthdate", "type": "date"},
                        {"name": "gender", "type": "token"},
                    ],
                },
                {
                    "type": "Observation",
                    "profile": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
                    "interaction": [{"code": "read"}, {"code": "search-type"}],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "category", "type": "token"},
                        {"name": "code", "type": "token"},
                        {"name": "date", "type": "date"},
                    ],
                },
                # ... repeat for all US Core required resources
            ],
            "security": {
                "cors": True,
                "service": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/restful-security-service", "code": "SMART-on-FHIR" }] }],
            },
        }],
    })
```

---

## US Core Validation Checklist

Run before any US Core claim:

- [ ] All Observation lab results have LOINC codes in `code.coding`
- [ ] All Condition resources have SNOMED or ICD-10 in `code.coding`
- [ ] All MedicationRequest resources have RxNorm in `medicationCodeableConcept.coding`
- [ ] Practitioner resources have NPI in `identifier` with correct system URL
- [ ] Patient resources include `race` and `ethnicity` extensions
- [ ] Patient resources support `sex` and `genderIdentity` extensions
- [ ] `GET /metadata` returns valid `CapabilityStatement`
- [ ] All required search parameters implemented and functional
- [ ] `dataAbsentReason` used when value is unknown (not null)
- [ ] `_summary=true` returns only required summary fields

---

## Estimated Effort

| Task | Days |
|---|---|
| Race/ethnicity/sex/genderIdentity extensions on Patient | 2 |
| LOINC enforcement on Observation | 1 |
| SNOMED/ICD-10 enforcement on Condition | 1 |
| NPI identifier on Practitioner | 0.5 |
| `CapabilityStatement` endpoint | 1.5 |
| Required search parameter implementation | 4 |
| Validation against US Core profiles (HL7 validator) | 2 |
| **Total** | **12 days** |
