# MedicationAdministration — eMAR (Electronic Medication Administration Record)

**FHIR R4 Spec:** https://www.hl7.org/fhir/R4/medicationadministration.html  
**Sequence Start:** 360000

---

## What Is MedicationAdministration?

`MedicationAdministration` records that a medication was **actually given** to a patient — as opposed to `MedicationRequest` (ordered) or `MedicationDispense` (dispensed). It is the core of the **eMAR** (Electronic Medication Administration Record), which nursing staff use at the bedside.

### The Medication Lifecycle in FHIR

```
MedicationRequest (ordered)
    → MedicationDispense (pharmacy fills it)
        → MedicationAdministration (nurse gives it)
            → MedicationStatement (patient reports taking it)
```

---

## Key FHIR Fields

| Field | Type | Description |
|---|---|---|
| `status` | code | `in-progress` \| `not-done` \| `on-hold` \| `completed` \| `entered-in-error` \| `stopped` \| `unknown` |
| `medicationCodeableConcept` | CodeableConcept | Drug (RxNorm code) |
| `medicationReference` | Reference(Medication) | Or reference to Medication resource |
| `subject` | Reference(Patient) | Patient who received the drug |
| `context` | Reference(Encounter) | Encounter during which drug was given |
| `effective[x]` | dateTime or Period | When it was given |
| `performer` | BackboneElement | Who gave it (actor = Practitioner) |
| `request` | Reference(MedicationRequest) | The order being fulfilled |
| `dosage` | BackboneElement | Route, site, dose, rate |
| `dosage.route` | CodeableConcept | `oral`, `IV`, `IM`, `subcutaneous`, etc. |
| `dosage.dose` | SimpleQuantity | Amount given (e.g., 500 mg) |
| `dosage.rateRatio` | Ratio | For infusions (e.g., 125 mL/hr) |
| `reasonCode` | CodeableConcept[] | Why administered |
| `note` | Annotation[] | Nurse notes |
| `statusReason` | CodeableConcept[] | Why not done / stopped |

---

## DB Model Design

```python
# app/models/medication_administration.py

class MedicationAdministrationStatus(str, Enum):
    in_progress = "in-progress"
    not_done = "not-done"
    on_hold = "on-hold"
    completed = "completed"
    entered_in_error = "entered-in-error"
    stopped = "stopped"
    unknown = "unknown"

class MedicationAdministration(Base):
    __tablename__ = "medication_administration"

    id = Column(BigInteger, primary_key=True)
    medication_administration_id = Column(
        BigInteger,
        Sequence("medication_administration_id_seq", start=360000),
        nullable=False, unique=True, index=True,
    )
    user_id = Column(String, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)

    # Status
    status = Column(
        ENUM(MedicationAdministrationStatus, name="medication_administration_status", create_type=True),
        nullable=False,
    )
    status_reason = Column(JSONB)  # [{ coding: [...], text: "..." }]

    # Medication (one of two)
    medication_code = Column(JSONB)             # CodeableConcept
    medication_id = Column(BigInteger, ForeignKey("medication.id"), index=True)
    medication = relationship("Medication", lazy="selectin")

    # Subject + context
    patient_id = Column(BigInteger, ForeignKey("patient.id"), nullable=False, index=True)
    patient = relationship("Patient", lazy="selectin")
    encounter_id = Column(BigInteger, ForeignKey("encounter.id"), index=True)
    encounter = relationship("Encounter", lazy="selectin")

    # Timing
    effective_datetime = Column(TIMESTAMP(timezone=True))
    effective_period_start = Column(TIMESTAMP(timezone=True))
    effective_period_end = Column(TIMESTAMP(timezone=True))

    # Who administered
    performer_practitioner_id = Column(BigInteger, ForeignKey("practitioner.id"), index=True)
    performer_practitioner = relationship("Practitioner", lazy="selectin")
    performer_function = Column(JSONB)          # CodeableConcept

    # Linked order
    request_id = Column(BigInteger, ForeignKey("medication_request.id"), index=True)
    request = relationship("MedicationRequest", lazy="selectin")

    # Dosage
    dosage_text = Column(String)
    dosage_route = Column(JSONB)                # CodeableConcept
    dosage_site = Column(JSONB)                 # CodeableConcept
    dosage_method = Column(JSONB)               # CodeableConcept
    dosage_dose_value = Column(Numeric(10, 4))
    dosage_dose_unit = Column(String)
    dosage_dose_system = Column(String)
    dosage_rate_numerator_value = Column(Numeric(10, 4))   # for infusions
    dosage_rate_numerator_unit = Column(String)
    dosage_rate_denominator_value = Column(Numeric(10, 4))
    dosage_rate_denominator_unit = Column(String)

    reason_code = Column(JSONB)                 # [CodeableConcept]
    reason_reference = Column(JSONB)            # [{ reference: "Condition/..." }]
    note = Column(JSONB)                        # [Annotation]

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
```

