# FDA SaMD & AI Governance

**Regulatory:** FDA 21 CFR Part 820, FDA AI/ML SaMD Action Plan (2021), ISO 13485, IEC 62304  
**Status:** Not addressed anywhere in the current system  
**Critical:** Without this framework, AI CDS features cannot be used in a certified clinical setting

---

## Why This Matters

If any AI feature in this server **influences a clinical decision** — suggesting a diagnosis, recommending a medication, triggering an alert — it may qualify as **Software as a Medical Device (SaMD)** under FDA regulations. Getting this wrong means:

- Regulatory action (Warning Letter, 483 observations)
- Inability to sell to hospitals that require FDA-compliant software
- Liability exposure if AI contributes to an adverse event
- ONC decertification if AI violates Safe Harbor provisions

---

## FDA AI/ML SaMD Categories

| Risk Level | Examples in Our System | FDA Classification |
|---|---|---|
| **Administrative / Non-clinical** | No-show prediction, billing code suggestion | Non-device (no FDA oversight) |
| **Low risk CDS** | Drug interaction alerts with clinician override | Often excluded under 21st Century Cures Safe Harbor |
| **Moderate risk CDS** | Sepsis early warning, differential diagnosis | May require FDA 510(k) clearance |
| **High risk (autonomous decisions)** | AI autonomously orders labs/medications | Likely requires FDA PMA |

### Safe Harbor Exclusions (CDS Safe Harbor, 21 CFR 880.3820)

AI/ML features are **excluded from FDA oversight** if they meet ALL of:
1. Not intended to acquire, process, or analyze medical images or signals
2. Displays clinical recommendations with a clinician review step
3. Provides clinicians with access to the underlying data and rationale
4. Does not require specific technical expertise to understand the basis

**Our AI features that qualify for Safe Harbor:** Differential diagnosis suggestions, ICD-10 code recommendations, medication review, care gap alerts (all have clinician override).

**Features that likely do NOT qualify:** Autonomous sepsis alert that fires an order without review, imaging AI analysis.

---

## FDA Pre-Submission Pathway

Before deploying moderate or high-risk AI features:

```
Step 1: Determine if feature is a Device (vs. administrative software)
         ↓ If Device:
Step 2: Classify under FDA 510(k) / De Novo / PMA
         ↓
Step 3: Request Pre-Sub meeting with FDA (free, non-binding guidance)
         ↓
Step 4: Build Quality Management System (QMS)
         ↓
Step 5: Clinical validation study
         ↓
Step 6: Submit 510(k) or De Novo application
         ↓
Step 7: Receive Clearance → Deploy
```

**Timeline:** 510(k) takes 6-12 months average. Plan accordingly.

---

## Quality Management System (QMS) Requirements

ISO 13485 / FDA 21 CFR Part 820 require a formal QMS for medical device software:

### Software Development Lifecycle (IEC 62304)

All AI/ML code classified as SaMD must follow IEC 62304:

```
1. Software Planning
   - Software safety class (A/B/C based on injury potential)
   - Development methodology documented

2. Requirements Analysis
   - Intended use documented
   - Performance requirements (sensitivity, specificity, AUC)
   - User needs documented

3. Architectural Design
   - System architecture documented
   - Interfaces to FHIR server documented

4. Detailed Design
   - Algorithm design documented
   - Training data sources documented
   - Feature engineering documented

5. Implementation
   - Code review process
   - Unit tests with coverage targets

6. Verification & Validation
   - Model performance on hold-out test set
   - Clinical validation (prospective study or retrospective with clinical review)
   - Edge case testing (rare conditions, missing data)

7. Risk Management (ISO 14971)
   - FMEA (Failure Mode and Effects Analysis)
   - Risk-benefit analysis

8. Post-Market Surveillance
   - Performance monitoring in production
   - Drift detection
   - Incident reporting to FDA (MDR if adverse event)
```

---

## AI Model Documentation Requirements

Every AI model deployed in clinical context must have a **Model Card** (following Google/FDA AI Model Card guidance):

