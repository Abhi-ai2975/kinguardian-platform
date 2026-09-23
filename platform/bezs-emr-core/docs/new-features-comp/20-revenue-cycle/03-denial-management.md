# Denial Management — AR Dashboard & Appeals

**Problem:** US healthcare loses $262B/year in denied claims. 65% of denials are never appealed. 63% of denied claims are recoverable if appealed correctly.

---

## Denial Root Causes

| Category | Common Reasons | % of Denials |
|---|---|---|
| **Eligibility** | Patient not covered on date of service, wrong insurance ID | 24% |
| **Authorization** | Missing or insufficient prior authorization | 23% |
| **Coding** | Wrong CPT/ICD-10 combination, unbundling, upcoding | 18% |
| **Medical Necessity** | Service not covered for diagnosis code | 17% |
| **Timely Filing** | Claim submitted past payer's deadline | 10% |
| **Duplicate** | Claim already submitted (or same DOS, provider, code) | 5% |
| **Other** | Missing modifier, NPI issues, coordination of benefits | 3% |

---

## CARC / RARC Codes

Denials come back with standardized reason codes:

| CARC | Meaning |
|---|---|
| 4 | Service is inconsistent with the diagnosis |
| 11 | Diagnosis inconsistent with patient age |
| 16 | Information was missing from claim |
| 22 | This care may be covered by another payer |
| 50 | Not medically necessary |
| 96 | Non-covered charges |
| 97 | Payment included in allowance for another service |
| 197 | Prior authorization was not received |

CARC = Claim Adjustment Reason Code (from X12 835 CAS segment)

---

## Denial Tracking Model

```sql
CREATE TABLE claim_denial (
    id              BIGSERIAL PRIMARY KEY,
    org_id          UUID NOT NULL,
    claim_id        BIGINT REFERENCES claim(id),
    eob_id          BIGINT REFERENCES explanation_of_benefit(id),
    patient_id      BIGINT REFERENCES patient(id),
    encounter_id    BIGINT REFERENCES encounter(id),
    payer_name      VARCHAR(200),
    denial_date     DATE NOT NULL,
    carc_codes      VARCHAR(10)[],           -- CARCs from 835
    rarc_codes      VARCHAR(10)[],           -- RARCs (remittance advice remark codes)
    denial_category VARCHAR(50),             -- eligibility|authorization|coding|medical_necessity|timely_filing|duplicate
    billed_amount   NUMERIC(12, 2),
    denied_amount   NUMERIC(12, 2),
    appeal_status   VARCHAR(30) DEFAULT 'not_appealed',  -- not_appealed|in_progress|won|lost|written_off
    appeal_deadline DATE,
    assigned_to     VARCHAR,                -- billing staff user_id
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_denial_org_status ON claim_denial (org_id, appeal_status, denial_date DESC);
CREATE INDEX idx_denial_deadline ON claim_denial (appeal_deadline) WHERE appeal_status = 'not_appealed';
```

---

## Denial Classification Engine

```python
# app/services/billing/denial_classifier.py

class DenialClassifier:
    CARC_TO_CATEGORY = {
        "4": "coding", "5": "coding", "6": "coding", "9": "coding",
        "11": "coding", "12": "coding", "16": "coding",
        "15": "eligibility", "22": "eligibility", "27": "eligibility",
        "50": "medical_necessity", "57": "medical_necessity",
        "96": "medical_necessity",
        "197": "authorization", "15": "authorization",
        "29": "timely_filing",
        "97": "duplicate", "18": "duplicate",
    }

    APPEAL_DEADLINES_DAYS = {
        "eligibility": 90,
        "authorization": 60,
        "coding": 120,
        "medical_necessity": 90,
        "timely_filing": 30,   # usually not appealable
        "duplicate": 60,
    }

    def classify(self, carc_codes: list[str]) -> dict:
        categories = set()
        for carc in carc_codes:
            cat = self.CARC_TO_CATEGORY.get(carc)
            if cat:
                categories.add(cat)
        primary_category = list(categories)[0] if categories else "other"
        deadline_days = self.APPEAL_DEADLINES_DAYS.get(primary_category, 90)

        return {
            "category": primary_category,
            "appeal_deadline": (date.today() + timedelta(days=deadline_days)).isoformat(),
            "is_appealable": primary_category != "timely_filing",
            "recommended_action": self._get_action(primary_category, carc_codes),
        }

    def _get_action(self, category: str, carcs: list[str]) -> str:
        actions = {
            "eligibility": "Verify patient eligibility on DOS. Check for coordination of benefits. Resubmit with corrected insurance info.",
            "authorization": "Obtain retrospective authorization or submit clinical documentation supporting medical necessity.",
            "coding": "Review CPT/ICD-10 combination. Check NCCI edits. Resubmit with corrected codes.",
            "medical_necessity": "Obtain medical necessity letter from treating physician. Submit clinical notes and supporting documentation.",
            "timely_filing": "Review filing deadline — if within limit, resubmit with proof of timely filing.",
            "duplicate": "Verify this is not a true duplicate. If different, resubmit with appropriate modifiers.",
        }
        return actions.get(category, "Contact payer for clarification.")
```

---

## AR (Accounts Receivable) Dashboard

