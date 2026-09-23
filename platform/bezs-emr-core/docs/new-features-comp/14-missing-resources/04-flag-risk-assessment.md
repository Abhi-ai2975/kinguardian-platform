# Flag + RiskAssessment + ClinicalImpression

**FHIR R4 Specs:**
- Flag: https://www.hl7.org/fhir/R4/flag.html  
- RiskAssessment: https://www.hl7.org/fhir/R4/riskassessment.html  
- ClinicalImpression: https://www.hl7.org/fhir/R4/clinicalimpression.html

**Sequence Starts:** Flag = 400000, RiskAssessment = 410000, ClinicalImpression = 420000

---

## Flag — Patient Safety Alerts

### What Is It?

A `Flag` is a persistent alert displayed prominently in the patient chart — a warning that clinicians must be aware of every time they interact with the patient.

**Examples:**
- "FALL RISK — Use bed alarm"
- "LATEX ALLERGY — Do not use latex gloves"
- "VIOLENT BEHAVIOR — Security escort required"
- "DNR ORDER IN EFFECT"
- "DIFFICULT AIRWAY — Anesthesia alert"
- "RESEARCH PARTICIPANT — IRB Protocol #2024-001"

### Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `active` \| `inactive` \| `entered-in-error` |
| `category` | CodeableConcept[] | `safety` \| `administrative` \| `clinical` \| `drug` \| `behavioral` |
| `code` | CodeableConcept | The specific flag (SNOMED or local code) |
| `subject` | Reference | Patient, Group, Location, or Organization |
| `period` | Period | When the flag is in effect |
| `encounter` | Reference(Encounter) | Context where flag was raised |
| `author` | Reference | Who raised the flag |

### DB Model

```python
class FlagStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    entered_in_error = "entered-in-error"

class Flag(Base):
    __tablename__ = "flag"

    id = Column(BigInteger, primary_key=True)
    flag_id = Column(BigInteger, Sequence("flag_id_seq", start=400000), nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(FlagStatus, name="flag_status", create_type=True), nullable=False)
    category = Column(JSONB)                      # [CodeableConcept]
    code = Column(JSONB, nullable=False)          # CodeableConcept — the flag text/code

    # Subject
    patient_id = Column(BigInteger, ForeignKey("patient.id"), index=True)
    patient = relationship("Patient", lazy="selectin")

    # Period
    period_start = Column(TIMESTAMP(timezone=True))
    period_end = Column(TIMESTAMP(timezone=True))

    # Context
    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")

    author_reference = Column(String)             # "Practitioner/30001"

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

### Example — Fall Risk Flag

```json
POST /Flag
{
  "status": "active",
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/flag-category", "code": "safety" }] }],
  "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "129839007", "display": "At risk for falls" }], "text": "FALL RISK — Bed alarm must be activated" },
  "subject": { "reference": "Patient/10001" },
  "period": { "start": "2024-01-15" },
  "author": { "reference": "Practitioner/30001" }
}
```

---

## RiskAssessment — Structured Risk Scores

### What Is It?

`RiskAssessment` captures a **calculated risk score** — the result of running a scoring algorithm on patient data. Unlike `Flag` (human judgment), `RiskAssessment` is machine-generated or protocol-driven.

**Examples:**
- HEART Score (cardiac risk)
- qSOFA / SOFA (sepsis risk)
- 30-day readmission risk (ML model)
- Framingham 10-year cardiovascular risk
- Wells Score (DVT/PE)
- GAD-7 / PHQ-9 scores

### Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `registered` \| `preliminary` \| `final` \| `amended` \| `corrected` \| `cancelled` \| `entered-in-error` \| `unknown` |
| `method` | CodeableConcept | Algorithm used (qSOFA, HEART, ML model) |
| `code` | CodeableConcept | What is being assessed |
| `subject` | Reference(Patient) | Patient |
| `encounter` | Reference(Encounter) | Clinical context |
| `occurrence[x]` | dateTime or Period | When assessed |
| `condition` | Reference(Condition) | Condition being assessed for |
| `performer` | Reference | Clinician or system that ran the assessment |
| `prediction` | BackboneElement[] | One or more risk predictions |
| `prediction.outcome` | CodeableConcept | What might happen |
| `prediction.probability[x]` | decimal or Range | % or range (0.0–1.0) |
| `prediction.qualitativeRisk` | CodeableConcept | `negligible` \| `low` \| `moderate` \| `high` \| `very-high` |
| `prediction.relativeRisk` | decimal | Risk relative to population |
| `prediction.when[x]` | Period or Range | Timeframe for the prediction |
| `basis` | Reference[] | Resources used to calculate (Observations, etc.) |
| `mitigation` | string | Recommended actions |

### DB Model

```python
class RiskAssessmentStatus(str, Enum):
    registered = "registered"
    preliminary = "preliminary"
    final = "final"
    amended = "amended"
    corrected = "corrected"
    cancelled = "cancelled"
    entered_in_error = "entered-in-error"
    unknown = "unknown"