```markdown
# Model Card: Hospitalization Risk v3

## Model Details
- Developer: [Organization Name]
- Model date: 2024-01-15
- Model version: 3.0
- Model type: XGBoost gradient boosted decision tree
- License: Proprietary

## Intended Use
- Primary use: Identify patients at elevated risk of 30-day hospitalization for proactive outreach
- Primary users: Care managers, population health nurses
- Out-of-scope: NOT for individual clinical decision-making; NOT for ED triage

## Training Data
- Source: 3 years of EHR encounter data, [Organization], de-identified per HIPAA Safe Harbor
- Size: 48,234 patients, 182,445 encounters
- Timeframe: 2021-01-01 to 2023-12-31
- Label: 30-day hospitalization (binary)

## Performance
| Metric | Value |
|--------|-------|
| AUC-ROC | 0.79 |
| Sensitivity at 0.20 threshold | 0.61 |
| Specificity at 0.20 threshold | 0.84 |
| PPV | 0.38 |
| NPV | 0.93 |

## Fairness Evaluation
| Subgroup | AUC-ROC |
|----------|---------|
| Male | 0.80 |
| Female | 0.78 |
| Age < 65 | 0.77 |
| Age ≥ 65 | 0.82 |
| White | 0.80 |
| Black/African American | 0.76 |
| Hispanic/Latino | 0.74 |

Note: Lower AUC in Hispanic/Latino subgroup — under investigation. Do not use as sole criterion for this population.

## Caveats and Recommendations
- Model performs best for patients with ≥ 1 year of encounter history
- Missing medication adherence data degrades performance
- Retrain annually or when population shifts detected

## Model Updates
- v1.0 (2022): Logistic regression baseline
- v2.0 (2023): Added social determinants (ADI)
- v3.0 (2024): XGBoost, added medication PDC feature
```

---

## Production AI Monitoring

### Drift Detection

```python
# app/services/ai_governance/drift_detector.py

from scipy import stats
import numpy as np

class ModelDriftDetector:
    """
    Detects statistical drift in model inputs (feature drift)
    and outputs (prediction drift) that may signal model degradation.
    """
    PSI_THRESHOLD = 0.2         # Population Stability Index — alert if > 0.2
    PERFORMANCE_ALERT_DROP = 0.05  # Alert if AUC drops 5 points

    async def check_feature_drift(self, model_id: str, org_id: str) -> dict:
        """Compare feature distributions: training baseline vs. last 30 days."""
        baseline = await self._get_baseline_distribution(model_id)
        current = await self._get_current_distribution(model_id, org_id, days=30)

        alerts = []
        for feature in baseline.keys():
            psi = self._calculate_psi(baseline[feature], current.get(feature, []))
            if psi > self.PSI_THRESHOLD:
                alerts.append({
                    "feature": feature,
                    "psi": round(psi, 3),
                    "severity": "high" if psi > 0.5 else "medium",
                    "message": f"Feature '{feature}' distribution shifted significantly (PSI={psi:.3f}). Consider retraining.",
                })

        return {"model_id": model_id, "checked_at": datetime.utcnow().isoformat(), "drift_alerts": alerts}

    def _calculate_psi(self, expected: list, actual: list) -> float:
        """Population Stability Index — measure of distribution shift."""
        expected_arr = np.array(expected) + 0.0001  # avoid log(0)
        actual_arr = np.array(actual) + 0.0001
        expected_arr /= expected_arr.sum()
        actual_arr /= actual_arr.sum()
        psi = np.sum((actual_arr - expected_arr) * np.log(actual_arr / expected_arr))
        return float(psi)

    async def check_prediction_drift(self, model_id: str, org_id: str) -> dict:
        """Alert if the distribution of risk scores has shifted significantly."""
        baseline_scores = await self._get_baseline_scores(model_id)
        current_scores = await self._get_recent_scores(model_id, org_id, days=30)

        ks_stat, p_value = stats.ks_2samp(baseline_scores, current_scores)
        return {
            "model_id": model_id,
            "ks_statistic": round(float(ks_stat), 4),
            "p_value": round(float(p_value), 4),
            "alert": p_value < 0.05,
            "message": "Score distribution has shifted significantly — investigate data pipeline or retrain." if p_value < 0.05 else "No significant drift detected.",
        }
```

### Performance Monitoring (Ground Truth Feedback Loop)

```python
class ModelPerformanceMonitor:
    """
    Compares predictions to actual outcomes to measure real-world performance.
    Requires outcomes data (hospitalizations that actually occurred).
    """

    async def evaluate_hospitalization_model(self, org_id: str, lookback_days: int = 90) -> dict:
        """
        For patients scored 90 days ago:
        - What was their predicted probability?
        - Did they actually get hospitalized?
        Calculate real-world AUC-ROC.
        """
        cutoff = date.today() - timedelta(days=lookback_days)

        async with session_factory() as session:
            # Get all risk scores from 90 days ago
            result = await session.execute(
                text("""
                    SELECT r.patient_id, r.score,
                           EXISTS(
                               SELECT 1 FROM encounter e
                               WHERE e.patient_id = r.patient_id
                               AND e.class_code = 'IMP'   -- inpatient
                               AND e.period_start >= r.scored_at
                               AND e.period_start <= r.scored_at + interval '30 days'
                           ) AS was_hospitalized
                    FROM patient_risk_scores r
                    WHERE r.org_id = :org_id
                      AND r.model_id = 'hospitalization_risk_v3'
                      AND r.scored_at = :cutoff
                """),
                {"org_id": org_id, "cutoff": cutoff},
            )
            rows = result.fetchall()

        scores = [r[1] for r in rows]
        labels = [int(r[2]) for r in rows]
        auc = roc_auc_score(labels, scores) if len(set(labels)) > 1 else None

        # Alert if AUC dropped more than threshold
        baseline_auc = 0.79  # from model card
        alert = auc and (baseline_auc - auc) > self.PERFORMANCE_ALERT_DROP

        return {
            "model": "hospitalization_risk_v3",
            "evaluation_period": f"Scores from {cutoff}, outcomes 30 days after",
            "n_patients": len(rows),
            "auc_roc": round(auc, 4) if auc else "insufficient_data",
            "baseline_auc": baseline_auc,
            "performance_alert": alert,
            "message": f"Model AUC dropped from {baseline_auc} to {auc:.3f} — consider retraining." if alert else "Performance within expected range.",
        }
```

