# Smart Charting — AI-Assisted Clinical Documentation

Smart charting is the workflow where AI assists clinicians in documenting encounters  
faster, more accurately, and with better code capture.

---

## Ambient Transcription → FHIR

The most impactful AI EMR feature: the clinician speaks naturally in the exam room,  
AI transcribes and converts to structured FHIR data.

```
Clinician says: "So Mr. Smith, your A1C came back at 8.2, which is a bit high.
                 We'll increase your metformin to 1000mg twice daily.
                 I also want you to get a retinal exam and a foot exam this month."

AI produces:
→ Updates Observation: HbA1c = 8.2% (if not already recorded)
→ Updates MedicationRequest: metformin 1000mg oral twice daily
→ Creates ServiceRequest: ophthalmology referral (retinal exam)
→ Creates ServiceRequest: podiatry referral (foot exam)
→ Creates DocumentReference: encounter note with full transcript
```

---

## Transcription Pipeline

```
Audio → Whisper (STT) → Transcript → Claude (extraction) → FHIR Draft Resources → Clinician Review → Approve
```

### Step 1 — Speech-to-Text

```python
# app/ai/transcription.py

import openai

class TranscriptionService:
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        client = AsyncOpenAI()
        with io.BytesIO(audio_bytes) as audio_file:
            audio_file.name = "recording.webm"
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="text",
            )
        return transcript
```

### Step 2 — Clinical Extraction from Transcript

```python
CLINICAL_EXTRACTION_PROMPT = """You are a clinical documentation AI.
Extract structured clinical information from this encounter transcript.

Return JSON with these fields (null if not mentioned):
{
  "new_conditions": [{"text": "...", "snomed_code": "...", "status": "active|resolved"}],
  "updated_conditions": [{"condition_id": null, "change": "improved|worsened|resolved"}],
  "new_medications": [{"name": "...", "dose": "...", "frequency": "...", "route": "..."}],
  "discontinued_medications": [{"name": "..."}],
  "new_orders": [{"type": "lab|imaging|referral|procedure", "description": "...", "priority": "routine|urgent|stat"}],
  "vitals": {"bp_systolic": null, "bp_diastolic": null, "heart_rate": null, "weight": null, "temperature": null},
  "patient_education": ["..."],
  "follow_up": {"timeframe": "...", "reason": "..."},
  "clinical_note": "Full SOAP note in markdown format"
}
"""

class EncounterExtractor:
    async def extract_from_transcript(self, transcript: str) -> dict:
        response = await ai_client.complete(
            model="claude-sonnet-4-6",
            system=CLINICAL_EXTRACTION_PROMPT,
            prompt=f"Encounter transcript:\n\n{transcript}",
        )
        return json.loads(response)
```

### Step 3 — Draft Resource Creation

```python
# app/services/smart_charting_service.py

class SmartChartingService:
    async def process_transcript(
        self,
        transcript: str,
        encounter_id: int,
        patient_id: int,
        user_id: str,
        org_id: str,
    ) -> SmartChartingResult:
        extracted = await self.extractor.extract_from_transcript(transcript)
        drafts = SmartChartingResult(encounter_id=encounter_id, transcript=transcript)

        # Create draft conditions
        for cond in extracted.get("new_conditions", []):
            draft = ConditionDraft(
                code=cond.get("snomed_code"),
                display=cond.get("text"),
                status=cond.get("status", "active"),
                source="ambient-transcription",
                confidence=cond.get("confidence", 0.8),
            )
            drafts.conditions.append(draft)

        # Create draft medication requests
        for med in extracted.get("new_medications", []):
            draft = MedicationRequestDraft(
                name=med.get("name"),
                dose=med.get("dose"),
                frequency=med.get("frequency"),
                route=med.get("route"),
                source="ambient-transcription",
            )
            drafts.medications.append(draft)

        # Create draft orders
        for order in extracted.get("new_orders", []):
            draft = ServiceRequestDraft(
                order_type=order.get("type"),
                description=order.get("description"),
                priority=order.get("priority", "routine"),
                source="ambient-transcription",
            )
            drafts.orders.append(draft)

        # Generate note
        drafts.note = extracted.get("clinical_note", "")

        return drafts

    async def approve_drafts(
        self,
        drafts: SmartChartingResult,
        approved_item_ids: list[str],
        user_id: str,
        org_id: str,
    ) -> list[dict]:
        """Create actual FHIR resources for approved draft items."""
        created = []
        for item_id in approved_item_ids:
            item = drafts.get_item(item_id)
            if isinstance(item, ConditionDraft):
                resource = await self.condition_repo.create(item.to_fhir(), user_id, org_id)
                created.append(to_fhir_condition(resource))
            elif isinstance(item, MedicationRequestDraft):
                resource = await self.med_request_repo.create(item.to_fhir(), user_id, org_id)
                created.append(to_fhir_medication_request(resource))
            elif isinstance(item, ServiceRequestDraft):
                resource = await self.service_request_repo.create(item.to_fhir(), user_id, org_id)
                created.append(to_fhir_service_request(resource))
        return created
```