class RiskAssessment(Base):
    __tablename__ = "risk_assessment"

    id = Column(BigInteger, primary_key=True)
    risk_assessment_id = Column(BigInteger, Sequence("risk_assessment_id_seq", start=410000), nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(ENUM(RiskAssessmentStatus, name="risk_assessment_status", create_type=True), nullable=False)
    method = Column(JSONB)                    # CodeableConcept (algorithm)
    code = Column(JSONB)                      # CodeableConcept (what's assessed)

    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")

    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")

    occurrence_datetime = Column(TIMESTAMP(timezone=True))
    occurrence_period_start = Column(TIMESTAMP(timezone=True))
    occurrence_period_end = Column(TIMESTAMP(timezone=True))

    condition = Column(JSONB)                 # Reference(Condition)
    performer_reference = Column(String)      # Reference (person or system)
    basis = Column(JSONB)                     # [Reference]

    prediction = Column(JSONB, nullable=False)  # [{outcome, probabilityDecimal, qualitativeRisk, relativeRisk, whenPeriod, rationale}]
    mitigation = Column(Text)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

### Example — qSOFA Sepsis Screening

```json
POST /RiskAssessment
{
  "status": "final",
  "method": { "coding": [{ "system": "http://example.org/risk-methods", "code": "qsofa", "display": "qSOFA Sepsis Screening" }] },
  "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "91302008", "display": "Sepsis" }] },
  "subject": { "reference": "Patient/10001" },
  "encounter": { "reference": "Encounter/20001" },
  "occurrenceDateTime": "2024-01-15T14:00:00Z",
  "performer": { "reference": "Device/auto-screening-bot" },
  "basis": [
    { "reference": "Observation/160001" },
    { "reference": "Observation/160002" },
    { "reference": "Observation/160003" }
  ],
  "prediction": [{
    "outcome": { "coding": [{ "system": "http://snomed.info/sct", "code": "91302008", "display": "Sepsis" }] },
    "probabilityDecimal": 0.62,
    "qualitativeRisk": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/risk-probability", "code": "high" }] },
    "relativeRisk": 3.8,
    "whenPeriod": { "start": "2024-01-15", "end": "2024-01-17" },
    "rationale": "qSOFA score 2/3: altered mentation, RR ≥22. Score ≥2 predicts ICU admission risk."
  }],
  "mitigation": "Initiate sepsis bundle: blood cultures x2, lactate, broad-spectrum antibiotics within 1 hour, 30 mL/kg IV fluid if lactate ≥4."
}
```

### AI Integration

The sepsis automation handler from section 09 creates a `RiskAssessment` when triggered:

```python
@MessageService.register("critical-vital")
async def handle_sepsis_screening(bundle, org_id, svc):
    score, details = await calculate_qsofa(patient_id, encounter_id)
    if score >= 2:
        await svc.risk_assessment_service.create({
            "status": "final",
            "method": {"coding": [{"code": "qsofa"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "prediction": [{"probabilityDecimal": score / 3, "qualitativeRisk": {"coding": [{"code": "high"}]}}],
        })
        # Also create a Flag + urgent Task
        await svc.flag_service.create({"status": "active", "code": {"text": "SEPSIS ALERT — qSOFA ≥2"}, "subject": {"reference": f"Patient/{patient_id}"}})
```

---

## ClinicalImpression — Clinician's Assessment

### What Is It?

`ClinicalImpression` is the clinician's overall **clinical assessment** of a patient after an evaluation — a synthesis of findings, differential diagnoses, and plan. It is the FHIR equivalent of the "Assessment and Plan" section of a SOAP note.

### Key Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `in-progress` \| `completed` \| `entered-in-error` |
| `code` | CodeableConcept | Type of assessment |
| `description` | string | Summary of the assessment |
| `subject` | Reference(Patient) | Patient |
| `encounter` | Reference(Encounter) | The encounter this summarizes |
| `effective[x]` | dateTime or Period | When assessed |
| `assessor` | Reference(Practitioner) | Who performed assessment |
| `previous` | Reference(ClinicalImpression) | Previous assessment for comparison |
| `problem` | Reference[] | Problems/conditions being managed |
| `investigation` | BackboneElement[] | Groups of investigations (vitals, labs, imaging) |
| `investigation.code` | CodeableConcept | Category of investigation |
| `investigation.item` | Reference[] | Specific observations/results |
| `protocol` | uri[] | Clinical protocols followed |
| `summary` | string | Overall summary text |
| `finding` | BackboneElement[] | Specific findings |
| `finding.itemCodeableConcept` | CodeableConcept | A finding (SNOMED) |
| `finding.basis` | string | Evidence for the finding |
| `prognosisCodeableConcept` | CodeableConcept[] | Expected outcome |
| `prognosisReference` | Reference(RiskAssessment)[] | Linked risk assessments |
| `supportingInfo` | Reference[] | Any other supporting resources |
| `note` | Annotation[] | Additional notes |

### DB Model (abbreviated)

```python
class ClinicalImpression(Base):
    __tablename__ = "clinical_impression"

    id = Column(BigInteger, primary_key=True)
    clinical_impression_id = Column(BigInteger, Sequence("clinical_impression_id_seq", start=420000), nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    status = Column(String, nullable=False)
    code = Column(JSONB)
    description = Column(Text)

    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")

    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")

    effective_datetime = Column(TIMESTAMP(timezone=True))
    assessor_reference = Column(String)           # "Practitioner/30001"

    previous_id = Column(BigInteger, ForeignKey("clinical_impression.id"), index=True)
    problem = Column(JSONB)                       # [Reference(Condition | AllergyIntolerance)]
    investigation = Column(JSONB)                 # [{code, item:[Reference]}]
    summary = Column(Text)
    finding = Column(JSONB)                       # [{itemCodeableConcept, itemReference, basis}]
    prognosis_code = Column(JSONB)                # [CodeableConcept]
    prognosis_reference = Column(JSONB)           # [Reference(RiskAssessment)]
    note = Column(JSONB)                          # [Annotation]

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

### Example — Post-Visit Assessment

```json
POST /ClinicalImpression
{
  "status": "completed",
  "description": "65-year-old male with poorly controlled Type 2 DM and new chest pain, likely angina",
  "subject": { "reference": "Patient/10001" },
  "encounter": { "reference": "Encounter/20001" },
  "effectiveDateTime": "2024-01-15T14:30:00Z",
  "assessor": { "reference": "Practitioner/30001" },
  "problem": [
    { "reference": "Condition/120001" }
  ],
  "investigation": [{
    "code": { "text": "Vital Signs" },
    "item": [{ "reference": "Observation/160001" }]
  }],
  "finding": [
    { "itemCodeableConcept": { "coding": [{ "system": "http://snomed.info/sct", "code": "57054005", "display": "Acute myocardial infarction" }] }, "basis": "Ruled out by troponin x2 negative" },
    { "itemCodeableConcept": { "coding": [{ "system": "http://snomed.info/sct", "code": "194828000", "display": "Angina" }] }, "basis": "Exertional chest pain, relieved by rest" }
  ],
  "summary": "Stable angina, likely demand ischemia. Adjust DM management — A1c 9.8. Refer to cardiology for stress test.",
  "prognosisCodeableConcept": [{ "coding": [{ "system": "http://snomed.info/sct", "code": "65872000", "display": "Fair prognosis" }] }]
}
```

---

## Estimated Effort

| Resource | Days |
|---|---|
| `Flag` full CRUD | 1.5 |
| `RiskAssessment` full CRUD | 2 |
| `ClinicalImpression` full CRUD | 2.5 |
| AI integration hooks (qSOFA→RiskAssessment) | 1 |
| **Total** | **7 days** |
