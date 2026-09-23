# RPM Alerts & Care Automation

RPM data is only valuable if it triggers action. This file covers the alert engine that watches device observations and automatically notifies clinicians, creates tasks, and closes care loops.

---

## Alert Types

| Alert Tier | Example | Response |
|---|---|---|
| **Critical (immediate)** | Glucose < 54 mg/dL (severe hypoglycemia) | Push notification to patient + urgent Task to on-call |
| **Urgent (same day)** | Systolic BP > 180 mmHg | Task for care manager, message to patient |
| **Warning (24-48h)** | HbA1c trend worsening over 30 days | Task for PCP, schedule follow-up |
| **Informational** | Weekly glucose summary | Message to patient's care team |

---

## Alert Threshold Configuration

Thresholds are patient-specific (personalized) or fall back to population defaults:

```sql
CREATE TABLE rpm_alert_thresholds (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT REFERENCES patient(id),   -- NULL = org-wide default
    org_id          UUID NOT NULL,
    loinc_code      VARCHAR(20) NOT NULL,
    alert_type      VARCHAR(20) NOT NULL,   -- 'critical_low', 'critical_high', 'warning_low', 'warning_high', 'trend'
    threshold_value NUMERIC(12, 4),
    threshold_unit  VARCHAR(20),
    trend_direction VARCHAR(10),            -- 'rising', 'falling'
    trend_duration_days INTEGER,
    trend_magnitude NUMERIC(8, 4),
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Default thresholds (patient_id IS NULL):
INSERT INTO rpm_alert_thresholds (patient_id, org_id, loinc_code, alert_type, threshold_value, threshold_unit) VALUES
(NULL, org_id, '99504-3', 'critical_low',  54,  'mg/dL'),   -- CGM: severe hypoglycemia
(NULL, org_id, '99504-3', 'critical_high', 300, 'mg/dL'),   -- CGM: severe hyperglycemia
(NULL, org_id, '99504-3', 'warning_low',   70,  'mg/dL'),   -- CGM: hypoglycemia warning
(NULL, org_id, '99504-3', 'warning_high',  250, 'mg/dL'),   -- CGM: hyperglycemia warning
(NULL, org_id, '8480-6',  'critical_high', 180, 'mmHg'),    -- BP systolic crisis
(NULL, org_id, '8480-6',  'warning_high',  160, 'mmHg'),    -- BP systolic stage 2
(NULL, org_id, '59408-5', 'critical_low',  90,  '%'),       -- SpO2 critical
(NULL, org_id, '59408-5', 'warning_low',   94,  '%'),       -- SpO2 warning
(NULL, org_id, '29463-7', 'trend', NULL, 'kg', NULL, 'rising', 14, 2.0);  -- weight gain >2kg/2 weeks
```

---

## Alert Engine

```python
# app/services/rpm/alert_engine.py

class RPMAlertEngine:
    """
    Runs after each batch of device observations is inserted.
    Checks thresholds and triggers appropriate responses.
    """

    async def evaluate(self, patient_id: int, org_id: str, loinc_code: str, new_observations: list[dict]):
        thresholds = await self._get_thresholds(patient_id, org_id, loinc_code)
        alerts_fired = []

        for obs in new_observations:
            value = obs.get("value_quantity")
            if value is None:
                continue

            for threshold in thresholds:
                fired = self._evaluate_threshold(value, threshold)
                if fired:
                    alert = await self._create_alert(obs, threshold, patient_id, org_id)
                    alerts_fired.append(alert)
                    await self._dispatch_alert(alert, threshold["alert_type"], patient_id, org_id)

        # Also run trend analysis after single-point checks
        await self._evaluate_trends(patient_id, org_id, loinc_code)
        return alerts_fired

    def _evaluate_threshold(self, value: float, threshold: dict) -> bool:
        t_type = threshold["alert_type"]
        t_val = threshold["threshold_value"]
        if t_type == "critical_low" and value < t_val:
            return True
        if t_type == "warning_low" and value < t_val:
            return True
        if t_type == "critical_high" and value > t_val:
            return True
        if t_type == "warning_high" and value > t_val:
            return True
        return False

    async def _dispatch_alert(self, alert: dict, alert_type: str, patient_id: int, org_id: str):
        severity = "critical" if "critical" in alert_type else "warning"

        if severity == "critical":
            # 1. Immediate push notification to patient app
            await self.push_notification_service.send(
                patient_id,
                title="Health Alert",
                body=alert["message"],
                urgency="high",
            )
            # 2. Urgent Task to on-call provider
            await self.task_service.create({
                "status": "requested",
                "priority": "urgent",
                "code": {"coding": [{"code": "rpm-critical-alert"}]},
                "for": {"reference": f"Patient/{patient_id}"},
                "description": alert["message"],
                "authoredOn": datetime.utcnow().isoformat() + "Z",
            }, org_id=org_id, system_created=True)
            # 3. AuditEvent for HIPAA log
            await self.audit_service.log_rpm_alert(patient_id, org_id, alert["message"], severity)
        else:
            # Warning: create Task for care manager (not urgent)
            await self.task_service.create({
                "status": "requested",
                "priority": "routine",
                "code": {"coding": [{"code": "rpm-warning-alert"}]},
                "for": {"reference": f"Patient/{patient_id}"},
                "description": alert["message"],
            }, org_id=org_id, system_created=True)

    async def _evaluate_trends(self, patient_id: int, org_id: str, loinc_code: str):
        """Check for concerning trends over a time window (e.g., weight gain)."""
        trend_thresholds = await self._get_trend_thresholds(patient_id, org_id, loinc_code)
        for tt in trend_thresholds:
            start = datetime.utcnow() - timedelta(days=tt["trend_duration_days"])
            readings = await self.obs_repo.get_time_series(patient_id, org_id, loinc_code, start, datetime.utcnow())
            if len(readings) < 2:
                continue
            first_val = readings[0]["value_quantity"]
            last_val = readings[-1]["value_quantity"]
            delta = last_val - first_val
            if tt["trend_direction"] == "rising" and delta >= tt["trend_magnitude"]:
                await self._dispatch_alert({
                    "message": f"{loinc_code} has increased by {delta:.1f} {tt.get('threshold_unit', '')} over {tt['trend_duration_days']} days",
                }, "warning", patient_id, org_id)
```