---

## Smart Form Auto-Fill

When a clinician opens a documentation form (Questionnaire), AI pre-fills it based on:
- Previous encounter notes
- Active problem list
- Current medications
- Recent vitals

```python
@router.post("/Questionnaire/{questionnaire_id}/$ai-prefill", operation_id="ai_prefill_form")
async def ai_prefill_form(
    questionnaire_id: int,
    patient_id: int,
    request: Request,
    ai_svc=Depends(get_ai_service),
):
    """Pre-fill a Questionnaire template using patient context."""
    questionnaire = await questionnaire_repo.get(questionnaire_id)
    patient_context = await context_builder.build(patient_id, "summary", ...)

    prefill_prompt = f"""Given this patient's clinical context, pre-fill the following questionnaire.
Return a QuestionnaireResponse JSON matching each item's linkId.

Questionnaire:
{json.dumps(questionnaire)}

Patient context:
{patient_context}"""

    response = await ai_client.complete("claude-sonnet-4-6", "", prefill_prompt)
    draft_response = json.loads(response)
    draft_response["status"] = "in-progress"
    draft_response["meta"] = {"tag": [{"code": "ai-prefilled"}]}
    return JSONResponse(draft_response)
```

---

## Smart Note Generation

One-click note generation from encounter data:

```python
@router.post("/Encounter/{encounter_id}/$generate-note", operation_id="generate_encounter_note")
async def generate_note(
    encounter_id: int,
    body: GenerateNoteRequest,
    request: Request,
    ai_svc=Depends(get_ai_service),
):
    """Generate a clinical note from encounter data."""
    encounter = await encounter_repo.get(encounter_id)
    vitals = await vitals_repo.list_by_encounter(encounter_id)
    conditions = await condition_repo.list_by_encounter(encounter_id)
    orders = await service_request_repo.list_by_encounter(encounter_id)
    medications = await med_request_repo.list_by_encounter(encounter_id)

    note_type = body.note_type or "soap"
    prompt = f"""Generate a {note_type.upper()} note for this clinical encounter.

Encounter type: {encounter.get('class', {}).get('code', 'outpatient')}
Chief complaint: {encounter.get('reasonCode', [{}])[0].get('text', 'not specified')}
Active conditions: {[c.get('display') for c in conditions]}
New orders placed: {[o.get('description') for o in orders]}
Vital signs: {vitals}
Medications reviewed: {[m.get('name') for m in medications]}

Generate a professional clinical note suitable for the medical record."""

    note_text = await ai_client.complete("claude-sonnet-4-6", CLINICAL_NOTE_SYSTEM, prompt)

    # Save as DocumentReference (draft, pending clinician signature)
    doc_ref = await doc_ref_repo.create({
        "status": "current",
        "docStatus": "preliminary",  # pending clinician signature
        "type": get_note_type_code(note_type),
        "subject": encounter["subject"],
        "context": {"encounter": [{"reference": f"Encounter/{encounter_id}"}]},
        "content": [{"attachment": {"contentType": "text/plain", "data": b64encode(note_text)}}],
        "description": f"AI-generated {note_type.upper()} note — REQUIRES CLINICIAN REVIEW",
        "meta": {"tag": [{"code": "ai-generated"}, {"code": "pending-signature"}]},
    }, user["sub"], user["activeOrganizationId"])

    return JSONResponse(to_fhir_document_reference(doc_ref), status_code=201)
```

---

## Ambient Transcription WebSocket

Real-time streaming transcription:

```python
@ws_router.websocket("/ws/transcribe")
async def transcription_ws(ws: WebSocket):
    await ws.accept()
    transcription_buffer = []
    encounter_id = None

    async for message in ws.iter_json():
        if message["type"] == "start":
            encounter_id = message["encounterId"]
            await ws.send_json({"type": "recording-started"})

        elif message["type"] == "audio-chunk":
            # Partial transcription (streaming)
            audio = base64.b64decode(message["audio"])
            chunk_text = await transcription_svc.transcribe_chunk(audio)
            transcription_buffer.append(chunk_text)
            await ws.send_json({"type": "transcript-chunk", "text": chunk_text})

        elif message["type"] == "stop":
            full_transcript = " ".join(transcription_buffer)
            # Extract clinical data
            extraction = await smart_charting_svc.process_transcript(
                full_transcript, encounter_id, message["patientId"], ...
            )
            await ws.send_json({"type": "extraction-complete", "data": extraction.to_dict()})
```
