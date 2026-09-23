# AI Clinical Decision Support

AI-enhanced CDS goes beyond static rule-based alerts to provide dynamic, context-aware,  
evidence-informed recommendations at the point of care.

---

## 1. Predictive Risk Stratification

### Sepsis Early Warning

```python
# app/ai/risk_models/sepsis.py

SEPSIS_RISK_PROMPT = """You are a clinical risk stratification system.
Based on this patient's vital signs, lab results, and clinical history,
assess the risk of sepsis in the next 6 hours.

Return JSON:
{
  "risk_score": 0.0-1.0,
  "risk_level": "low|moderate|high|critical",
  "evidence": ["...", "..."],
  "recommended_actions": ["...", "..."],
  "qsofa_score": 0-3,
  "sirs_criteria_met": 0-4
}
"""

@automation.on("Observation?category=vital-signs")
async def sepsis_risk_check(ctx: AutomationContext):
    patient_id = int(ctx.resource["subject"]["reference"].split("/")[1])
    # Get recent vitals and labs
    vitals = await ctx.obs_repo.list_by_patient(patient_id, category="vital-signs", limit=10)
    labs = await ctx.obs_repo.list_by_patient(patient_id, category="laboratory", limit=20)

    context = {
        "vitals": [to_fhir_observation(v) for v in vitals],
        "labs": [to_fhir_observation(l) for l in labs],
    }

    response = await ctx.ai_client.complete(
        model="claude-sonnet-4-6",
        system=SEPSIS_RISK_PROMPT,
        prompt=json.dumps(context),
    )
    risk = json.loads(response)

    if risk["risk_level"] in ("high", "critical"):
        await create_urgent_task(ctx, f"SEPSIS ALERT: Risk score {risk['risk_score']:.0%}. {', '.join(risk['recommended_actions'])}")
        await send_push_notification(ctx, "Sepsis risk detected — immediate review recommended")
```

### 30-Day Readmission Risk

```python
READMISSION_RISK_PROMPT = """Assess the 30-day hospital readmission risk for this patient
being discharged. Consider LACE score components and social determinants.

Return JSON:
{
  "risk_score": 0.0-1.0,
  "lace_score": 0-19,
  "risk_factors": [...],
  "protective_factors": [...],
  "discharge_recommendations": [...]
}
"""

@automation.on("Encounter?status=finished")
async def readmission_risk_on_discharge(ctx: AutomationContext):
    patient_id = ...
    context = await gather_full_clinical_context(patient_id, ctx)
    risk = json.loads(await ctx.ai_client.complete("claude-sonnet-4-6", READMISSION_RISK_PROMPT, json.dumps(context)))

    if risk["risk_score"] > 0.4:  # 40%+ readmission risk
        await create_care_plan_task(ctx, "High readmission risk — intensive follow-up required", risk["discharge_recommendations"])
```

---

## 2. Differential Diagnosis Support

```python
# app/ai/differential_diagnosis.py

DDX_PROMPT = """You are a physician assistant helping generate a differential diagnosis.
Based on the patient's presentation (symptoms, exam findings, labs, history),
suggest the most likely diagnoses.

Return JSON:
{
  "differentials": [
    {
      "diagnosis": "...",
      "snomed_code": "...",
      "probability": "high|moderate|low",
      "supporting_evidence": [...],
      "against_evidence": [...],
      "recommended_workup": [...]
    }
  ],
  "red_flags": [...],
  "urgency": "routine|urgent|emergent"
}

Include up to 10 differentials ordered by probability.
"""

@router.post("/Patient/{patient_id}/$differential-diagnosis", operation_id="differential_diagnosis")
async def differential_diagnosis(
    patient_id: int,
    body: DDXRequest,
    request: Request,
    ai_svc=Depends(get_ai_service),
):
    """Generate a differential diagnosis based on patient presentation."""
    patient_context = await context_builder.build(patient_id, "summary", ...)
    presentation = body.presentation  # Chief complaint, HPI, symptoms

    response = await ai_svc.complete(
        model="claude-opus-4-8",  # Use strongest model for diagnosis
        system=DDX_PROMPT,
        prompt=f"Patient presentation:\n{presentation}\n\nPatient context:\n{patient_context}",
    )

    result = json.loads(response)

    # Record as AuditEvent
    await audit_svc.log_ai_usage(
        action="differential_diagnosis",
        patient_id=patient_id,
        model="claude-opus-4-8",
        user_id=request.state.user["sub"],
    )

    return JSONResponse(result)
```

---

## 3. Treatment Recommendation

