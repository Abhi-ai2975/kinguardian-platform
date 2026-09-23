# Ambient Clinical Documentation

**Comparable products:** Nuance DAX Copilot, Suki AI, Abridge, Nabla, DeepScribe  
**Core tech:** Whisper STT + pyannote diarization + Claude structured extraction  
**Status:** Not implemented (section 09 covers manual transcription only)

---

## What Is Ambient Documentation?

Ambient documentation means the AI **listens to the entire clinical encounter in the background** — no button to press, no recording session to start. The clinician walks in, has a natural conversation with the patient, walks out, and finds a completed SOAP note, updated problem list, and new orders waiting for review.

This is fundamentally different from what section 09 describes:

| Section 09 Smart Charting | Ambient Documentation |
|---|---|
| Clinician presses "Start Recording" | Always-on background listening |
| Records one segment | Captures entire encounter (8-25 min) |
| Single speaker | Multi-speaker: doctor vs. patient vs. family |
| One resource type extracted | Full SOAP note + problems + meds + orders |
| Manual trigger | Automatic on encounter check-in |
| No context from prior visits | Carries context across all patient encounters |

---

## Architecture

```
Encounter check-in (Appointment status → "arrived")
         ↓
Room audio capture (tablet mic / smart speaker)
         ↓
Audio stream → WebSocket → /ws/ambient/{encounter_id}
         ↓
Whisper VAD (Voice Activity Detection) → segments
         ↓
pyannote.audio → Speaker diarization
  SPEAKER_00: "How have you been since your last visit?"   ← Doctor
  SPEAKER_01: "The knee pain is still there, worse at night" ← Patient
         ↓
Segment buffer (accumulates 30s chunks for context)
         ↓
Claude API → Streaming structured extraction
         ↓
Draft FHIR resources (not persisted yet):
  - Composition (SOAP note)
  - Condition (new/updated problems)
  - MedicationRequest (changes)
  - ServiceRequest (orders mentioned)
  - Observation (findings stated)
         ↓
Provider reviews → Approve / Edit / Reject each draft
         ↓
Approved resources → Created in FHIR server
```

---

## Speaker Diarization

Speaker diarization is what makes ambient work — without it, you can't separate clinical statements (doctor) from patient-reported symptoms.

```python
# app/services/ambient/diarization.py

from pyannote.audio import Pipeline
import torch

class SpeakerDiarizer:
    def __init__(self):
        # Requires HuggingFace token + pyannote/speaker-diarization-3.1
        self.pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=settings.HF_TOKEN,
        )
        if torch.cuda.is_available():
            self.pipeline.to(torch.device("cuda"))

    async def diarize(self, audio_path: str) -> list[dict]:
        """Returns [{speaker, start, end, text}] segments."""
        diarization = self.pipeline(audio_path)
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "speaker": speaker,     # "SPEAKER_00", "SPEAKER_01"
                "start": turn.start,    # seconds
                "end": turn.end,
                "text": None,           # filled by Whisper
            })
        return segments

    def assign_roles(self, segments: list[dict], known_doctor_id: str | None = None) -> list[dict]:
        """
        Assign roles (doctor/patient) based on:
        1. Who spoke most (doctor typically speaks more)
        2. Semantic content ("I'm ordering..." → doctor)
        """
        speaker_word_counts = {}
        for seg in segments:
            spk = seg["speaker"]
            speaker_word_counts[spk] = speaker_word_counts.get(spk, 0) + len((seg.get("text") or "").split())

        # Heuristic: speaker with more words is usually the doctor
        doctor_speaker = max(speaker_word_counts, key=speaker_word_counts.get) if speaker_word_counts else "SPEAKER_00"

        for seg in segments:
            seg["role"] = "doctor" if seg["speaker"] == doctor_speaker else "patient"
        return segments
```

---

## Audio Pipeline

