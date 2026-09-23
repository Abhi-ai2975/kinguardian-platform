# Clinical Workflow Automation Patterns

This document covers common automation use cases for an AI-enabled EMR,  
mapped to our Python automation handler framework.

---

## 1. Critical Value Alerting

**Trigger:** New `Observation` with critical lab value  
**Action:** Create `Task` for responsible clinician, send notification

```python
CRITICAL_THRESHOLDS = {
    "2345-7":  {"low": 60,  "high": 400, "unit": "mg/dL",    "name": "Glucose"},
    "2823-3":  {"low": 2.5, "high": 6.0, "unit": "mEq/L",    "name": "Potassium"},
    "2951-2":  {"low": 125, "high": 160, "unit": "mEq/L",    "name": "Sodium"},
    "718-7":   {"low": 7.0, "high": 20,  "unit": "g/dL",     "name": "Hemoglobin"},
    "6768-6":  {"low": 0,   "high": 500, "unit": "U/L",      "name": "Troponin"},
}

@automation.on("Observation?category=laboratory")
async def alert_critical_lab_value(ctx: AutomationContext):
    obs = ctx.resource
    loinc = get_loinc(obs)
    threshold = CRITICAL_THRESHOLDS.get(loinc)
    if not threshold:
        return
    value = obs.get("valueQuantity", {}).get("value")
    if value is None or (threshold["low"] <= value <= threshold["high"]):
        return
    # Critical! Alert
    direction = "critically high" if value > threshold["high"] else "critically low"
    await create_urgent_task(ctx, f"{threshold['name']} is {direction}: {value} {threshold['unit']}")
    await send_secure_message(ctx, f"CRITICAL: {threshold['name']} = {value}")
```

---

## 2. Appointment Reminder

**Trigger:** `Appointment` created with status `booked`  
**Action:** Schedule SMS/email reminder 24h and 1h before

```python
@automation.on("Appointment?status=booked")
async def schedule_appointment_reminders(ctx: AutomationContext):
    appt = ctx.resource
    start = datetime.fromisoformat(appt["start"].rstrip("Z"))
    patient_ref = next(
        p["actor"]["reference"]
        for p in appt.get("participant", [])
        if p.get("actor", {}).get("reference", "").startswith("Patient/")
    )
    # 24 hours before
    await ctx.notification_svc.schedule(
        recipient=patient_ref,
        send_at=start - timedelta(hours=24),
        channel="sms",
        template="appointment_reminder_24h",
        context={"appointment": appt},
    )
    # 1 hour before
    await ctx.notification_svc.schedule(
        recipient=patient_ref,
        send_at=start - timedelta(hours=1),
        channel="sms",
        template="appointment_reminder_1h",
        context={"appointment": appt},
    )
```

---

## 3. Automated Eligibility Verification

**Trigger:** New `Patient` or `Coverage` resource created  
**Action:** Query payer API for eligibility, create/update `Coverage` resource

```python
@automation.on("Coverage")
async def verify_eligibility(ctx: AutomationContext):
    if ctx.operation != "create":
        return
    coverage = ctx.resource
    payer_id = coverage.get("payor", [{}])[0].get("identifier", {}).get("value")
    if not payer_id:
        return
    # Call external eligibility API (e.g., Availity, Change Healthcare)
    result = await eligibility_client.check(
        payer_id=payer_id,
        member_id=coverage.get("subscriberId"),
        patient_ref=coverage["beneficiary"]["reference"],
    )
    # Update coverage with eligibility status
    await ctx.coverage_repo.patch(
        extract_id(coverage["id"]),
        {"status": "active" if result.eligible else "cancelled"},
        ctx.user_id, ctx.org_id,
    )
```

---

## 4. Automatic Claim Generation

**Trigger:** `Encounter` status changes to `finished`  
**Action:** Create a `Claim` resource from the encounter + diagnoses + procedures

```python
@automation.on("Encounter?status=finished")
async def auto_generate_claim(ctx: AutomationContext):
    if ctx.operation != "update":
        return
    encounter = ctx.resource
    enc_id = int(encounter["id"])

    # Fetch linked clinical data
    conditions = await ctx.condition_repo.list_by_encounter(enc_id, ctx.user_id, ctx.org_id)
    procedures = await ctx.procedure_repo.list_by_encounter(enc_id, ctx.user_id, ctx.org_id)
    patient_ref = encounter["subject"]["reference"]

    # Build FHIR Claim
    claim = {
        "resourceType": "Claim",
        "status": "draft",
        "use": "claim",
        "patient": { "reference": patient_ref },
        "created": datetime.utcnow().isoformat() + "Z",
        "provider": encounter.get("participant", [{}])[0].get("individual", {}),
        "priority": { "coding": [{ "code": "normal" }] },
        "diagnosis": [
            {
                "sequence": i + 1,
                "diagnosisCodeableConcept": cond["code"],
            }
            for i, cond in enumerate(to_fhir(c) for c in conditions)
        ],
        "procedure": [
            {
                "sequence": i + 1,
                "procedureCodeableConcept": proc["code"],
            }
            for i, proc in enumerate(to_fhir(p) for p in procedures)
        ],
    }
    await ctx.claim_repo.create(ClaimCreateSchema(**claim), ctx.user_id, ctx.org_id)
```

