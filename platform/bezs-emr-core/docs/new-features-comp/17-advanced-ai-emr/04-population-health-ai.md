# Population Health AI — Predictive Analytics at Scale

**Tech:** Celery beat, scikit-learn / XGBoost, PostgreSQL analytics queries  
**Status:** Not implemented  
**Comparable:** Epic Predictive Risk Models, Arcadia Analytics, Lightbeam Health

---

## What Is Population Health AI?

Population health AI shifts care from **reactive** (patient shows up sick) to **proactive** (identify who will get sick before it happens, then intervene).

Instead of a single patient query, population health runs **batch scoring across your entire patient panel** nightly:

| Prediction | What It Enables |
|---|---|
| 30-day hospitalization risk | Outreach to high-risk patients before admission |
| ED utilization prediction | Assign care managers to frequent ED visitors |
| No-show prediction | Double-book or call high no-show patients |
| Care gap closure urgency | Prioritize outreach to patients most overdue |
| Medication non-adherence | Identify patients who stopped refilling |
| HbA1c deterioration | Intervene before A1c worsens |
| Fall risk trend | Update Flag before a fall occurs |
| Care management ROI | Identify which interventions saved the most |

---

## Architecture

```
Nightly Celery beat job (2 AM)
         ↓
Feature extraction from FHIR database
  → encounter frequency, diagnosis codes, labs, demographics, meds, gaps
         ↓
Risk model scoring (XGBoost / scikit-learn)
  → score per patient per outcome
         ↓
Results written to risk_scores table
         ↓
Population health dashboard queries this table
         ↓
Automated outreach: create Tasks / Communications for highest-risk
```

---

## Feature Engineering from FHIR Data

```python
# app/services/population/feature_extractor.py

class PopulationFeatureExtractor:
    """Extracts ML features from each patient's FHIR data."""

    async def extract_features(self, patient_id: int, org_id: str, as_of: date) -> dict:
        lookback_90 = as_of - timedelta(days=90)
        lookback_365 = as_of - timedelta(days=365)
        lookback_730 = as_of - timedelta(days=730)

        # Encounter utilization features
        encounters = await self._count_encounters(patient_id, org_id, lookback_365)
        ed_visits = await self._count_ed_visits(patient_id, org_id, lookback_365)
        admissions = await self._count_admissions(patient_id, org_id, lookback_365)

        # Chronic condition burden
        conditions = await self._get_active_conditions(patient_id, org_id)
        chronic_count = len([c for c in conditions if self._is_chronic(c)])

        # Lab trends
        hba1c_trend = await self._get_lab_trend(patient_id, org_id, "4548-4", lookback_365)  # HbA1c
        bp_trend = await self._get_vital_trend(patient_id, org_id, "55284-4", lookback_90)    # BP systolic

        # Medication adherence (refill gaps)
        med_pdc = await self._calculate_pdc(patient_id, org_id, lookback_365)  # proportion of days covered

        # Care gaps
        gaps = await self._count_care_gaps(patient_id, org_id)

        # Socioeconomic (from demographics / address)
        patient = await self.patient_repo.get_by_id(patient_id, org_id)
        adi_score = await self._get_adi(patient.zip_code)  # Area Deprivation Index

        return {
            # Utilization
            "encounters_90d": encounters["last_90"],
            "encounters_365d": encounters["last_365"],
            "ed_visits_365d": ed_visits,
            "admissions_365d": admissions,
            "days_since_last_encounter": (as_of - encounters["last_date"]).days if encounters.get("last_date") else 999,

            # Clinical complexity
            "chronic_condition_count": chronic_count,
            "has_diabetes": int(any(c.code_snomed in DIABETES_CODES for c in conditions)),
            "has_heart_failure": int(any(c.code_snomed in HF_CODES for c in conditions)),
            "has_copd": int(any(c.code_snomed in COPD_CODES for c in conditions)),
            "has_ckd": int(any(c.code_snomed in CKD_CODES for c in conditions)),

            # Lab trends (slope = 0 means stable, + = worsening, - = improving)
            "hba1c_last": hba1c_trend["last_value"],
            "hba1c_slope": hba1c_trend["slope"],
            "hba1c_uncontrolled": int((hba1c_trend["last_value"] or 0) > 9.0),
            "bp_systolic_last": bp_trend["last_value"],
            "bp_uncontrolled": int((bp_trend["last_value"] or 0) > 140),

            # Adherence
            "medication_pdc": med_pdc,  # 0.0–1.0, < 0.8 = non-adherent

            # Care gaps
            "open_care_gaps": gaps,

            # Social determinants
            "adi_national_rank": adi_score,  # 1-100, higher = more deprived

            # Demographics
            "age": (as_of - patient.birth_date).days // 365 if patient.birth_date else 0,
            "sex_male": int(patient.gender == "male"),
        }
```

---

