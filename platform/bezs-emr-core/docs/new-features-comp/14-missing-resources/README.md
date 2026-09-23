# Missing FHIR Resources

This section covers FHIR R4 resources that are completely absent from the current server but are required for a production EMR.

---

## Absent Resources by Priority

| Priority | Resource | Why It Matters |
|---|---|---|
| P0 | `MedicationAdministration` | eMAR — actual drug given (vs. ordered) |
| P0 | `Communication` | Secure in-app messaging between providers/patients |
| P0 | `Consent` | HIPAA authorization, research consent, data sharing |
| P1 | `Flag` | Alerts on a patient (fall risk, allergy, behavior) |
| P1 | `RiskAssessment` | Structured risk scores (sepsis, readmission, falls) |
| P1 | `ClinicalImpression` | Clinician's assessment after evaluation |
| P1 | `FamilyMemberHistory` | Hereditary risk, family history |
| P2 | `NutritionOrder` | Diet/enteral/parenteral nutrition orders |
| P2 | `MedicationAdministration` | Medication given record |
| P2 | `CommunicationRequest` | Pending message requests |

---

## Sequence Allocations (Next Available Block)

Per the CLAUDE.md allocation table, use the next available 10000-block starting at **360000**:

| Resource | Sequence Start |
|---|---|
| `MedicationAdministration` | 360000 |
| `Communication` | 370000 |
| `CommunicationRequest` | 380000 |
| `Consent` | 390000 |
| `Flag` | 400000 |
| `RiskAssessment` | 410000 |
| `ClinicalImpression` | 420000 |
| `FamilyMemberHistory` | 430000 |
| `NutritionOrder` | 440000 |

---

## Files in This Section

| File | Resources |
|---|---|
| [01-medication-administration.md](./01-medication-administration.md) | `MedicationAdministration` — eMAR |
| [02-communication.md](./02-communication.md) | `Communication` + `CommunicationRequest` — secure messaging |
| [03-consent.md](./03-consent.md) | `Consent` — HIPAA + research consent |
| [04-flag-risk-assessment.md](./04-flag-risk-assessment.md) | `Flag` + `RiskAssessment` + `ClinicalImpression` |
| [05-family-history-nutrition.md](./05-family-history-nutrition.md) | `FamilyMemberHistory` + `NutritionOrder` |

---

## Implementation Strategy

All 9 resources follow the same CLAUDE.md pattern:
1. DB model + Alembic migration
2. `CreateSchema` + `PatchSchema` + response schemas
3. FHIR mapper (fhir.py + plain.py)
4. Repository
5. Service
6. DI module + dependency
7. Router

See `/new-fhir-resource` skill for the 17-step checklist.