```python
# app/services/ambient/audio_pipeline.py

import asyncio
import aiofiles
import numpy as np
import soundfile as sf

class AmbientAudioPipeline:
    CHUNK_DURATION_SECONDS = 30     # Process in 30s windows
    OVERLAP_SECONDS = 5             # Overlap to avoid cutting sentences

    def __init__(self, encounter_id: int, patient_id: int):
        self.encounter_id = encounter_id
        self.patient_id = patient_id
        self.buffer: list[bytes] = []
        self.full_transcript: list[dict] = []

    async def process_audio_chunk(self, audio_bytes: bytes) -> dict | None:
        """Process incoming audio chunk. Returns draft notes when enough audio accumulated."""
        self.buffer.append(audio_bytes)
        total_duration = len(self.buffer) * 0.1  # estimate: 100ms per chunk

        if total_duration >= self.CHUNK_DURATION_SECONDS:
            # Assemble and transcribe
            combined = b"".join(self.buffer[-int(self.CHUNK_DURATION_SECONDS / 0.1):])
            segments = await self._transcribe_and_diarize(combined)
            self.full_transcript.extend(segments)

            # After each chunk, update the live draft
            return await self._extract_clinical_content(self.full_transcript)
        return None

    async def _transcribe_and_diarize(self, audio_bytes: bytes) -> list[dict]:
        # Write to temp file
        tmp_path = f"/tmp/ambient_{self.encounter_id}_{uuid.uuid4().hex}.wav"
        async with aiofiles.open(tmp_path, "wb") as f:
            await f.write(audio_bytes)

        # Whisper transcription with timestamps
        result = await asyncio.to_thread(
            whisper_model.transcribe,
            tmp_path,
            word_timestamps=True,
            language="en",
        )

        # Diarize
        diarizer = SpeakerDiarizer()
        diarized = await diarizer.diarize(tmp_path)

        # Align Whisper words to speaker segments
        return self._align_transcript_to_speakers(result["segments"], diarized)
```

---

## Clinical Content Extraction

```python
# app/services/ambient/extractor.py

AMBIENT_EXTRACTION_PROMPT = """You are a clinical documentation AI. Below is a transcript of a medical encounter, labeled by speaker role (doctor/patient).

Extract the following in structured JSON:
1. Chief complaint (from patient's words)
2. History of present illness (HPI) — patient's description
3. Review of systems — any symptoms mentioned
4. Assessment — doctor's conclusions about diagnoses
5. Plan — what the doctor ordered or plans to do
6. Medications mentioned (new, changed, or stopped)
7. Lab or imaging orders mentioned
8. Follow-up instructions

Transcript:
{transcript}

Patient context:
{patient_context}

Return ONLY valid JSON matching the schema below. Do not invent information not stated in the transcript.
Schema: {schema}"""

class AmbientExtractor:
    async def extract_soap_note(
        self,
        transcript: list[dict],
        patient: Patient,
        encounter: Encounter,
    ) -> dict:
        transcript_text = "\n".join(
            f"[{seg['role'].upper()}]: {seg['text']}"
            for seg in transcript
            if seg.get("text")
        )

        patient_context = await self._build_patient_context(patient)

        response = await anthropic_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4096,
            system="You are a board-certified physician assistant specializing in clinical documentation. Extract only what is explicitly stated. Never infer or hallucinate clinical findings.",
            messages=[{
                "role": "user",
                "content": AMBIENT_EXTRACTION_PROMPT.format(
                    transcript=transcript_text,
                    patient_context=patient_context,
                    schema=SOAP_EXTRACTION_SCHEMA,
                ),
            }],
        )

        extracted = json.loads(response.content[0].text)
        return await self._to_draft_fhir_resources(extracted, patient, encounter)

    async def _to_draft_fhir_resources(self, extracted: dict, patient: Patient, encounter: Encounter) -> dict:
        drafts = {
            "composition": self._build_soap_composition(extracted, patient, encounter),
            "conditions": [],
            "medication_requests": [],
            "service_requests": [],
            "observations": [],
        }

        # New/updated conditions from assessment
        for problem in extracted.get("assessment", {}).get("problems", []):
            drafts["conditions"].append({
                "resourceType": "Condition",
                "clinicalStatus": {"coding": [{"code": "active"}]},
                "code": {"text": problem["description"], "coding": problem.get("snomed_codes", [])},
                "subject": {"reference": f"Patient/{patient.patient_id}"},
                "encounter": {"reference": f"Encounter/{encounter.encounter_id}"},
            })

        # Orders from plan
        for order in extracted.get("plan", {}).get("orders", []):
            if order["type"] == "lab":
                drafts["service_requests"].append({
                    "resourceType": "ServiceRequest",
                    "status": "draft",
                    "intent": "order",
                    "category": [{"coding": [{"code": "laboratory"}]}],
                    "code": {"text": order["description"]},
                    "subject": {"reference": f"Patient/{patient.patient_id}"},
                })
            elif order["type"] == "medication":
                drafts["medication_requests"].append({
                    "resourceType": "MedicationRequest",
                    "status": "draft",
                    "intent": "order",
                    "medicationCodeableConcept": {"text": order["drug_name"]},
                    "subject": {"reference": f"Patient/{patient.patient_id}"},
                    "dosageInstruction": [{"text": order.get("sig", "")}],
                })

        return drafts
```

---

## Ambient WebSocket Endpoint

