# AI-Native ERP — Design & Integration Guide

> How to build an AI-first enterprise resource planning layer on top of the FHIR server, Pulse middleware, and SMART on FHIR stack. Covers intelligent scheduling, AI agents via MCP, clinical NLP, predictive analytics, revenue cycle automation, and ambient AI documentation.

---

## What "AI-Native ERP" Means in Healthcare

A traditional healthcare ERP (like Epic, Oracle Health, or Cerner) bolts AI on after the fact — a rule engine here, a recommendation widget there. An **AI-native ERP** is designed from the ground up with AI as a first-class participant in every workflow:

- The FHIR server's OpenAPI spec is already consumed by a FastMCP server that exposes every endpoint as an AI tool (stated explicitly in CLAUDE.md: *"The emitted OpenAPI spec is consumed by a FastMCP server that exposes every endpoint as an AI tool"*)
- AI agents can read/write any clinical resource the same way a human clinician does — via FHIR + SMART
- Clinical intelligence is embedded in the workflow layer, not layered on top as a separate product
- AI doesn't replace decisions — it presents context, drafts content, and automates routine tasks while keeping clinicians in the approval loop

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Consumer Layer                             │
│                                                                      │
│  Clinical   Patient    Voice      AI       Admin    Analytics       │
│    UI        Portal   Interface  Agents   Console   Dashboard       │
└────────────────────────┬────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   AI Gateway        │
              │  (FastMCP + LLM)    │
              │  Claude API bridge  │
              └──────────┬──────────┘
                         │ SMART Bearer (system/*.cruds)
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                    Pulse Middleware (Control Plane)                   │
│  Auth  │  RBAC  │  Workflows  │  CDS Hooks  │  Notifications        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                  FHIR Data Layer (this server)                        │
│  34 FHIR R4 resources  │  Terminology  │  AuditEvent                │
└─────────────────────────────────────────────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
  PostgreSQL           Redis        Terminology DB
  (Clinical Data)     (Cache)      (SNOMED/LOINC/RxNorm)
```

---

## 1. AI Gateway — FastMCP Integration

The FHIR server already emits an OpenAPI spec that FastMCP converts into AI tools. This is the foundation of the AI-native ERP.

### 1.1 FastMCP Server

```python
# ai_gateway/mcp_server.py
import httpx
from mcp.server.fastmcp import FastMCP
from mcp.types import Tool, TextContent

mcp = FastMCP("FHIR Clinical Platform")

# Load tools dynamically from OpenAPI spec
async def load_fhir_tools():
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://yourplatform.com/api/fhir/v1/openapi.json")
        spec = resp.json()

    tools = []
    for path, methods in spec["paths"].items():
        for method, operation in methods.items():
            tool_name = operation.get("operationId", f"{method}_{path.replace('/', '_')}")
            description = operation.get("description", operation.get("summary", ""))
            tools.append(Tool(
                name=tool_name,
                description=description,
                inputSchema=_build_input_schema(method, path, operation),
            ))
    return tools

@mcp.tool()
async def search_patients(
    family_name: str | None = None,
    given_name: str | None = None,
    identifier: str | None = None,
    gender: str | None = None,
    limit: int = 20,
) -> str:
    """
    Search for patients by demographic criteria.
    Returns a list of patients with their key identifiers.
    """
    params = {k: v for k, v in {
        "family": family_name,
        "given": given_name,
        "identifier": identifier,
        "gender": gender,
        "_count": limit,
    }.items() if v is not None}

    async with get_fhir_client() as client:
        resp = await client.get("/patients", params=params,
                                headers={"Accept": "application/fhir+json"})
    bundle = resp.json()
    patients = [e["resource"] for e in bundle.get("entry", [])]
    return format_patient_list(patients)


@mcp.tool()
async def get_patient_chart(patient_id: int) -> str:
    """
    Retrieve a complete patient chart summary including active conditions,
    current medications, recent observations, and upcoming appointments.
    Uses Patient/$everything to fetch all compartment resources.
    """
    async with get_fhir_client() as client:
        resp = await client.get(f"/patients/{patient_id}/$everything",
                                headers={"Accept": "application/fhir+json"})
    bundle = resp.json()
    return summarize_patient_bundle(bundle)


@mcp.tool()
async def create_encounter(
    patient_id: int,
    encounter_type: str,
    reason: str,
    practitioner_id: int,
) -> str:
    """
    Open a new clinical encounter for a patient.
    Validates patient is active, practitioner has admitting privileges.
    Returns the encounter ID.
    """
    async with get_pulse_client() as client:
        resp = await client.post("/encounters/admit", json={
            "patient_id": patient_id,
            "encounter_type": encounter_type,
            "reason": reason,
            "practitioner_id": practitioner_id,
        })
    encounter = resp.json()
    return f"Encounter {encounter['id']} opened. Status: {encounter['status']}"
```

### 1.2 AI Agent Authorization

AI agents authenticate via SMART Backend Services (client_credentials + asymmetric JWT). Each agent has its own Keycloak client with scopes limited to what it actually needs:

| Agent | Keycloak Client | Scopes |
|---|---|---|
| Clinical Documentation Agent | `ai-docs-agent` | `system/Patient.r system/Encounter.r system/DocumentReference.c` |
| Scheduling Agent | `ai-scheduling-agent` | `system/Patient.r system/Slot.r system/Appointment.cru` |
| Billing Agent | `ai-billing-agent` | `system/Patient.r system/Claim.crud system/Coverage.r` |
| Analytics Agent | `ai-analytics-agent` | `system/*.r` (read-only all) |
| Care Coordinator | `ai-care-agent` | `system/CarePlan.cru system/Task.cru system/ServiceRequest.r` |

Every AI-generated resource write must include a `Provenance` resource linking it to the AI agent:

```python
async def create_with_provenance(
    resource: dict,
    agent_id: str,
    human_approver_id: str | None = None,
) -> dict:
    """Wrap any AI-generated resource creation in a transaction with Provenance."""
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": resource,
                "request": {"method": "POST", "url": resource["resourceType"]},
            },
            {
                "resource": {
                    "resourceType": "Provenance",
                    "target": [{"reference": f"{resource['resourceType']}/placeholder"}],
                    "recorded": datetime.utcnow().isoformat() + "Z",
                    "agent": [
                        {
                            "type": {"coding": [{"code": "AUT", "display": "Author"}]},
                            "who": {"reference": f"Device/{agent_id}"},
                        },
                        *([{
                            "type": {"coding": [{"code": "REVIEWER"}]},
                            "who": {"reference": f"Practitioner/{human_approver_id}"},
                        }] if human_approver_id else []),
                    ],
                    "entity": [{
                        "role": "source",
                        "what": {"display": "AI-generated content"},
                        "extension": [{"url": "ai-model", "valueString": "claude-sonnet-4-6"}],
                    }],
                },
                "request": {"method": "POST", "url": "Provenance"},
            },
        ],
    }
    return await fhir_client.transaction(bundle)
```

---

## 2. Ambient AI Documentation

The highest-ROI AI feature in clinical settings: **automatically generate clinical notes from ambient audio/structured data**.

### 2.1 Visit Documentation Pipeline

```
1. Encounter opened (Encounter.status = in-progress)
       │
       ▼
2. Ambient capture (optional)
   - Voice recording (consent required) → speech-to-text
   - Structured data collection (vitals, chief complaint form)
       │
       ▼
3. AI Documentation Agent
   - Input: encounter context (patient history, current meds, conditions)
             + structured visit data + optional transcript
   - Output: DRAFT clinical note sections:
     * Chief Complaint
     * History of Present Illness (HPI)
     * Review of Systems (ROS)
     * Physical Exam
     * Assessment and Plan (A&P)
     * ICD-10 diagnosis codes (suggested)
       │
       ▼
4. Clinician review in UI
   - Drafts pre-populated in note editor
   - Clinician edits, accepts, or rejects each section
   - One-click "Accept All" for low-complexity visits
       │
       ▼
5. Clinician signs note
   - POST DocumentReference (status=current)
   - POST Provenance (agent=ai-docs-agent, reviewer=practitioner)
   - Diagnoses reconciled → Condition resources created
   - Orders extracted → ServiceRequest resources created
```

### 2.2 Clinical Note Generator

```python
# ai_gateway/agents/documentation.py

class ClinicalDocumentationAgent:
    def __init__(self, anthropic_client, fhir_client):
        self.llm = anthropic_client
        self.fhir = fhir_client

    async def generate_soap_note(
        self,
        encounter_id: int,
        structured_data: dict,
        transcript: str | None = None,
    ) -> SOAPNoteDraft:
        # Gather patient context
        encounter = await self.fhir.get(f"Encounter/{encounter_id}")
        patient_id = extract_patient_id(encounter)
        patient_bundle = await self.fhir.get_patient_everything(patient_id)

        context = self._build_clinical_context(patient_bundle)

        prompt = f"""
You are a clinical documentation assistant. Generate a structured SOAP note draft.

PATIENT CONTEXT:
{context}

VISIT STRUCTURED DATA:
{json.dumps(structured_data, indent=2)}

{"TRANSCRIPT:" + chr(10) + transcript if transcript else ""}

Generate a SOAP note with these sections:
1. Chief Complaint (1-2 sentences)
2. History of Present Illness (narrative, 3-5 sentences)
3. Review of Systems (relevant systems only)
4. Physical Examination (relevant findings)
5. Assessment (diagnosis with ICD-10 codes, 2-4 items)
6. Plan (specific, actionable — medications, orders, follow-up)

Rules:
- Never invent clinical findings not supported by the data
- Mark uncertain items with [NEEDS VERIFICATION]
- Suggest ICD-10 codes but label them as suggestions
- Keep language clinical and professional
- Flag any potential drug interactions or allergy concerns as alerts

Return as structured JSON.
"""

        resp = await self.llm.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

        return SOAPNoteDraft.model_validate_json(resp.content[0].text)

    async def extract_diagnoses_and_orders(
        self, soap_note: SOAPNoteDraft, encounter_id: int
    ) -> list[ClinicalAction]:
        """
        Extract structured actions from the SOAP note:
        - Diagnoses → Condition resources (proposed, needs clinician confirm)
        - Prescriptions → MedicationRequest drafts
        - Lab orders → ServiceRequest drafts
        - Follow-up → Appointment request
        """
        prompt = f"""
Extract discrete clinical actions from this SOAP note.

SOAP NOTE:
{soap_note.model_dump_json(indent=2)}

Return a JSON array of actions with type:
- diagnosis: {{ icd10_code, display, clinical_status, verification_status }}
- medication: {{ medication_name, rxnorm_code, dose, route, frequency, duration }}
- lab_order: {{ loinc_code, test_name, urgency, specimen_type }}
- imaging_order: {{ snomed_code, modality, body_site, urgency, clinical_indication }}
- referral: {{ specialty, urgency, reason }}
- follow_up: {{ timeframe, reason }}

Only extract items clearly stated in the plan section.
"""
        resp = await self.llm.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        return parse_clinical_actions(resp.content[0].text)
```

---

## 3. Intelligent Scheduling

### 3.1 AI Scheduling Agent

```python
# ai_gateway/agents/scheduling.py

class IntelligentSchedulingAgent:
    """
    Finds optimal appointment slots considering:
    - Patient preferences (time of day, location, provider)
    - Practitioner availability (schedule, leave, existing bookings)
    - Visit type duration requirements
    - Equipment/room requirements
    - Patient travel distance and transport needs
    - Insurance network constraints
    """

    async def find_optimal_slots(
        self,
        patient_id: int,
        service_type: str,
        urgency: str,  # routine / urgent / stat
        preferred_practitioner_id: int | None = None,
        date_range_days: int = 14,
    ) -> list[SlotRecommendation]:
        # 1. Get patient context (insurance, location, language, mobility)
        patient = await self.fhir.get(f"Patient/{patient_id}")
        patient_context = extract_patient_preferences(patient)

        # 2. Get available slots
        slots = await self.fhir.search("Slot", {
            "status": "free",
            "service-type": service_type,
            "_include": "Slot:schedule",
            "start": f"ge{date.today().isoformat()}",
            "start:lt": f"le{(date.today() + timedelta(days=date_range_days)).isoformat()}",
        })

        # 3. Score each slot with AI
        scored = await self._score_slots(slots.entries, patient_context, urgency)

        # 4. Return top 5 with explanations
        return sorted(scored, key=lambda s: s.score, reverse=True)[:5]

    async def _score_slots(
        self, slots: list, patient_context: dict, urgency: str
    ) -> list[SlotRecommendation]:
        prompt = f"""
Score these appointment slots for this patient.

PATIENT CONTEXT:
{json.dumps(patient_context, indent=2)}

URGENCY: {urgency}

AVAILABLE SLOTS:
{json.dumps([format_slot(s) for s in slots], indent=2)}

Score each slot 0-100 based on:
- Time preference match (patient's preferred time of day)
- Provider continuity (same provider as previous visits)
- Location convenience (closer = better)
- Urgency match (stat slots earlier in list)
- Wait time (shorter = better for urgent)

Return ranked list with score and explanation for each.
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=1000,
                                               messages=[{"role": "user", "content": prompt}])
        return parse_slot_recommendations(resp.content[0].text, slots)

    async def auto_schedule_followup(
        self,
        encounter_id: int,
        follow_up_instructions: str,
    ) -> Appointment | None:
        """
        After discharge, automatically find and propose a follow-up slot.
        Sends proposal to patient for confirmation — does not book without consent.
        """
        encounter = await self.fhir.get(f"Encounter/{encounter_id}")
        patient_id = extract_patient_id(encounter)
        practitioner_id = extract_practitioner_id(encounter)

        # Parse timeframe from follow-up instructions
        timeframe = await self._extract_timeframe(follow_up_instructions)

        slots = await self.find_optimal_slots(
            patient_id=patient_id,
            service_type="follow-up",
            urgency="routine",
            preferred_practitioner_id=practitioner_id,
            date_range_days=timeframe.max_days,
        )

        if not slots:
            return None

        # Create proposed (not booked) appointment
        top_slot = slots[0]
        return await self._create_proposed_appointment(patient_id, top_slot, follow_up_instructions)
```

### 3.2 Predictive No-Show Model

```python
class NoShowPredictionService:
    """
    Predicts likelihood of patient no-show based on historical patterns.
    Used to:
    - Overbooking last-minute slots with high no-show risk
    - Sending targeted reminders to high-risk patients
    - Adjusting staff scheduling
    """

    async def predict_no_show_risk(self, appointment_id: int) -> NoShowRisk:
        appointment = await self.fhir.get(f"Appointment/{appointment_id}")
        patient_id = extract_patient_id_from_appointment(appointment)

        # Features from FHIR data
        history = await self.fhir.search("Appointment", {
            "patient": f"Patient/{patient_id}",
            "status": "noshow,fulfilled,cancelled",
            "_count": 20,
            "_sort": "-date",
        })

        features = {
            "historical_noshow_rate": calculate_noshow_rate(history.entries),
            "days_until_appointment": (parse_datetime(appointment["start"]) - datetime.now()).days,
            "appointment_type": appointment.get("serviceType", [{}])[0].get("text", ""),
            "time_of_day_bucket": get_time_bucket(appointment["start"]),
            "day_of_week": parse_datetime(appointment["start"]).weekday(),
            "lead_time_days": (parse_datetime(appointment["start"]) - parse_datetime(appointment["created"])).days,
            "has_transport_concern": check_transport_flag(await self.fhir.get(f"Patient/{patient_id}")),
            "insurance_type": await self._get_insurance_type(patient_id),
        }

        # Use LLM for scoring (or swap for a trained model later)
        risk_score = await self._score_with_llm(features)

        return NoShowRisk(
            appointment_id=appointment_id,
            risk_score=risk_score,  # 0.0–1.0
            risk_level="high" if risk_score > 0.6 else "medium" if risk_score > 0.3 else "low",
            recommended_actions=self._get_recommendations(risk_score, features),
        )

    def _get_recommendations(self, risk_score: float, features: dict) -> list[str]:
        actions = []
        if risk_score > 0.6:
            actions.append("Send SMS reminder 48 hours before")
            actions.append("Call patient 24 hours before")
        if risk_score > 0.3:
            actions.append("Send automated email reminder 1 week before")
        if features["has_transport_concern"]:
            actions.append("Offer telehealth alternative")
            actions.append("Provide transport assistance information")
        return actions
```

---

## 4. Revenue Cycle Automation

### 4.1 AI-Powered Coding and Claims

```python
# ai_gateway/agents/revenue_cycle.py

class RevenueCycleAgent:
    """
    Automates: medical coding, prior authorization, claim submission,
    denial management, and AR follow-up.
    """

    async def auto_code_encounter(self, encounter_id: int) -> CodingDraft:
        """
        Suggest ICD-10-CM diagnosis codes and CPT procedure codes
        from the clinical documentation.
        """
        # Pull all clinical data for the encounter
        encounter_bundle = await self._get_encounter_bundle(encounter_id)
        clinical_summary = self._summarize_for_coding(encounter_bundle)

        prompt = f"""
You are a medical coding specialist (CPC certified).
Review this clinical documentation and suggest billing codes.

CLINICAL DOCUMENTATION:
{clinical_summary}

Return a JSON object with:
- primary_diagnosis: {{ icd10_code, description, confidence }}
- secondary_diagnoses: [{{ icd10_code, description, confidence }}]
- procedure_codes: [{{ cpt_code, description, units, modifier, confidence }}]
- e_m_code: {{ code, level_justification }}
- hcc_codes: [{{ code, description }}]  // for risk-adjusted plans
- coding_notes: [string]  // alerts, documentation deficiencies

Flag any codes that need additional documentation to support.
Confidence: high (>0.9), medium (0.7-0.9), low (<0.7)
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=2000,
                                               messages=[{"role": "user", "content": prompt}])
        draft = CodingDraft.model_validate_json(resp.content[0].text)

        # Cross-check codes against terminology service
        for code in draft.all_codes():
            validated = await self.terminology.lookup(system=code.system, code=code.code)
            code.valid = validated.found

        return draft

    async def check_prior_authorization_need(
        self,
        service_request: dict,
        patient_coverage: dict,
    ) -> PriorAuthAssessment:
        """
        Determine if a service needs prior authorization and initiate if so.
        """
        prompt = f"""
Determine if this service requires prior authorization given this insurance coverage.

SERVICE REQUEST:
{json.dumps(service_request, indent=2)}

PATIENT COVERAGE (plan type, payer, group):
{json.dumps(patient_coverage, indent=2)}

Answer:
1. Does this service typically require PA for this plan type? (yes/no/maybe)
2. What information does the payer typically need for PA?
3. Estimated approval likelihood based on diagnosis codes?
4. Alternative services that may not require PA?

Return as structured JSON.
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=800,
                                               messages=[{"role": "user", "content": prompt}])
        return PriorAuthAssessment.model_validate_json(resp.content[0].text)

    async def analyze_denial(
        self,
        claim_id: int,
        claim_response: dict,
    ) -> DenialAnalysis:
        """
        Analyze a claim denial, determine root cause, and generate appeal.
        """
        claim = await self.fhir.get(f"Claim/{claim_id}")
        encounter_id = extract_encounter_from_claim(claim)
        clinical_docs = await self._get_supporting_docs(encounter_id)

        prompt = f"""
A claim was denied. Analyze the denial and recommend action.

CLAIM: {json.dumps(claim, indent=2)}

DENIAL RESPONSE: {json.dumps(claim_response, indent=2)}

CLINICAL DOCUMENTATION SUMMARY: {clinical_docs}

Provide:
1. Root cause of denial (coding error, missing auth, medical necessity, technical)
2. Corrective action (recode, appeal, resubmit, write-off)
3. If appeal: draft appeal letter with clinical justification
4. Probability of successful appeal (0-100%)
5. Deadline for appeal based on payer (if identifiable)
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=2000,
                                               messages=[{"role": "user", "content": prompt}])
        return DenialAnalysis.model_validate_json(resp.content[0].text)
```

---

## 5. Predictive Clinical Analytics

### 5.1 Population Health Dashboard

```python
# ai_gateway/analytics/population_health.py

class PopulationHealthAnalytics:
    """
    Analyzes aggregated (de-identified) FHIR data to identify:
    - Care gaps (patients overdue for screenings)
    - High-risk patients (predicted deterioration, readmission)
    - Chronic disease management outliers
    - Utilization patterns
    """

    async def identify_care_gaps(self, org_id: str) -> list[CareGap]:
        """
        Uses Bulk Data export + AI to find patients with care gaps.
        Example: diabetic patients without HbA1c in last 90 days.
        """
        # Bulk export (async — may take minutes for large populations)
        export_url = await self._kick_off_export(org_id, resource_types=["Patient", "Observation", "Condition"])
        ndjson_files = await self._poll_and_download(export_url)

        gaps = []
        patients = load_ndjson(ndjson_files["Patient"])
        observations = load_ndjson(ndjson_files["Observation"])
        conditions = load_ndjson(ndjson_files["Condition"])

        # Build patient index
        obs_by_patient = index_by_subject(observations)
        conditions_by_patient = index_by_subject(conditions)

        for patient in patients:
            patient_gaps = self._check_care_gaps(
                patient, obs_by_patient.get(patient["id"], []),
                conditions_by_patient.get(patient["id"], [])
            )
            gaps.extend(patient_gaps)

        return sorted(gaps, key=lambda g: g.priority_score, reverse=True)

    def _check_care_gaps(
        self, patient: dict, observations: list, conditions: list
    ) -> list[CareGap]:
        gaps = []
        today = date.today()

        # Diabetic care gaps
        has_diabetes = any(has_icd10_prefix(c, "E11") for c in conditions)
        if has_diabetes:
            last_a1c = get_last_observation(observations, loinc_code="4548-4")
            if not last_a1c or days_since(last_a1c["effectiveDateTime"]) > 90:
                gaps.append(CareGap(
                    patient_id=patient["id"],
                    gap_type="hba1c_overdue",
                    description="Diabetic patient: HbA1c not recorded in last 90 days",
                    priority_score=0.85,
                    recommended_action="Order HbA1c lab",
                    relevant_condition="Type 2 Diabetes (E11)",
                ))

        # Hypertension: blood pressure monitoring
        has_htn = any(has_icd10_prefix(c, "I10") for c in conditions)
        if has_htn:
            last_bp = get_last_observation(observations, loinc_code="55284-4")
            if not last_bp or days_since(last_bp["effectiveDateTime"]) > 30:
                gaps.append(CareGap(
                    patient_id=patient["id"],
                    gap_type="bp_monitoring_gap",
                    description="Hypertensive patient: BP not recorded in last 30 days",
                    priority_score=0.7,
                    recommended_action="Schedule blood pressure check",
                ))

        # Preventive: mammogram (female, 40–74)
        age = calculate_age(patient.get("birthDate", ""))
        gender = patient.get("gender")
        if gender == "female" and 40 <= age <= 74:
            last_mammo = get_last_observation(observations, loinc_code="24606-6")
            if not last_mammo or days_since(last_mammo["effectiveDateTime"]) > 365:
                gaps.append(CareGap(
                    patient_id=patient["id"],
                    gap_type="mammogram_overdue",
                    description="Annual mammogram overdue",
                    priority_score=0.6,
                    recommended_action="Schedule mammogram screening",
                ))

        return gaps

    async def predict_readmission_risk(
        self, encounter_id: int
    ) -> ReadmissionRisk:
        """
        Predict 30-day readmission risk at point of discharge.
        Uses LACE+ index features extracted from FHIR data.
        """
        encounter = await self.fhir.get(f"Encounter/{encounter_id}")
        patient_id = extract_patient_id(encounter)
        history_bundle = await self.fhir.get_patient_everything(patient_id)

        features = extract_lace_features(encounter, history_bundle)

        prompt = f"""
Calculate 30-day readmission risk using LACE+ index and clinical judgment.

LACE+ FEATURES:
{json.dumps(features, indent=2)}

PATIENT CLINICAL SUMMARY:
{summarize_clinical_history(history_bundle)}

Provide:
1. LACE+ score (0-19) with component breakdown
2. 30-day readmission risk percentage
3. Top 3 modifiable risk factors
4. Specific discharge planning recommendations to reduce risk
5. Criteria for hospital-at-home or step-down care if applicable

Return as structured JSON.
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=1500,
                                               messages=[{"role": "user", "content": prompt}])
        return ReadmissionRisk.model_validate_json(resp.content[0].text)
```

---

## 6. AI-Assisted Clinical Decision Support (CDS)

### 6.1 Real-Time Drug Interaction Checking

```python
# ai_gateway/cds/drug_interactions.py

class DrugInteractionCDSService:
    """
    Real-time drug interaction checking using RxNorm relationships
    + LLM clinical interpretation.
    """

    async def check_interaction(
        self,
        new_medication: dict,
        active_medications: list[dict],
        patient_context: dict,
    ) -> list[CDSCard]:
        # 1. Get RxNorm interactions from terminology service
        new_rxnorm = extract_rxnorm_code(new_medication)
        interactions = []

        for existing_med in active_medications:
            existing_rxnorm = extract_rxnorm_code(existing_med)
            interaction = await self.terminology.get_interaction(new_rxnorm, existing_rxnorm)
            if interaction:
                interactions.append({
                    "drug_a": new_medication.get("medicationCodeableConcept", {}).get("text"),
                    "drug_b": existing_med.get("medicationCodeableConcept", {}).get("text"),
                    "severity": interaction.severity,
                    "description": interaction.description,
                })

        if not interactions:
            return []

        # 2. Use LLM to contextualize severity for this specific patient
        prompt = f"""
A prescriber is about to order a new medication. Evaluate these drug interactions
in the context of this specific patient's clinical situation.

NEW MEDICATION: {new_medication.get("medicationCodeableConcept", {}).get("text")}
INDICATION: {new_medication.get("reasonCode", [{}])[0].get("text", "unspecified")}

INTERACTIONS DETECTED:
{json.dumps(interactions, indent=2)}

PATIENT CONTEXT:
- Age: {patient_context.get("age")}
- Weight: {patient_context.get("weight_kg")} kg
- Renal function (eGFR): {patient_context.get("egfr", "unknown")}
- Hepatic function: {patient_context.get("liver_function", "unknown")}
- Active diagnoses: {patient_context.get("diagnoses")}

For each interaction:
1. Clinical significance for THIS patient (not just generic severity)
2. Monitoring parameters if drug combination is used
3. Alternative medications if this combination should be avoided
4. Whether to WARN (informational), ALERT (requires acknowledgment), or BLOCK (must resolve)

Return as CDS Hooks Card format JSON array.
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=1500,
                                               messages=[{"role": "user", "content": prompt}])
        return parse_cds_cards(resp.content[0].text)
```

### 6.2 Differential Diagnosis Assistant

```python
@mcp.tool()
async def suggest_differential_diagnosis(
    presenting_symptoms: list[str],
    vital_signs: dict,
    patient_id: int,
) -> str:
    """
    Generate a differential diagnosis list based on presenting symptoms,
    vitals, and patient history. Returns ranked differentials with
    supporting and refuting evidence.
    """
    patient_bundle = await get_fhir_client().get_patient_everything(patient_id)
    context = summarize_relevant_history(patient_bundle, presenting_symptoms)

    resp = await anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system="""You are a clinical decision support assistant providing differential diagnoses.
Always rank by probability. Include rare but dangerous conditions (cannot-miss diagnoses).
Recommend specific workup for each differential. Do not make definitive diagnoses.""",
        messages=[{
            "role": "user",
            "content": f"""
PRESENTING SYMPTOMS: {', '.join(presenting_symptoms)}
VITAL SIGNS: {json.dumps(vital_signs, indent=2)}
PATIENT HISTORY SUMMARY: {context}

Provide a differential diagnosis with:
1. Top 5 diagnoses ranked by probability
2. Supporting and refuting evidence for each
3. Key discriminating features to look for
4. Recommended workup (labs, imaging, consults)
5. Red flags / can't-miss diagnoses even if unlikely
"""
        }],
    )
    return resp.content[0].text
```

---

## 7. AI Admin & Operations

### 7.1 Staff Scheduling Optimization

```python
class StaffSchedulingAI:
    """
    Optimizes staff scheduling using:
    - Historical appointment volumes by day/time/service
    - Provider preferences and constraints
    - Patient demand forecasting
    - Leave and training schedules
    """

    async def optimize_weekly_schedule(
        self,
        week_start: date,
        org_id: str,
    ) -> WeeklyScheduleProposal:
        # Pull historical volume data (last 12 weeks, same week)
        historical_data = await self._get_historical_volumes(org_id, week_start)
        staff_constraints = await self._get_staff_constraints(org_id, week_start)
        leave_requests = await self._get_approved_leave(org_id, week_start)

        prompt = f"""
Create an optimal staff schedule for the week of {week_start.isoformat()}.

HISTORICAL PATIENT VOLUMES (last 12 equivalent weeks):
{json.dumps(historical_data, indent=2)}

STAFF AND CONSTRAINTS:
{json.dumps(staff_constraints, indent=2)}

APPROVED LEAVE:
{json.dumps(leave_requests, indent=2)}

Optimize for:
1. Patient demand coverage (minimize wait times)
2. Balanced workload across staff
3. Regulatory compliance (minimum rest periods, maximum consecutive hours)
4. Cost efficiency (minimize overtime)
5. Staff preferences where possible

Return a day-by-day shift schedule in JSON format.
Highlight any coverage gaps or risks.
"""
        resp = await self.llm.messages.create(model="claude-sonnet-4-6", max_tokens=2000,
                                               messages=[{"role": "user", "content": prompt}])
        return WeeklyScheduleProposal.model_validate_json(resp.content[0].text)
```

### 7.2 Supply Chain & Inventory

```python
@mcp.tool()
async def predict_supply_needs(
    facility_id: str,
    forecast_days: int = 30,
) -> str:
    """
    Forecast medical supply and medication needs for the next N days
    based on scheduled appointments, historical usage, and seasonal patterns.
    Returns a procurement recommendation report.
    """
    scheduled_procedures = await get_fhir_client().search("ServiceRequest", {
        "performer": f"Location/{facility_id}",
        "status": "active",
        "authored": f"sa{date.today().isoformat()}",
    })

    historical_usage = await get_usage_analytics(facility_id, lookback_days=90)

    resp = await anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": f"""
Forecast supply and medication needs.

SCHEDULED PROCEDURES (next {forecast_days} days):
{format_procedures(scheduled_procedures)}

HISTORICAL USAGE (last 90 days by category):
{json.dumps(historical_usage, indent=2)}

Provide:
1. Estimated consumption per supply category
2. Reorder recommendations with quantities
3. Items at risk of stockout
4. Cost-saving substitution opportunities
5. Seasonal adjustment factors

Return as procurement recommendation JSON.
"""}],
    )
    return resp.content[0].text
```

---

## 8. Patient-Facing AI

### 8.1 AI-Powered Patient Portal

```python
# Patient-facing conversational AI (via SMART patient-scoped token)

@mcp.tool()
async def answer_patient_question(
    question: str,
    patient_id: int,     # from SMART launch context
    session_id: str,
) -> str:
    """
    Answer patient questions about their health records, medications,
    and upcoming appointments. Stays within patient's own data only.
    Never provides medical advice — refers to care team for clinical questions.
    """
    # Patient-scoped FHIR access
    patient_bundle = await get_patient_fhir_client(patient_id).get_patient_everything(patient_id)

    resp = await anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        system="""You are a helpful patient portal assistant. You can:
- Explain what medications are in their record and what they're typically used for
- Summarize upcoming appointments
- Explain lab results in plain language (e.g., "your hemoglobin A1c was 7.2%,
  which means your average blood sugar over the last 3 months was in the mildly elevated range")
- Help navigate the patient portal

You CANNOT:
- Provide medical diagnoses
- Recommend medication changes
- Interpret results as "normal" or "abnormal" without noting this should be confirmed with their doctor
- Access other patients' data

Always suggest the patient contact their care team for clinical questions.
Be warm, clear, and use plain language (8th grade reading level).""",
        messages=[
            *get_session_history(session_id),
            {"role": "user", "content": f"""
PATIENT DATA SUMMARY:
{summarize_for_patient(patient_bundle)}

PATIENT QUESTION: {question}
"""}
        ],
    )
    return resp.content[0].text


@mcp.tool()
async def generate_appointment_preparation_instructions(
    appointment_id: int,
    patient_id: int,
) -> str:
    """
    Generate personalized pre-appointment instructions in the patient's
    preferred language, adapted to their literacy level and the
    specific visit type and any required preparation (fasting, bowel prep, etc.).
    """
    appointment = await get_fhir_client().get(f"Appointment/{appointment_id}")
    patient = await get_fhir_client().get(f"Patient/{patient_id}")
    
    preferred_language = get_communication_language(patient)
    service_type = appointment.get("serviceType", [{}])[0].get("text", "medical appointment")

    resp = await anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": f"""
Generate pre-appointment preparation instructions.

APPOINTMENT TYPE: {service_type}
APPOINTMENT DATE/TIME: {appointment.get("start")}
PATIENT PREFERRED LANGUAGE: {preferred_language}

Include:
1. What to bring (insurance card, ID, medication list)
2. Any preparation required (fasting, bowel prep, medication holds)
3. What to expect during the visit
4. How to reach the office with questions
5. Cancellation policy

Write at a 6th-grade reading level. If language is not English, write in that language.
Be friendly and reassuring. Format as a short bulleted list.
"""}],
    )
    return resp.content[0].text
```

---

## 9. AI Governance & Safety

AI in clinical settings has heightened safety requirements. Every AI-generated output that could influence clinical decisions must be:

### 9.1 Human-in-the-Loop Architecture

```
AI Output Type                  Governance Level
─────────────────────────────────────────────────
Scheduling suggestions          Patient can accept directly
Administrative drafts           Staff review within 24h
Lab result explanations (pt.)   Auto-send after 72h release window
Coding suggestions              Coder review before claim submission
Clinical note drafts            Clinician must sign before finalization
Diagnosis suggestions           Clinician reviews — never auto-accepted
Prescription drafts             Physician must sign — never auto-created
Alert cards (CDS)               Clinician can acknowledge or dismiss
STAT alerts (critical values)   Always push to human — never auto-route
```

### 9.2 AI Audit Trail

Every AI inference that influences a FHIR resource must produce an AuditEvent:

```python
class AIAuditService:
    async def log_inference(
        self,
        agent_id: str,
        model_id: str,
        input_summary: str,       # summarized — no PHI in audit
        output_summary: str,      # summarized — no PHI in audit
        action_taken: str,        # what FHIR resource was created/updated
        human_reviewer: str | None,
        confidence: float | None,
    ) -> None:
        await self.fhir.post("/audit-events", {
            "type": {"system": "http://terminology.hl7.org/CodeSystem/audit-event-type",
                     "code": "110110", "display": "Patient Record"},
            "action": "E",  # Execute
            "outcome": "0",
            "outcomeDesc": f"AI inference: {action_taken}",
            "agent": [
                {"who": {"display": f"AI Agent: {agent_id}"}, "requestor": True,
                 "extension": [{"url": "ai-model", "valueString": model_id}]},
                *([{"who": {"reference": f"Practitioner/{human_reviewer}"}, "requestor": False,
                    "type": {"coding": [{"code": "REVIEWER"}]}}]
                  if human_reviewer else []),
            ],
            "entity": [
                {"what": {"display": action_taken}},
                *([{"what": {"display": f"Confidence: {confidence:.0%}"}}]
                  if confidence is not None else []),
            ],
        })
```

### 9.3 Model Drift & Quality Monitoring

```python
class AIQualityMonitor:
    """
    Tracks accuracy of AI suggestions over time by comparing
    AI proposals vs. clinician final decisions.
    """

    async def record_outcome(
        self,
        inference_id: str,
        ai_suggestion: dict,
        clinician_decision: dict,
        accepted: bool,
        modification_type: str | None,  # "minor", "major", "rejected"
    ) -> None:
        await self.metrics_db.insert({
            "inference_id": inference_id,
            "agent_id": ai_suggestion["agent_id"],
            "model_id": ai_suggestion["model_id"],
            "suggestion_type": ai_suggestion["type"],
            "accepted": accepted,
            "modification_type": modification_type,
            "timestamp": datetime.utcnow(),
        })

    async def get_accuracy_report(
        self, agent_id: str, lookback_days: int = 30
    ) -> AccuracyReport:
        """
        Daily report: acceptance rate, modification rate, rejection rate
        by suggestion type. Alert if acceptance rate drops below threshold.
        """
        ...
```

---

## 10. AI-Native ERP — Integration Checklist

### Infrastructure
- [ ] FastMCP server deployed alongside FHIR server (port 3000 for MCP)
- [ ] Claude API key in Secrets Manager (never in code)
- [ ] AI agents have dedicated Keycloak clients with minimal scopes
- [ ] AI inference rate limits configured (tokens/minute per agent type)
- [ ] Anthropic BAA signed (required before any PHI in prompts)

### Safety
- [ ] All AI-generated clinical resources include Provenance resource
- [ ] Human-in-the-loop gates for all clinical decisions
- [ ] AI AuditEvent logging active for all AI writes
- [ ] Monthly accuracy report review process established
- [ ] Clinician override always available (AI is advisory, not mandatory)
- [ ] No PHI in model fine-tuning data without explicit consent

### Compliance
- [ ] AI model versions pinned (audit trail must reference exact model used)
- [ ] All AI outputs disclosed to patients on request (right to explanation)
- [ ] Clinical staff trained on AI limitations and appropriate use
- [ ] FDA Software as a Medical Device (SaMD) classification reviewed for diagnostic AI features
- [ ] IRB review if AI used in research context

### Performance
- [ ] AI response SLA: < 3 seconds for CDS alerts, < 10s for note drafts
- [ ] Fallback if Claude API unavailable (degrade gracefully, never block care)
- [ ] Token usage monitoring to prevent runaway costs
- [ ] Cache AI responses for identical inputs (terminology, care gap rules)
