# Patient Portal & Engagement

The patient portal is the primary interface between patients and the EMR — required by ONC, demanded by patients, and central to value-based care programs.

---

## Regulatory Requirements

| Regulation | Requirement |
|---|---|
| ONC 21st Century Cures Act | Patients must have immediate electronic access to all their health data |
| Patient Access Final Rule (CMS-9115-F) | Payers + providers must offer FHIR patient access API |
| HIPAA Right of Access | Patient records must be provided within 30 days of request |
| Meaningful Use / MIPS | Patient Electronic Access measure requires portal engagement |
| NCQA PCMH | Patient portal + secure messaging required for recognition |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-patient-registration.md](./01-patient-registration.md) | Self-registration, identity verification, patient account linking to FHIR Patient |
| [02-online-scheduling.md](./02-online-scheduling.md) | Patient-facing slot selection, appointment booking, cancellation |
| [03-results-and-records.md](./03-results-and-records.md) | Lab result viewing, health summary download, FHIR record export |
| [04-smart-health-cards.md](./04-smart-health-cards.md) | SMART Health Cards (QR verifiable credentials), SMART Health Links |

---

## Architecture Overview

```
Patient App (React Native / PWA)
         ↓ SMART on FHIR Patient-context launch
Patient FHIR API (scoped to patient's own data)
  GET /Patient/{id}/$everything     ← all their records
  GET /Observation?patient={id}     ← lab results
  POST /Communication               ← send message to provider
  GET /Appointment?patient={id}     ← upcoming appointments
  POST /Appointment                 ← book new appointment
         ↓
Patient-Scoped JWT
  sub = patient_id (not practitioner_id)
  scope = patient/*.read patient/Communication.write
```

All patient portal APIs use the same FHIR endpoints already implemented — the difference is the **JWT scope** (patient-context vs. practitioner-context) and the access control layer enforcing patients can only see their own data.