## Risk Models

### 30-Day Hospitalization Risk

```python
# app/services/population/models/hospitalization_risk.py

import joblib
import numpy as np

class HospitalizationRiskModel:
    """
    XGBoost model predicting 30-day hospitalization probability.
    Trained on 2 years of encounter data (de-identified).
    AUC-ROC: 0.79 (validated on hold-out set).
    """
    FEATURES = [
        "encounters_90d", "encounters_365d", "ed_visits_365d", "admissions_365d",
        "chronic_condition_count", "has_diabetes", "has_heart_failure", "has_copd", "has_ckd",
        "hba1c_last", "hba1c_uncontrolled", "bp_uncontrolled",
        "medication_pdc", "open_care_gaps", "adi_national_rank", "age", "sex_male",
    ]
    RISK_THRESHOLD_HIGH = 0.20      # top risk tier
    RISK_THRESHOLD_MODERATE = 0.10  # medium risk tier

    def __init__(self):
        self.model = joblib.load(settings.MODELS_PATH / "hospitalization_risk_v3.pkl")

    def predict(self, features: dict) -> dict:
        X = np.array([[features.get(f, 0) for f in self.FEATURES]])
        probability = float(self.model.predict_proba(X)[0][1])

        risk_tier = (
            "high" if probability >= self.RISK_THRESHOLD_HIGH
            else "moderate" if probability >= self.RISK_THRESHOLD_MODERATE
            else "low"
        )

        # SHAP feature contributions for explainability
        shap_values = self.model.get_booster().predict(
            xgb.DMatrix(X), pred_contribs=True
        )[0]
        top_contributors = sorted(
            zip(self.FEATURES, shap_values),
            key=lambda x: abs(x[1]),
            reverse=True,
        )[:3]

        return {
            "score": round(probability, 4),
            "risk_tier": risk_tier,
            "top_contributors": [{"feature": f, "contribution": round(v, 3)} for f, v in top_contributors],
        }
```

### No-Show Prediction

```python
class NoShowRiskModel:
    """
    Logistic regression model predicting appointment no-show.
    Features: historical no-show rate, appointment type, time of day, 
              day of week, lead time, distance from clinic, weather API.
    AUC-ROC: 0.74
    """
    FEATURES = [
        "prior_no_show_rate_12m",       # % of past appointments missed
        "appointment_type_encoded",      # wellness=0, acute=1, followup=2
        "hour_of_day",                   # 8-17
        "day_of_week",                   # 0=Monday
        "lead_time_days",                # days from booking to appointment
        "distance_km",                   # patient address to clinic
        "has_reminder_opted_in",         # SMS/email opt-in
        "adi_national_rank",             # social deprivation
    ]
```

---

## Risk Score Database

```sql
CREATE TABLE patient_risk_scores (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patient(id),
    org_id          UUID NOT NULL,
    model_id        VARCHAR(100) NOT NULL,       -- 'hospitalization_risk_v3'
    model_version   VARCHAR(20) NOT NULL,
    score           NUMERIC(6, 4) NOT NULL,      -- 0.0000–1.0000
    risk_tier       VARCHAR(20) NOT NULL,        -- low|moderate|high|critical
    features_used   JSONB NOT NULL,
    top_contributors JSONB,
    scored_at       DATE NOT NULL,               -- which day this score was for
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (patient_id, model_id, scored_at)
);

CREATE INDEX idx_risk_scores_org_model ON patient_risk_scores (org_id, model_id, scored_at DESC, risk_tier);
```

---

## Population Health Dashboard Queries

```python
# app/routers/population_health.py

@pop_router.get(
    "/population-health/risk-summary",
    operation_id="get_risk_summary",
    summary="Population risk summary for current organization",
)
async def get_risk_summary(
    model: str = Query("hospitalization_risk_v3"),
    risk_tier: str | None = Query(None),
    limit: int = Query(50),
    request: Request = ...,
):
    user = request.state.user
    today = date.today()

    async with session_factory() as session:
        result = await session.execute(
            text("""
                SELECT
                    r.risk_tier,
                    COUNT(*) as patient_count,
                    AVG(r.score) as avg_score,
                    COUNT(*) FILTER (WHERE r.score >= 0.20) as critical_count
                FROM patient_risk_scores r
                WHERE r.org_id = :org_id
                  AND r.model_id = :model
                  AND r.scored_at = :today
                  AND (:tier IS NULL OR r.risk_tier = :tier)
                GROUP BY r.risk_tier
                ORDER BY avg_score DESC
            """),
            {"org_id": user["activeOrganizationId"], "model": model, "today": today, "tier": risk_tier},
        )
        summary = [dict(row) for row in result]

    return {"model": model, "as_of": str(today), "summary": summary}


@pop_router.get(
    "/population-health/high-risk-patients",
    operation_id="get_high_risk_patients",
    summary="List patients with high hospitalization risk",
)
async def get_high_risk_patients(
    model: str = Query("hospitalization_risk_v3"),
    limit: int = Query(20),
    request: Request = ...,
):
    user = request.state.user
    today = date.today()

    async with session_factory() as session:
        rows = await session.execute(
            text("""
                SELECT p.patient_id, p.family_name, p.given_name, p.birth_date,
                       r.score, r.risk_tier, r.top_contributors,
                       r.scored_at
                FROM patient_risk_scores r
                JOIN patient p ON p.id = r.patient_id
                WHERE r.org_id = :org_id
                  AND r.model_id = :model
                  AND r.scored_at = :today
                  AND r.risk_tier IN ('high', 'critical')
                ORDER BY r.score DESC
                LIMIT :limit
            """),
            {"org_id": user["activeOrganizationId"], "model": model, "today": today, "limit": limit},
        )

    return {"patients": [dict(r) for r in rows]}
```

