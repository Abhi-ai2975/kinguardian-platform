# FHIR Compliance & Regulatory Certification

This section covers the regulatory and standards compliance requirements that US-market FHIR servers must meet.

---

## Why Compliance Matters

Without compliance certification:
- Cannot sell to hospitals (they require ONC-certified software)
- Cannot receive CMS incentive payments (MIPS/APMs)
- Cannot connect to payers (require FHIR API under CMS rules)
- Cannot qualify for NCQA PCMH recognition
- Legal exposure under HIPAA / HITECH

---

## Key Standards in This Section

| File | Standard | Enforcer | Deadline |
|---|---|---|---|
| [01-us-core-ig.md](./01-us-core-ig.md) | US Core IG 6.1.0 | ONC (via USCDI) | Jan 1, 2026 |
| [02-uscdi-v3.md](./02-uscdi-v3.md) | USCDI v3 Data Classes | ONC / CMS | Jan 1, 2026 |
| [03-da-vinci-igs.md](./03-da-vinci-igs.md) | Da Vinci CRD/DTR/PAS/PDex | CMS | Jul 1, 2027 |

---

## Current Compliance Status

| Standard | Current | Target |
|---|---|---|
| US Core IG (required profiles) | ~40% | 100% |
| USCDI v3 data classes | ~55% | 100% |
| Da Vinci PAS | 0% | 100% |
| Da Vinci CRD | 0% | 100% |
| Da Vinci DTR | 0% | 100% |
| CapabilityStatement | Not published | Required |
| SMART on FHIR | 0% | Required |

---

## Quick Wins (High ROI)

Before investing in full certification, these items unlock the most value:

1. **Publish CapabilityStatement** at `/metadata` — required by every FHIR client  
2. **Add US Core patient profile fields** — gender identity, race, ethnicity  
3. **LOINC codes on Observation** — required for lab interoperability  
4. **SNOMED CT on Condition** — required for problem list exchange  
5. **NPI on Practitioner** — required for provider directory  
6. **Support `_summary=true`** — required by US Core  
7. **Support `ETag` headers** — required for conditional operations  