---

## FHIR Mapper Output

```python
# app/fhir/mappers/medication_administration/fhir.py

def to_fhir_medication_administration(m: MedicationAdministration) -> dict:
    resource = {
        "resourceType": "MedicationAdministration",
        "id": str(m.medication_administration_id),
        "status": m.status.value if hasattr(m.status, "value") else m.status,
        "subject": {"reference": f"Patient/{m.patient.patient_id}"},
    }

    # Medication[x]
    if m.medication:
        resource["medicationReference"] = {"reference": f"Medication/{m.medication.medication_id}"}
    elif m.medication_code:
        resource["medicationCodeableConcept"] = m.medication_code

    # effective[x]
    if m.effective_datetime:
        resource["effectiveDateTime"] = m.effective_datetime.isoformat()
    elif m.effective_period_start:
        resource["effectivePeriod"] = {"start": m.effective_period_start.isoformat()}
        if m.effective_period_end:
            resource["effectivePeriod"]["end"] = m.effective_period_end.isoformat()

    if m.encounter:
        resource["context"] = {"reference": f"Encounter/{m.encounter.encounter_id}"}
    if m.request:
        resource["request"] = {"reference": f"MedicationRequest/{m.request.medication_request_id}"}
    if m.performer_practitioner:
        resource["performer"] = [{"actor": {"reference": f"Practitioner/{m.performer_practitioner.practitioner_id}"}}]

    dosage = {}
    if m.dosage_text: dosage["text"] = m.dosage_text
    if m.dosage_route: dosage["route"] = m.dosage_route
    if m.dosage_site: dosage["site"] = m.dosage_site
    if m.dosage_dose_value:
        dosage["dose"] = {"value": float(m.dosage_dose_value), "unit": m.dosage_dose_unit, "system": m.dosage_dose_system or "http://unitsofmeasure.org"}
    if m.dosage_rate_numerator_value:
        dosage["rateRatio"] = {
            "numerator": {"value": float(m.dosage_rate_numerator_value), "unit": m.dosage_rate_numerator_unit},
            "denominator": {"value": float(m.dosage_rate_denominator_value), "unit": m.dosage_rate_denominator_unit},
        }
    if dosage:
        resource["dosage"] = dosage

    if m.note: resource["note"] = m.note
    if m.reason_code: resource["reasonCode"] = m.reason_code
    if m.status_reason: resource["statusReason"] = m.status_reason

    return {k: v for k, v in resource.items() if v is not None}
```

---

## Key Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/MedicationAdministration` | Record a drug administration (eMAR entry) |
| `GET` | `/MedicationAdministration/{id}` | Get a specific eMAR record |
| `GET` | `/MedicationAdministration` | List — filter by patient, encounter, status, date |
| `GET` | `/MedicationAdministration/me` | Current user's administrations |
| `PATCH` | `/MedicationAdministration/{id}` | Correct an eMAR entry |
| `DELETE` | `/MedicationAdministration/{id}` | Remove entered-in-error |

---

## eMAR Workflow Integration

```
Shift handoff → Nurse views active MedicationRequests for patient
                    ↓ administers drug
                POST /MedicationAdministration
                    {
                      status: "completed",
                      medicationReference: { reference: "Medication/250001" },
                      subject: { reference: "Patient/10001" },
                      effectiveDateTime: "2024-01-15T14:30:00Z",
                      performer: [{ actor: { reference: "Practitioner/30001" } }],
                      request: { reference: "MedicationRequest/90001" },
                      dosage: {
                        dose: { value: 500, unit: "mg" },
                        route: { coding: [{ code: "26643006", display: "Oral" }] }
                      }
                    }
                    ↓
                CDS Hook triggers → checks for duplicate administration
                                   → checks daily cumulative dose
                                   → updates eMAR board
```

---

## Estimated Effort

| Task | Days |
|---|---|
| DB model + migration | 0.5 |
| Schemas + mapper | 1 |
| Repository + service + DI | 0.5 |
| Router (CRUD + filters) | 0.5 |
| Tests | 0.5 |
| **Total** | **3 days** |