```python
TREATMENT_PROMPT = """You are a clinical decision support system.
Based on current guidelines and this patient's specific situation, suggest treatment options.

Consider:
- Current conditions and comorbidities
- Current medications (drug interactions, contraindications)
- Allergies
- Age, gender, renal function
- Relevant clinical guidelines (ADA, ACC/AHA, USPSTF)

Return JSON:
{
  "primary_recommendation": "...",
  "alternatives": [...],
  "contraindicated": [...],
  "monitoring_required": [...],
  "guideline_references": [...],
  "evidence_level": "A|B|C"
}
"""

@router.post("/Patient/{patient_id}/$treatment-recommendation", operation_id="treatment_recommendation")
async def treatment_recommendation(patient_id: int, body: TreatmentRequest, request: Request, ai_svc=Depends(get_ai_service)):
    """Get AI treatment recommendation for a specific condition."""
    patient_context = await context_builder.build(patient_id, "full", ...)
    condition = body.condition  # SNOMED code or free text

    response = await ai_svc.complete("claude-opus-4-8", TREATMENT_PROMPT,
        f"Condition: {condition}\n\nPatient context:\n{patient_context}")
    return JSONResponse(json.loads(response))
```

---

## 4. Medication Review

```python
@router.post("/Patient/{patient_id}/$medication-review", operation_id="medication_review")
async def medication_review(patient_id: int, request: Request, ai_svc=Depends(get_ai_service)):
    """AI-powered medication reconciliation and interaction check."""
    medications = await med_request_repo.list_by_patient(patient_id, status="active", ...)
    allergies = await allergy_repo.list_by_patient(patient_id, ...)
    conditions = await condition_repo.list_by_patient(patient_id, status="active", ...)
    labs = await obs_repo.list_by_patient(patient_id, category="laboratory", limit=20, ...)

    prompt = f"""Review this patient's medication list for:
1. Drug-drug interactions
2. Drug-disease contraindications  
3. Dose appropriateness (renal/hepatic function)
4. Missing medications (based on conditions and guidelines)
5. Duplicate therapy
6. Medication adherence concerns

Return JSON: {{
  "interactions": [...],
  "contraindications": [...],
  "dose_concerns": [...],
  "gaps": [...],
  "duplicates": [...],
  "overall_safety": "safe|review-needed|unsafe"
}}

Medications: {json.dumps([to_fhir(m) for m in medications])}
Allergies: {json.dumps([to_fhir(a) for a in allergies])}
Conditions: {json.dumps([to_fhir(c) for c in conditions])}
Recent labs: {json.dumps([to_fhir(l) for l in labs])}"""

    response = await ai_svc.complete("claude-sonnet-4-6", "", prompt)
    return JSONResponse(json.loads(response))
```

---

## 5. Patient-Facing AI (Patient Portal)

AI for patients via the patient portal:

```python
PATIENT_AI_PROMPT = """You are a patient-friendly health assistant.
You help patients understand their health information in plain language.

Rules:
- Always recommend consulting their doctor for medical decisions
- Never provide diagnoses
- Use simple, non-medical language
- Be empathetic and supportive
- If symptoms suggest emergency, strongly advise calling 911

Patient's health summary is provided as context."""

@router.post("/Patient/me/$ai-chat", operation_id="patient_ai_chat")
async def patient_ai_chat(body: PatientChatRequest, request: Request, ai_svc=Depends(get_ai_service)):
    """Patient-facing AI health assistant."""
    patient_context = await context_builder.build(
        patient_id=get_patient_id(request),
        context_type="summary",
        user_id=request.state.user["sub"],
        org_id=request.state.user["activeOrganizationId"],
    )
    # Use streaming for better UX
    return StreamingResponse(
        ai_svc.stream(
            model="claude-sonnet-4-6",
            system=PATIENT_AI_PROMPT + "\n\n" + patient_context,
            prompt=body.message,
        ),
        media_type="text/event-stream",
    )
```

---

## AI Safety Guardrails

```python
# app/ai/safety.py

class AISafetyFilter:
    BLOCKED_OUTPUTS = [
        "your diagnosis is",
        "you have cancer",
        "stop taking your medication",
        "this is an emergency, call",  # AI should say this, but let's gate it
    ]

    REQUIRED_DISCLAIMERS = {
        "diagnosis": "This is not a medical diagnosis. Please consult your healthcare provider.",
        "treatment": "Treatment decisions should be made by a licensed clinician.",
        "medication": "Do not change your medications without consulting your doctor.",
    }

    async def filter(self, response: str, task_type: str) -> str:
        # Add required disclaimer
        disclaimer = self.REQUIRED_DISCLAIMERS.get(task_type, "")
        if disclaimer and disclaimer not in response:
            response = response + f"\n\n---\n*{disclaimer}*"
        return response
```
