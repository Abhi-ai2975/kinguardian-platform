# Revenue Cycle Management (RCM)

RCM is the financial backbone of healthcare operations — from charge capture at the point of care through payment collection. Without it, a clinically excellent EMR still fails to sustain itself financially.

---

## RCM Workflow

```
Clinical encounter occurs
         ↓
Charge Capture (CPT codes assigned to encounter)
         ↓
Claim creation (CMS-1500 / UB-04)
         ↓
Claim scrubbing (edits, duplicate check)
         ↓
Electronic submission to payer (X12 837P/I)
         ↓
Payer adjudication (days to weeks)
         ↓
ERA/835 remittance received
         ↓
ExplanationOfBenefit (EOB) in FHIR
         ↓
Payment posting to account
         ↓ (if denied)
Denial management → appeal → resubmit
```

---

## FHIR Resources Involved

| Resource | Role |
|---|---|
| `Claim` | The bill submitted to payer (already partially implemented) |
| `ClaimResponse` | Payer's adjudication response |
| `ExplanationOfBenefit` | The fully-adjudicated EOB — required for patient access |
| `Coverage` | Patient insurance information |
| `ChargeItem` | Individual charge (line item) as it happens during care |
| `Invoice` | Patient-facing bill after insurance processing |

---

## Files in This Section

| File | Topic |
|---|---|
| [01-charge-capture.md](./01-charge-capture.md) | ChargeItem, CDM integration, CPT/ICD coding at point of care |
| [02-eob-remittance.md](./02-eob-remittance.md) | ExplanationOfBenefit, ERA/835 inbound processing, payment posting |
| [03-denial-management.md](./03-denial-management.md) | Denial reason codes, appeal workflow, AR dashboard |

---

## Why This Is Required

- ONC Patient Access rule: payers **must** expose EOB data via FHIR API. Our server needs to be able to both send Claims and receive/store EOBs.
- CMS-9115-F: requires `ExplanationOfBenefit` to be available to patients in their FHIR portal.
- Revenue: most EMR practices lose 5–15% of revenue to preventable denials. A denial management workflow recovers this.
