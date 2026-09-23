# Clinical Decision Support (CDS)

CDS is the mechanism by which clinical systems provide real-time alerts, recommendations,  
and reminders to clinicians at the point of care — embedded into clinical workflows.

---

## Files in This Section

| File | Topic |
|---|---|
| [01-cds-hooks.md](./01-cds-hooks.md) | CDS Hooks — standard protocol for EHR-integrated clinical alerts |
| [02-measures.md](./02-measures.md) | FHIR Measures — quality measure evaluation and reporting |
| [03-care-templates.md](./03-care-templates.md) | Care templates and clinical protocol management |

---

## Current State

We have no CDS capability. Our Task resource provides basic workflow tracking  
but no decision logic or automated recommendations.

---

## CDS in the AI EMR Context

CDS and AI are deeply complementary:

| Traditional CDS | AI-Enhanced CDS |
|---|---|
| Rule-based alerts (if BP > 180, alert) | ML model predicts sepsis risk before vitals spike |
| Static drug interaction databases | NLP extracts interactions from full medication history |
| Fixed order sets | AI suggests personalized order set based on similar patients |
| Protocol checklists | AI identifies which protocol gaps to close |

Our architecture should support both traditional (rule-based via CDS Hooks) and  
AI-driven (via `$ai` operation) decision support.
