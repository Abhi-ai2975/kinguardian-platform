# AI-Enabled EMR

This is the strategic differentiator. While Medplum provides foundational FHIR infrastructure,  
an AI-enabled EMR layer on top is what makes the platform transformative for clinicians.

The goal: **every clinical workflow is augmented by AI without the clinician leaving the chart.**

---

## Files in This Section

| File | Topic |
|---|---|
| [01-ai-integration.md](./01-ai-integration.md) | Core AI infrastructure: `$ai` proxy, context injection, model routing |
| [02-clinical-nlp.md](./02-clinical-nlp.md) | NLP features: note parsing, SNOMED/ICD extraction, de-identification |
| [03-smart-charting.md](./03-smart-charting.md) | AI-assisted charting: ambient transcription, smart forms, note generation |
| [04-ai-clinical-decision-support.md](./04-ai-clinical-decision-support.md) | AI CDS: predictive alerts, differential diagnosis, risk stratification |

---

## AI EMR Vision

```
Clinician opens patient chart
         ↓
AI automatically:
├── Summarizes active problems in plain English
├── Flags abnormal labs in last 90 days
├── Identifies overdue preventive care
├── Surfaces relevant clinical guidelines
└── Pre-fills note template based on past visits
         ↓
Clinician starts dictating
         ↓
AI transcribes, identifies:
├── New diagnoses → creates Condition
├── Medication changes → creates MedicationRequest  
├── Lab orders → creates ServiceRequest
└── Referrals → creates ServiceRequest (type=referral)
         ↓
Clinician reviews and approves changes
One-click sign → all resources created
Note finalized and saved as DocumentReference
```

---

## Guiding Principles for AI in Clinical Settings

1. **AI assists, clinician decides** — AI never creates resources without clinician approval
2. **Transparency** — every AI recommendation shows its reasoning
3. **Audit trail** — every AI interaction is logged as AuditEvent
4. **Fallback** — if AI fails, clinical workflow continues normally
5. **Privacy** — patient data never sent to AI providers in plain text without data processing agreements
6. **Accuracy first** — low-confidence recommendations are suppressed, not shown