```python
# app/routers/websocket_ambient.py

@ambient_router.websocket("/ws/ambient/{encounter_id}")
async def ambient_documentation_ws(
    websocket: WebSocket,
    encounter_id: int,
    token: str = Query(...),
):
    """
    WebSocket for ambient AI documentation.
    Client sends raw PCM audio chunks; server sends back live draft updates.
    """
    user = await validate_ws_token(token)
    await websocket.accept()

    encounter = await encounter_repo.get(encounter_id, user["sub"], user["activeOrganizationId"])
    patient = encounter.patient

    pipeline = AmbientAudioPipeline(encounter_id, patient.patient_id)

    try:
        while True:
            # Receive audio chunk (raw PCM, 16kHz, 16-bit mono)
            data = await websocket.receive_bytes()

            # Process and maybe get draft update
            draft = await pipeline.process_audio_chunk(data)

            if draft:
                await websocket.send_json({
                    "type": "draft_update",
                    "encounter_id": encounter_id,
                    "draft": draft,
                    "transcript_preview": pipeline.full_transcript[-5:],  # last 5 segments
                })

    except WebSocketDisconnect:
        # Encounter ended — finalize the note
        final_draft = await pipeline.finalize()
        # Store as pending review in Redis for provider to see on screen
        await redis_client.setex(
            f"ambient:draft:{encounter_id}",
            3600,  # 1 hour TTL
            json.dumps(final_draft),
        )
```

---

## Provider Review Interface

After the encounter, the provider sees a review screen:

```
┌──────────────────────────────────────────────────────────┐
│  AI Draft — Encounter #20001 — John Smith — 01/15/2024   │
├──────────────────────────────────────────────────────────┤
│  SOAP Note                                    [Edit] [✓]  │
│  ────────────────────────────────────────────────────── │
│  S: Patient reports right knee pain, worse at night...   │
│  O: BP 138/88, HR 72...                                  │
│  A: 1. Osteoarthritis, right knee (new)                  │
│     2. Hypertension, uncontrolled                        │
│  P: - X-ray right knee (ordered)                         │
│     - Increase amlodipine 5mg → 10mg                     │
│     - Follow up 4 weeks                                  │
├──────────────────────────────────────────────────────────┤
│  New Conditions (tap to approve)                         │
│  [✓] Osteoarthritis, right knee (M17.11)   [Edit] [✗]   │
├──────────────────────────────────────────────────────────┤
│  Orders (tap to approve)                                 │
│  [✓] X-Ray Right Knee (CPT 73560)          [Edit] [✗]   │
│  [✓] Amlodipine 10mg PO daily              [Edit] [✗]   │
├──────────────────────────────────────────────────────────┤
│  [Approve All & Sign]          [Review Each]             │
└──────────────────────────────────────────────────────────┘
```

### Approve All Endpoint

```python
POST /ambient/{encounter_id}/$approve
{
  "approve_all": true,
  "overrides": {
    "conditions": [120001],      # IDs to skip
  }
}
```

This batch-creates all approved FHIR resources in a transaction bundle.

---

## Ambient AI Accuracy Benchmarks

Target metrics (based on Nuance DAX published benchmarks):

| Metric | Target |
|---|---|
| Word Error Rate (WER) | < 8% on medical vocabulary |
| Condition extraction recall | > 90% |
| Medication extraction precision | > 95% (errors dangerous) |
| Order extraction recall | > 92% |
| Note accepted without edits | > 70% of encounters |
| Time to complete review | < 45 seconds |

---

## Privacy Architecture

Ambient audio is the highest-sensitivity PHI category:

```python
class AmbientPrivacyManager:
    # Audio retention policy: delete raw audio after transcription
    AUDIO_RETENTION_SECONDS = 3600  # 1 hour max

    async def after_transcription(self, encounter_id: int):
        """Delete raw audio immediately after transcription complete."""
        audio_path = f"ambient_audio/{encounter_id}/"
        await s3_client.delete_objects(Bucket=settings.AUDIO_BUCKET, prefix=audio_path)

    async def on_encounter_end(self, encounter_id: int):
        """Clear all ambient buffers when encounter closes."""
        await redis_client.delete(f"ambient:buffer:{encounter_id}")
        # Draft kept 1 hour for provider review, then purged
```

Patient consent for ambient recording must be obtained (Consent resource) before session starts.

---

## Estimated Effort

| Component | Days |
|---|---|
| Audio WebSocket ingestion pipeline | 3 |
| Whisper integration (self-hosted or API) | 2 |
| pyannote speaker diarization | 2 |
| Claude-based SOAP extraction | 3 |
| Draft FHIR resource builder | 2 |
| Provider review API + approve endpoint | 2 |
| Privacy / audio deletion pipeline | 1 |
| Consent check before session | 0.5 |
| Accuracy benchmarking + tuning | 5 |
| **Total** | **20.5 days** |