---

## Immutable AI Audit Trail

Every AI call — inference, agent action, ambient extraction — must be logged:

```sql
CREATE TABLE ai_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(50) NOT NULL,    -- 'inference', 'agent_action', 'ambient_extraction'
    model_id        VARCHAR(100),
    model_version   VARCHAR(20),
    patient_id      BIGINT REFERENCES patient(id),
    org_id          UUID NOT NULL,
    user_id         VARCHAR NOT NULL,
    input_hash      VARCHAR(64) NOT NULL,    -- SHA-256 of input (for reproducibility)
    output_hash     VARCHAR(64) NOT NULL,    -- SHA-256 of output
    prediction      JSONB,                  -- for inference: { score, tier }
    action_taken    TEXT,                   -- for agents: what was approved/executed
    clinician_override BOOLEAN DEFAULT FALSE,
    latency_ms      INTEGER,
    token_count     INTEGER,                -- for LLM calls
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Append-only: prevent modification of audit records
CREATE RULE no_update_ai_audit AS ON UPDATE TO ai_audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_ai_audit AS ON DELETE TO ai_audit_log DO INSTEAD NOTHING;
```

---

## FDA Mandatory Device Reporting (MDR)

If an AI feature contributes to or causes a serious adverse event:

```python
class MDRReporter:
    """FDA Medical Device Reporting — 21 CFR Part 803."""

    async def report_adverse_event(
        self,
        model_id: str,
        patient_id: int,
        event_description: str,
        event_severity: str,  # "death", "serious_injury", "malfunction"
        reporter_name: str,
    ) -> dict:
        """
        File an MDR with FDA's MedWatch.
        Required within:
        - 30 days: if caused or contributed to serious injury
        - 5 days: if caused death or if anticipation of recurrence
        """
        mdr_payload = {
            "event_date": date.today().isoformat(),
            "report_type": "initial",
            "device": {
                "brand_name": "FHIR EMR AI",
                "model_number": model_id,
                "manufacturer": settings.ORGANIZATION_NAME,
                "510k_number": settings.FDA_510K_NUMBER,
            },
            "event_description": event_description,
            "severity": event_severity,
            "patient_sequence": str(patient_id),
        }

        # Submit via FDA ESG (Electronic Submissions Gateway)
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://esg.fda.gov/ESGWebPortal/submitForms.action",
                json=mdr_payload,
                headers={"Authorization": f"Bearer {settings.FDA_ESG_TOKEN}"},
            ) as resp:
                return {"mdr_id": (await resp.json()).get("submission_id")}
```

---

## AI Governance Checklist

Before shipping any AI feature that influences clinical decisions:

- [ ] Feature classified under FDA risk tier (Non-device / Safe Harbor / SaMD)
- [ ] Model Card written and reviewed by clinical staff
- [ ] Clinical validation study completed (prospective or retrospective with ground truth)
- [ ] Fairness evaluation across demographic subgroups (race, sex, age)
- [ ] Clinician override mechanism present for all CDS outputs
- [ ] Explanation / rationale shown to clinician (SHAP contributors for ML, sources for RAG)
- [ ] Immutable AI audit log operational
- [ ] Drift detection job scheduled (weekly)
- [ ] Performance monitoring job scheduled (monthly)
- [ ] Incident response plan: who is notified if AI causes adverse event
- [ ] BAA signed with all AI providers (Anthropic, OpenAI) covering PHI
- [ ] PHI scrubbed from all AI provider API calls (or explicit BAA allows it)
- [ ] Token cost budgets set per feature to prevent runaway spend
- [ ] Data governance policy: patient right to opt out of AI-assisted care

---

## Estimated Effort

| Component | Days |
|---|---|
| FDA classification analysis (legal + regulatory) | 5 |
| QMS documentation (IEC 62304 compliance) | 10 |
| Model Cards for all deployed models | 3 |
| Drift detection service | 2 |
| Performance monitoring (ground truth feedback loop) | 3 |
| Immutable AI audit log | 1 |
| MDR reporting integration | 2 |
| Fairness evaluation pipeline | 2 |
| Clinical validation study design | 5 |
| **Total** | **33 days** |

Note: QMS and FDA submission work requires a regulatory affairs consultant and clinical advisors — not purely an engineering effort.
