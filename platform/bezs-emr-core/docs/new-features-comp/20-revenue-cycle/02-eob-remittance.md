# ExplanationOfBenefit & ERA/835 Remittance Processing

**FHIR Resource:** `ExplanationOfBenefit`  
**Standard:** X12 835 (Electronic Remittance Advice)  
**Regulatory:** CMS Patient Access Rule requires EOB available via FHIR API

---

## What Is an EOB?

An `ExplanationOfBenefit` is the payer's response after adjudicating a `Claim` — it shows what was billed, what the payer paid, what the patient owes (copay/coinsurance/deductible), and any denial reasons. It is the **most important document in the revenue cycle**.

FHIR EOB is also required by the CMS Patient Access Final Rule — payers must make patients' EOBs available through a FHIR API, and providers need to be able to store and display EOBs.

---

## EOB Structure

```json
{
  "resourceType": "ExplanationOfBenefit",
  "status": "active",
  "type": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/claim-type", "code": "professional" }] },
  "use": "claim",
  "patient": { "reference": "Patient/10001" },
  "created": "2024-01-20",
  "insurer": { "reference": "Organization/bcbs" },
  "provider": { "reference": "Organization/190001" },
  "claim": { "reference": "Claim/170001" },
  "claimResponse": { "reference": "ClaimResponse/180001" },
  "outcome": "complete",
  "payment": {
    "type": { "coding": [{ "code": "complete" }] },
    "date": "2024-01-20",
    "amount": { "value": 87.50, "currency": "USD" }
  },
  "item": [
    {
      "sequence": 1,
      "productOrService": { "coding": [{ "system": "http://ama-assn.org/go/cpt", "code": "99213" }] },
      "servicedDate": "2024-01-15",
      "adjudication": [
        { "category": { "coding": [{ "code": "submitted" }] }, "amount": { "value": 125.00, "currency": "USD" } },
        { "category": { "coding": [{ "code": "eligible" }] }, "amount": { "value": 110.00, "currency": "USD" } },
        { "category": { "coding": [{ "code": "copay" }] }, "amount": { "value": 25.00, "currency": "USD" } },
        { "category": { "coding": [{ "code": "benefit" }] }, "amount": { "value": 87.50, "currency": "USD" } }
      ]
    }
  ],
  "total": [
    { "category": { "coding": [{ "code": "submitted" }] }, "amount": { "value": 125.00, "currency": "USD" } },
    { "category": { "coding": [{ "code": "benefit" }] }, "amount": { "value": 87.50, "currency": "USD" } }
  ],
  "benefitBalance": [
    {
      "category": { "coding": [{ "code": "medical" }] },
      "financial": [
        { "type": { "coding": [{ "code": "deductible" }] }, "allowedMoney": { "value": 2000, "currency": "USD" }, "usedMoney": { "value": 450, "currency": "USD" } }
      ]
    }
  ]
}
```

---

## X12 835 ERA Processing

Most payers still return adjudication results as X12 835 files (EDI). We must parse them and create FHIR EOB resources:

```python
# app/services/billing/era_processor.py

class ERA835Processor:
    """
    Parses X12 835 Electronic Remittance Advice and creates ExplanationOfBenefit resources.
    """

    async def process_file(self, era_content: str, org_id: str) -> dict:
        transactions = self._parse_x12_835(era_content)
        results = {"processed": 0, "errors": 0, "eobs_created": []}

        for txn in transactions:
            try:
                eob = await self._txn_to_eob(txn, org_id)
                saved_eob = await self.eob_service.create(eob, org_id=org_id)
                await self._post_payment(txn, saved_eob, org_id)
                results["processed"] += 1
                results["eobs_created"].append(saved_eob.explanation_of_benefit_id)
            except Exception as e:
                results["errors"] += 1

        return results

    def _parse_x12_835(self, content: str) -> list[dict]:
        """Parse X12 835 segments into structured transaction dicts."""
        segments = content.strip().split("~")
        transactions = []
        current_txn = None
        current_claim = None

        for seg in segments:
            elements = seg.strip().split("*")
            segment_id = elements[0]

            if segment_id == "CLP":   # Claim Level Payment
                current_claim = {
                    "claim_id": elements[1],
                    "status": elements[2],       # 1=paid, 2=adjusted, 3=denied, 4=denied
                    "billed": float(elements[3]),
                    "paid": float(elements[4]),
                    "patient_responsibility": float(elements[5]),
                    "lines": [],
                }
                if current_txn:
                    current_txn["claims"].append(current_claim)

            elif segment_id == "SVC":  # Service Line Payment
                if current_claim:
                    current_claim["lines"].append({
                        "cpt_code": elements[1].split(":")[1] if ":" in elements[1] else elements[1],
                        "billed": float(elements[2]),
                        "paid": float(elements[3]),
                        "quantity": float(elements[5]) if len(elements) > 5 else 1.0,
                    })

            elif segment_id == "CAS":  # Claim Adjustment
                if current_claim:
                    current_claim.setdefault("adjustments", []).append({
                        "reason_group": elements[1],
                        "reason_code": elements[2],
                        "amount": float(elements[3]),
                    })

            elif segment_id == "PLB":  # Provider Level Adjustments
                if current_txn:
                    current_txn.setdefault("provider_adjustments", []).append(elements)

            elif segment_id == "BPR":  # EFT/Check payment info
                current_txn = {
                    "payment_amount": float(elements[2]),
                    "payment_date": elements[16],
                    "eft_number": elements[9] if len(elements) > 9 else None,
                    "claims": [],
                }
                transactions.append(current_txn)

        return transactions

    async def _txn_to_eob(self, txn: dict, org_id: str) -> dict:
        """Convert parsed 835 transaction to FHIR ExplanationOfBenefit."""
        eob_items = []
        for i, claim in enumerate(txn.get("claims", [])):
            # Find the original Claim in our system
            original_claim = await self.claim_repo.find_by_payer_id(claim["claim_id"], org_id)

            for j, line in enumerate(claim.get("lines", []), 1):
                adjudication = [
                    {"category": {"coding": [{"code": "submitted"}]}, "amount": {"value": line["billed"], "currency": "USD"}},
                    {"category": {"coding": [{"code": "benefit"}]}, "amount": {"value": line["paid"], "currency": "USD"}},
                ]
                # Add denial/adjustment reason codes
                for adj in claim.get("adjustments", []):
                    adjudication.append({
                        "category": {"coding": [{"code": adj["reason_group"]}]},
                        "reason": {"coding": [{"system": "https://x12.org/codes/claim-adjustment-reason-codes", "code": adj["reason_code"]}]},
                        "amount": {"value": adj["amount"], "currency": "USD"},
                    })
                eob_items.append({"sequence": j, "productOrService": {"coding": [{"code": line["cpt_code"]}]}, "adjudication": adjudication})

        return {
            "resourceType": "ExplanationOfBenefit",
            "status": "active",
            "use": "claim",
            "outcome": "complete",
            "payment": {
                "date": txn.get("payment_date"),
                "amount": {"value": txn.get("payment_amount", 0), "currency": "USD"},
            },
            "item": eob_items,
        }
```

---

## Inbound ERA Webhook

Payers can push 835 files via SFTP or webhook:

```python
@era_router.post("/billing/era/ingest")
async def ingest_era(
    file: UploadFile = File(...),
    source: str = Query(..., description="Payer identifier"),
    request: Request = ...,
):
    """Accept an X12 835 ERA file and process it into EOB resources."""
    content = (await file.read()).decode("utf-8")
    user = request.state.user
    result = await era_processor.process_file(content, user["activeOrganizationId"])

    # Log the ERA receipt for audit
    await audit_service.log_era_received(
        org_id=user["activeOrganizationId"],
        source=source,
        payment_amount=result.get("total_payment"),
        eobs_created=len(result["eobs_created"]),
    )

    return result
```

---

## Payment Posting

After creating the EOB, post the payment to the patient account:

```python
async def _post_payment(self, txn: dict, eob: ExplanationOfBenefit, org_id: str):
    """Update Claim status and create Invoice for patient responsibility."""
    total_paid = txn.get("payment_amount", 0)
    patient_responsibility = sum(c.get("patient_responsibility", 0) for c in txn.get("claims", []))

    # If patient owes anything, create an Invoice
    if patient_responsibility > 0:
        await self.invoice_service.create({
            "status": "issued",
            "type": {"coding": [{"code": "patient-invoice"}]},
            "account": {"reference": f"ExplanationOfBenefit/{eob.explanation_of_benefit_id}"},
            "totalNet": {"value": patient_responsibility, "currency": "USD"},
            "totalGross": {"value": patient_responsibility, "currency": "USD"},
        }, org_id=org_id)
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `ExplanationOfBenefit` FHIR resource (model + CRUD) | 2.5 |
| X12 835 parser | 3 |
| ERA processor (835 → EOB) | 2 |
| Payment posting + Invoice creation | 1 |
| ERA ingest webhook | 0.5 |
| EOB patient-facing portal view | 1 |
| **Total** | **10 days** |