---

## Automated Outreach

When a patient's hospitalization risk exceeds threshold, automatically create a care management task:

```python
# app/tasks/population_outreach.py

@celery.task
async def population_risk_outreach(org_id: str):
    """
    Run nightly after risk scoring.
    For each high-risk patient without a recent care manager contact:
    - Create a Task for the care manager
    - If care manager opt-in: create a scheduled Communication (SMS/portal message)
    """
    today = date.today()
    high_risk = await risk_repo.get_high_risk(org_id, model="hospitalization_risk_v3", scored_at=today)

    for patient_id, score, contributors in high_risk:
        # Check: has this patient been contacted in the last 30 days?
        recent_contact = await task_repo.has_recent_care_task(patient_id, org_id, days=30)
        if recent_contact:
            continue

        # Create care manager task
        explanation = "; ".join(f"{c['feature']}: {c['contribution']:+.2f}" for c in (contributors or [])[:2])
        await task_service.create({
            "status": "requested",
            "code": {"coding": [{"code": "population-health-outreach"}]},
            "for": {"reference": f"Patient/{patient_id}"},
            "description": f"High hospitalization risk ({score:.0%}). Top factors: {explanation}. Schedule care management call.",
            "priority": "urgent" if score >= 0.30 else "routine",
        }, org_id=org_id, system_created=True)
```

---

## Care Gap Engine

```python
class CareGapEngine:
    """
    Identifies HEDIS/NCQA care gaps for each patient.
    Gaps = recommended screenings/tests not done in the required timeframe.
    """
    MEASURES = [
        {"id": "HbA1c_testing", "name": "Diabetic: HbA1c every 6 months", "condition_codes": DIABETES_CODES, "loinc": "4548-4", "lookback_days": 180},
        {"id": "mammography", "name": "Breast Cancer Screening (age 50-75, female)", "age_min": 50, "age_max": 75, "sex": "female", "cpt": ["77067"], "lookback_days": 730},
        {"id": "colorectal_screening", "name": "Colorectal Cancer Screening (age 50-75)", "age_min": 50, "age_max": 75, "lookback_days": 3650},
        {"id": "bmi_assessment", "name": "BMI documented", "loinc": "39156-5", "lookback_days": 365},
        {"id": "tobacco_screening", "name": "Tobacco use screened", "loinc": "72166-2", "lookback_days": 365},
        {"id": "depression_screening", "name": "Depression screening (PHQ-9)", "loinc": "44249-1", "lookback_days": 365},
        {"id": "bp_control", "name": "BP < 140/90 (hypertensive patients)", "condition_codes": HTN_CODES, "loinc": "55284-4", "lookback_days": 180},
        {"id": "statin_use", "name": "Statin therapy (CVD patients)", "condition_codes": CVD_CODES, "lookback_days": 90},
    ]

    async def get_patient_gaps(self, patient_id: int, org_id: str) -> list[dict]:
        patient = await self.patient_repo.get_by_id(patient_id, org_id)
        today = date.today()
        gaps = []

        for measure in self.MEASURES:
            if not self._patient_eligible(patient, measure):
                continue
            fulfilled = await self._measure_fulfilled(patient_id, org_id, measure, today)
            if not fulfilled:
                gaps.append({
                    "measure_id": measure["id"],
                    "name": measure["name"],
                    "days_overdue": self._days_overdue(measure, patient, today),
                    "priority": "high" if measure.get("condition_codes") else "routine",
                })

        return gaps
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Feature extraction pipeline | 3 |
| Hospitalization risk model (training + serving) | 4 |
| No-show prediction model | 3 |
| HbA1c deterioration model | 2 |
| Risk score database + nightly scoring job | 2 |
| Population health dashboard API | 2 |
| Automated outreach task creation | 1 |
| Care gap engine (8 HEDIS measures) | 3 |
| SHAP explainability integration | 1 |
| **Total** | **21 days** |