```python
@billing_router.get(
    "/billing/ar-dashboard",
    operation_id="get_ar_dashboard",
    summary="Accounts receivable summary and aging report",
)
async def get_ar_dashboard(request: Request):
    user = request.state.user
    org_id = user["activeOrganizationId"]

    async with session_factory() as session:
        # Aging buckets (how long has the AR been outstanding)
        aging = await session.execute(text("""
            SELECT
                SUM(CASE WHEN CURRENT_DATE - c.created_at::date <= 30 THEN c.total_value ELSE 0 END) AS "0-30",
                SUM(CASE WHEN CURRENT_DATE - c.created_at::date BETWEEN 31 AND 60 THEN c.total_value ELSE 0 END) AS "31-60",
                SUM(CASE WHEN CURRENT_DATE - c.created_at::date BETWEEN 61 AND 90 THEN c.total_value ELSE 0 END) AS "61-90",
                SUM(CASE WHEN CURRENT_DATE - c.created_at::date > 90 THEN c.total_value ELSE 0 END) AS "90+",
                COUNT(*) FILTER (WHERE c.status = 'active') AS open_claims,
                COUNT(*) FILTER (WHERE cd.appeal_status = 'not_appealed') AS unworked_denials,
                SUM(cd.denied_amount) FILTER (WHERE cd.appeal_status = 'not_appealed') AS recoverable_amount
            FROM claim c
            LEFT JOIN claim_denial cd ON cd.claim_id = c.id
            WHERE c.org_id = :org_id
        """), {"org_id": org_id})
        ar_data = dict(aging.fetchone())

        # Denial rate by payer
        denial_by_payer = await session.execute(text("""
            SELECT
                eob.insurer_display AS payer,
                COUNT(*) AS total_claims,
                COUNT(cd.id) AS denied_claims,
                ROUND(100.0 * COUNT(cd.id) / COUNT(*), 1) AS denial_rate_pct,
                SUM(cd.denied_amount) AS denied_amount
            FROM claim c
            LEFT JOIN explanation_of_benefit eob ON eob.claim_id = c.id
            LEFT JOIN claim_denial cd ON cd.claim_id = c.id
            WHERE c.org_id = :org_id
              AND c.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY eob.insurer_display
            ORDER BY denial_rate_pct DESC
            LIMIT 10
        """), {"org_id": org_id})

    return {
        "aging": ar_data,
        "denial_by_payer": [dict(r) for r in denial_by_payer],
    }
```

---

## Appeal Workflow

```python
@billing_router.post("/billing/denials/{denial_id}/$appeal")
async def submit_appeal(
    denial_id: int,
    body: AppealSubmissionSchema,
    request: Request,
):
    """Submit an appeal for a denied claim."""
    user = request.state.user
    denial = await denial_repo.get(denial_id, user["activeOrganizationId"])

    if denial.appeal_deadline < date.today():
        return JSONResponse({"error": "Appeal deadline has passed."}, status_code=422)

    # Gather supporting documentation
    supporting_docs = []
    if body.include_clinical_notes:
        notes = await document_ref_repo.list_by_encounter(denial.encounter_id)
        supporting_docs.extend(notes)
    if body.medical_necessity_letter:
        supporting_docs.append(body.medical_necessity_letter)

    # Update denial status
    await denial_repo.patch(denial_id, {
        "appeal_status": "in_progress",
        "notes": body.appeal_notes,
        "assigned_to": user["sub"],
    })

    # Create Task to track appeal
    task = await task_service.create({
        "status": "in-progress",
        "code": {"coding": [{"code": "claim-appeal"}]},
        "description": f"Appeal for {denial.payer_name} denial (CARC: {', '.join(denial.carc_codes)}). Deadline: {denial.appeal_deadline}",
        "owner": {"reference": f"Practitioner/{user['sub']}"},
        "restriction": {"period": {"end": denial.appeal_deadline.isoformat()}},
    }, user["sub"], user["activeOrganizationId"])

    # Submit to payer (payer-specific portal or EDI 276/277)
    await payer_portal_service.submit_appeal(denial, supporting_docs, body.appeal_letter)

    return {"status": "appeal_submitted", "task_id": task.task_id}
```

---

## AI-Assisted Appeal Letters

```python
@billing_router.post("/billing/denials/{denial_id}/$generate-appeal-letter")
async def generate_appeal_letter(denial_id: int, request: Request):
    denial = await denial_repo.get(denial_id, request.state.user["activeOrganizationId"])
    encounter = await encounter_repo.get(denial.encounter_id, ...)
    clinical_notes = await document_ref_repo.list_by_encounter(denial.encounter_id)

    prompt = f"""You are a medical billing specialist writing an appeal letter for a denied insurance claim.

Denial Information:
- Payer: {denial.payer_name}
- Denial Reason Codes: {', '.join(denial.carc_codes)}
- Denied Amount: ${denial.denied_amount}
- Denial Category: {denial.denial_category}

Clinical Context:
- Diagnosis: {encounter.primary_diagnosis_text}
- Procedure: {encounter.procedure_codes}
- Clinical notes summary: {clinical_notes[0].content_text[:500] if clinical_notes else 'See attached'}

Write a professional, evidence-based appeal letter citing medical necessity and relevant clinical guidelines.
Include: (1) statement of medical necessity, (2) clinical evidence, (3) regulatory/guideline citations, (4) request for reconsideration."""

    response = await anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"appeal_letter": response.content[0].text}
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `claim_denial` table + auto-population from ERA | 1.5 |
| Denial classifier (CARC → category + action) | 1.5 |
| AR dashboard queries | 2 |
| Appeal workflow API | 2 |
| AI appeal letter generation | 1 |
| Deadline tracking + alerts | 1 |
| **Total** | **9 days** |
