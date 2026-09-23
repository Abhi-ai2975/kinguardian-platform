# Telemedicine & Virtual Care

Telehealth became a permanent fixture of US healthcare post-COVID — CMS extended telehealth coverage, and patients now expect virtual visits as a standard offering.

---

## Telehealth by the Numbers

- 38x increase in telehealth use from 2020 to 2023 (McKinsey)
- $250B annual telehealth market by 2025 (projected)
- CMS permanently extended Medicare telehealth coverage for chronic disease management
- 40% of patients prefer telehealth for follow-up visits (survey, 2023)

---

## Virtual Care Modes

| Mode | Description | Reimbursable |
|---|---|---|
| **Synchronous video visit** | Live two-way video (Zoom, Doxy.me) | Yes (Medicare + most Medicaid) |
| **Audio-only visit** | Phone-only when patient lacks video capability | Yes (extended through 2025) |
| **Asynchronous e-visit** | Patient submits form/photos → provider reviews and responds | Yes (limited) |
| **Store-and-forward** | Patient sends images/data; specialist reviews later (common in derm, ophtho) | Yes (some states) |
| **Remote patient monitoring** | Continuous device data reviewed by provider (see section 18) | Yes |
| **Group visit** | Provider sees multiple patients simultaneously | Limited |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-video-visits.md](./01-video-visits.md) | Zoom/Doxy.me integration, virtual Encounter, waiting room, telehealth consent |
| [02-async-virtual-care.md](./02-async-virtual-care.md) | E-visits, store-and-forward, patient-submitted photos |
| [03-remote-vitals-and-ai.md](./03-remote-vitals-and-ai.md) | Capturing vitals during video, AI analysis of video stream, ambient AI in telehealth |

---

## FHIR Resources for Telehealth

| Resource | Telehealth Use |
|---|---|
| `Encounter` | Virtual encounters use `class = VR` (virtual) |
| `Appointment` | `appointmentType.coding.code = "TELEMED"` |
| `Communication` | E-visit patient messages + provider responses |
| `Consent` | Telehealth consent (state-specific requirements) |
| `QuestionnaireResponse` | E-visit intake forms |
| `Observation` | Vitals captured via camera / connected devices |
| `DocumentReference` | Patient-submitted photos, video recordings |
| `AuditEvent` | HIPAA-compliant session logging |

---

## Regulatory Requirements

| Requirement | Detail |
|---|---|
| HIPAA | Video platform must be HIPAA-compliant (Zoom Healthcare, Doxy.me, Teladoc) |
| Telehealth consent | Many states require explicit telehealth consent (stored as `Consent` resource) |
| Prescribing rules | Controlled substances cannot be prescribed via telehealth in most cases (Ryan Haight Act) |
| Cross-state licensing | Provider must be licensed in patient's state (not provider's) |
| Originating site | CMS rules on where patient must be located (relaxed post-COVID) |