---

## Glucose Management Automation

For CGM patients, the alert engine integrates with clinical automation:

```python
@automation_registry.register("glucose-critical-low")
async def handle_hypoglycemia(ctx: AutomationContext):
    """
    Triggered when glucose < 54 mg/dL (severe hypoglycemia per ADA criteria).
    Creates a clinical Flag, urgent Task, and patient Communication.
    """
    patient_id = ctx.patient_id
    glucose_value = ctx.trigger_value

    # 1. Update or create Flag on patient
    await flag_service.upsert({
        "status": "active",
        "category": [{"coding": [{"code": "clinical"}]}],
        "code": {"coding": [{"system": "http://snomed.info/sct", "code": "302866003", "display": "Hypoglycemia"}],
                 "text": f"SEVERE HYPOGLYCEMIA ALERT: Last CGM reading {glucose_value} mg/dL"},
        "subject": {"reference": f"Patient/{patient_id}"},
        "period": {"start": datetime.utcnow().isoformat() + "Z"},
    }, patient_id=patient_id)

    # 2. Create RiskAssessment
    await risk_assessment_service.create({
        "status": "final",
        "method": {"coding": [{"code": "cgm-alert"}]},
        "subject": {"reference": f"Patient/{patient_id}"},
        "prediction": [{"qualitativeRisk": {"coding": [{"code": "high"}]}, "rationale": f"CGM glucose {glucose_value} mg/dL < 54 mg/dL threshold"}],
        "mitigation": "Patient should consume 15-20g fast-acting carbohydrates immediately. Recheck in 15 minutes.",
    })

    # 3. Send patient push notification with instructions
    await push_service.send_critical(
        patient_id,
        title="⚠️ Low Blood Sugar",
        body=f"Your glucose is {glucose_value} mg/dL. Eat 15g of fast-acting carbs NOW (juice, glucose tablets). Recheck in 15 min.",
    )
```

---

## RPM Billing — Time Tracking

CMS requires tracking time spent reviewing RPM data for billing:

```sql
CREATE TABLE rpm_time_log (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patient(id),
    org_id          UUID NOT NULL,
    practitioner_id BIGINT NOT NULL REFERENCES practitioner(id),
    month           DATE NOT NULL,               -- first day of billing month
    minutes_spent   INTEGER NOT NULL DEFAULT 0,
    cpt_qualifying  VARCHAR(10)[],               -- which CPT codes earned this month
    session_notes   TEXT,
    logged_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (patient_id, practitioner_id, month)
);
```

```python
class RPMBillingService:
    CPT_THRESHOLDS = {
        "99457": 20,   # 20 minutes minimum
        "99458": 40,   # additional 20 minutes (add-on)
    }

    async def log_review_time(self, patient_id: int, practitioner_id: int, org_id: str, minutes: int):
        month = date.today().replace(day=1)
        async with session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO rpm_time_log (patient_id, org_id, practitioner_id, month, minutes_spent)
                    VALUES (:patient_id, :org_id, :practitioner_id, :month, :minutes)
                    ON CONFLICT (patient_id, practitioner_id, month)
                    DO UPDATE SET minutes_spent = rpm_time_log.minutes_spent + EXCLUDED.minutes_spent
                """),
                {"patient_id": patient_id, "org_id": org_id, "practitioner_id": practitioner_id, "month": month, "minutes": minutes},
            )

    async def get_billable_patients(self, org_id: str, month: date) -> list[dict]:
        """Return patients who have met CPT 99457 (≥20 min review) this month."""
        async with session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT tl.patient_id, p.family_name, p.given_name, tl.minutes_spent,
                           CASE WHEN tl.minutes_spent >= 40 THEN ARRAY['99457', '99458']
                                WHEN tl.minutes_spent >= 20 THEN ARRAY['99457']
                                ELSE ARRAY[]::varchar[] END AS qualifying_cpts
                    FROM rpm_time_log tl
                    JOIN patient p ON p.id = tl.patient_id
                    WHERE tl.org_id = :org_id AND tl.month = :month AND tl.minutes_spent >= 20
                    ORDER BY tl.minutes_spent DESC
                """),
                {"org_id": org_id, "month": month},
            )
            return [dict(r) for r in result]
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Alert threshold table + API | 1 |
| Alert engine (point + trend checks) | 3 |
| Push notification service | 1 |
| Hypoglycemia automation handler | 1 |
| RPM billing time log + billing dashboard | 2 |
| Alert history API (`GET /rpm-alerts?patient=...`) | 1 |
| **Total** | **9 days** |
