# FHIR Bundles

A `Bundle` is the FHIR container type for grouping multiple resources together.  
It appears in many contexts — not just as a search result wrapper.

---

## Bundle Types

| Type | `Bundle.type` | When Used |
|---|---|---|
| `transaction` | `transaction` | Atomic multi-resource write — all succeed or all fail |
| `batch` | `batch` | Non-atomic multi-request — each entry processed independently |
| `document` | `document` | Clinical document (FHIR-native C-CDA equivalent) |
| `message` | `message` | Async FHIR messaging between systems |
| `searchset` | `searchset` | Response to a FHIR search query (already implemented) |
| `history` | `history` | Response to a `_history` query (already implemented) |
| `collection` | `collection` | Generic container, no processing semantics |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-transaction-bundles.md](./01-transaction-bundles.md) | Atomic multi-resource `POST /` — the most important bundle type for EMR |
| [02-batch-bundles.md](./02-batch-bundles.md) | Non-atomic multi-request batching |
| [03-document-bundles.md](./03-document-bundles.md) | FHIR-native clinical documents |
| [04-message-bundles.md](./04-message-bundles.md) | Async FHIR messaging |

---

## Current State

We return `searchset` and `history` bundles from list and `_history` endpoints.  
We do **not** accept bundles as input — `POST /` with a Bundle body is unimplemented.

---

## Why Transaction Bundles Are Critical for EMR

Nearly every real EMR workflow needs atomicity across multiple resources:

| Workflow | Resources Created Together |
|---|---|
| New patient registration | `Patient` + `Coverage` + `RelatedPerson` (guarantor) |
| New encounter | `Encounter` + `EpisodeOfCare` link |
| Lab order | `ServiceRequest` + `Specimen` (if collected) |
| Discharge | `Encounter` (finished) + `DocumentReference` (discharge summary) + `MedicationRequest` updates |
| Referral | `ServiceRequest` + `Task` + `Communication` |
| Immunization record | `Immunization` + `Observation` (VFC eligibility) |

Without transaction bundles, a client making 3 sequential calls risks partial failure —  
Patient created, Coverage creation fails, now you have a patient with no insurance data.