---

## 5. Care Gap Closure

**Trigger:** New `Condition` matching a care gap criterion  
**Action:** Check if patient has an open quality measure gap; if so, close it

```python
CARE_GAP_CLOSURES = {
    "73211009": "diabetes_screening",   # SNOMED: DM Type 2 → trigger A1c gap
    "44054006": "hba1c_monitoring",
}

@automation.on("Condition?clinicalStatus=active")
async def check_care_gap_closure(ctx: AutomationContext):
    condition = ctx.resource
    snomed = get_snomed(condition)
    gap_type = CARE_GAP_CLOSURES.get(snomed)
    if not gap_type:
        return
    patient_ref = condition["subject"]["reference"]
    open_gap = await ctx.care_gap_repo.find_open(patient_ref, gap_type)
    if open_gap:
        await ctx.care_gap_repo.close(open_gap.id, reason="Condition documented", ctx=ctx)
```

---

## 6. Drug Interaction Check

**Trigger:** New `MedicationRequest` created  
**Action:** Check against existing active medications for interactions

```python
@automation.on("MedicationRequest?status=active")
async def check_drug_interactions(ctx: AutomationContext):
    new_med = ctx.resource
    patient_ref = new_med["subject"]["reference"]
    patient_id = int(patient_ref.split("/")[1])

    # Fetch current active medications
    current_meds = await ctx.med_request_repo.list(
        user_id=ctx.user_id, org_id=ctx.org_id, subject_id=patient_id, status="active"
    )
    new_rxnorm = get_rxnorm(new_med)
    interactions = []
    for med in current_meds:
        existing_rxnorm = get_rxnorm(to_fhir(med))
        result = await drug_interaction_api.check(new_rxnorm, existing_rxnorm)
        if result.severity in ("major", "contraindicated"):
            interactions.append(result)

    if interactions:
        # Create an alert Task
        await create_urgent_task(
            ctx,
            f"Drug interaction detected: {new_rxnorm} interacts with {[i.drug2 for i in interactions]}",
            for_ref=patient_ref,
        )
```

---

## 7. AI-Assisted Encounter Note Generation

**Trigger:** `Encounter` status changes to `finished`  
**Action:** Generate a draft clinical note using AI and save as `DocumentReference`

```python
@automation.on("Encounter?status=finished")
async def generate_encounter_note(ctx: AutomationContext):
    if ctx.operation != "update":
        return
    encounter = ctx.resource
    patient_ref = encounter["subject"]["reference"]
    patient_id = int(patient_ref.split("/")[1])

    # Collect clinical context
    context_resources = await gather_encounter_context(encounter, patient_id, ctx)

    # Generate note with AI
    prompt = "Generate a brief clinical encounter note in SOAP format based on the clinical data provided."
    note_text = await ctx.ai_client.complete(
        model="claude-sonnet-4-6",
        system=build_clinical_system_prompt(context_resources),
        prompt=prompt,
    )

    # Save as DocumentReference (draft)
    await ctx.doc_ref_repo.create({
        "status": "current",
        "type": { "coding": [{ "system": "http://loinc.org", "code": "11506-3", "display": "Progress note" }] },
        "subject": { "reference": patient_ref },
        "context": { "encounter": [{ "reference": f"Encounter/{encounter['id']}" }] },
        "content": [{
            "attachment": { "contentType": "text/plain", "data": base64.b64encode(note_text.encode()).decode() }
        }],
        "description": "AI-generated draft note (requires clinician review)",
    }, ctx.user_id, ctx.org_id)
```

---

## Workflow Orchestration

For complex multi-step workflows (e.g., referral management, prior authorization),  
we need a state machine:

```python
# app/automation/workflow.py

class WorkflowStateMachine:
    def __init__(self, workflow_def: dict):
        self.states = workflow_def["states"]
        self.transitions = workflow_def["transitions"]

    async def advance(self, task: dict, event: str, ctx: AutomationContext) -> dict:
        current_state = task["status"]
        transition = self._find_transition(current_state, event)
        if not transition:
            raise InvalidTransitionError(f"No transition from {current_state} on {event}")
        new_state = transition["to"]
        action = transition.get("action")
        if action:
            await self._execute_action(action, task, ctx)
        return await ctx.task_repo.patch(
            task["id"], {"status": new_state}, ctx.user_id, ctx.org_id
        )
```
