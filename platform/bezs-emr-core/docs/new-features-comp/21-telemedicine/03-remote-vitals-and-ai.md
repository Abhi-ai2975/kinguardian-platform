# Remote Vitals During Video Visits & AI Analysis

**FHIR Resources:** `Observation` (category=vital-signs), `DocumentReference` (video frame analysis)  
**Integration:** Ambient documentation (section 17-01) + RPM IoT pipeline (section 18)

---

## Vitals During Telehealth — The Problem

In-person visits automatically generate vitals from nursing staff. Telehealth visits traditionally lose this data — no weight, no blood pressure, no SpO2. Modern telehealth platforms can bridge this gap through:

1. **Patient self-reported vitals** — patient reads home devices before/during visit
2. **Connected device push** — automatically ingest from HealthKit, Withings, Dexcom (section 18)
3. **AI visual analysis** — detect respiratory rate, heart rate, skin color from video
4. **Peripheral devices** — some platforms support Bluetooth device pairing via browser

---

## Patient Self-Report During Visit

```python
@telehealth_router.post(
    "/telehealth/sessions/{session_id}/vitals",
    operation_id="submit_telehealth_vitals",
    summary="Patient submits self-measured vitals during a telehealth visit",
)
async def submit_telehealth_vitals(
    session_id: str,
    body: TelehealthVitalsSchema,
    request: Request,
):
    """
    Patient measures and reports vitals from home devices during video visit.
    Creates FHIR Observations linked to the telehealth encounter.
    """
    user = request.state.user
    telehealth_session = await telehealth_session_repo.get_by_session_id(session_id)

    VITAL_LOINC_MAP = {
        "blood_pressure_systolic": "8480-6",
        "blood_pressure_diastolic": "8462-4",
        "heart_rate": "8867-4",
        "body_temperature": "8310-5",
        "body_weight": "29463-7",
        "body_height": "8302-2",
        "oxygen_saturation": "59408-5",
        "blood_glucose": "2339-0",
        "respiratory_rate": "9279-1",
    }
    VITAL_UNIT_MAP = {
        "blood_pressure_systolic": "mm[Hg]",
        "blood_pressure_diastolic": "mm[Hg]",
        "heart_rate": "/min",
        "body_temperature": "degF",
        "body_weight": "[lb_av]",
        "body_height": "[in_i]",
        "oxygen_saturation": "%",
        "blood_glucose": "mg/dL",
        "respiratory_rate": "/min",
    }

    created = []
    for field, value in body.model_dump(exclude_none=True).items():
        loinc = VITAL_LOINC_MAP.get(field)
        if not loinc or value is None:
            continue

        obs = await observation_service.create({
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": loinc}]},
            "subject": {"reference": f"Patient/{user['patient_id']}"},
            "encounter": {"reference": f"Encounter/{telehealth_session.encounter_id}"},
            "effectiveDateTime": datetime.utcnow().isoformat() + "Z",
            "valueQuantity": {"value": float(value), "unit": VITAL_UNIT_MAP[field], "system": "http://unitsofmeasure.org", "code": VITAL_UNIT_MAP[field]},
            "method": {"coding": [{"code": "self-reported", "display": "Patient self-reported via telehealth"}]},
        }, user["sub"], user["activeOrganizationId"])
        created.append(obs.observation_id)

    # Blood pressure as paired component observation
    if body.blood_pressure_systolic and body.blood_pressure_diastolic:
        bp_obs = await observation_service.create({
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel"}]},
            "subject": {"reference": f"Patient/{user['patient_id']}"},
            "encounter": {"reference": f"Encounter/{telehealth_session.encounter_id}"},
            "effectiveDateTime": datetime.utcnow().isoformat() + "Z",
            "component": [
                {"code": {"coding": [{"system": "http://loinc.org", "code": "8480-6"}]}, "valueQuantity": {"value": body.blood_pressure_systolic, "unit": "mm[Hg]"}},
                {"code": {"coding": [{"system": "http://loinc.org", "code": "8462-4"}]}, "valueQuantity": {"value": body.blood_pressure_diastolic, "unit": "mm[Hg]"}},
            ],
        }, user["sub"], user["activeOrganizationId"])
        created.append(bp_obs.observation_id)

    return {"created_observations": created}
```

---

## AI Resting HR & RR from Video (rPPG)

Remote Photoplethysmography (rPPG) extracts physiological signals from subtle skin color changes in video — no physical contact needed.

```python
# app/services/telehealth/rpppg_service.py
# Library: rppg-toolbox (open source, Python) or Nuralogix Anura API (commercial)

import cv2
import numpy as np

class RPPGAnalyzer:
    """
    Extracts heart rate and respiratory rate from video frames.
    Accuracy: ±3 BPM (HR), ±2 BPM (RR) under good lighting conditions.

    Requires:
    - 30+ seconds of stable face video
    - Good lighting (no strong backlighting)
    - Minimal movement
    """

    WINDOW_SECONDS = 30    # minimum signal window
    SAMPLE_FPS = 30        # frames per second to sample

    async def analyze_video_segment(self, video_frames: list[np.ndarray]) -> dict:
        """
        Process video frames captured from the Daily.co room during the visit.
        Returns HR and RR estimates with confidence scores.
        """
        if len(video_frames) < self.WINDOW_SECONDS * self.SAMPLE_FPS:
            return {"error": "insufficient_frames", "required_seconds": self.WINDOW_SECONDS}

        # Extract ROI: face bounding box using MediaPipe Face Detection
        roi_signals = self._extract_roi_signals(video_frames)

        # Green channel carries strongest PPG signal
        green_channel = roi_signals[:, 1]
        filtered = self._bandpass_filter(green_channel, lowcut=0.75, highcut=3.5, fps=self.SAMPLE_FPS)

        # FFT for heart rate
        freqs = np.fft.rfftfreq(len(filtered), d=1.0/self.SAMPLE_FPS)
        power = np.abs(np.fft.rfft(filtered))**2
        hr_freq = freqs[(power == power.max())]
        hr_bpm = float(hr_freq[0] * 60) if len(hr_freq) > 0 else None

        # Respiratory rate from low-frequency amplitude modulation
        rr_signal = self._extract_respiratory_signal(roi_signals)
        rr_bpm = self._calculate_rr_from_signal(rr_signal)

        confidence = self._calculate_confidence(roi_signals)

        return {
            "heart_rate_bpm": round(hr_bpm) if hr_bpm else None,
            "respiratory_rate_bpm": round(rr_bpm) if rr_bpm else None,
            "confidence": confidence,           # 0.0–1.0
            "method": "rppg",
            "window_seconds": self.WINDOW_SECONDS,
            "notes": "Non-contact video analysis. Requires provider verification before clinical use.",
        }

    def _extract_roi_signals(self, frames: list[np.ndarray]) -> np.ndarray:
        """Extract mean RGB values from facial ROI in each frame."""
        import mediapipe as mp
        face_detection = mp.solutions.face_detection.FaceDetection(min_detection_confidence=0.5)
        signals = []
        for frame in frames:
            results = face_detection.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if results.detections:
                bbox = results.detections[0].location_data.relative_bounding_box
                h, w = frame.shape[:2]
                x1 = int(bbox.xmin * w)
                y1 = int(bbox.ymin * h)
                x2 = x1 + int(bbox.width * w)
                y2 = y1 + int(bbox.height * h)
                roi = frame[y1:y2, x1:x2]
                signals.append(roi.mean(axis=(0, 1)))   # mean RGB
        return np.array(signals)

    def _bandpass_filter(self, signal: np.ndarray, lowcut: float, highcut: float, fps: int) -> np.ndarray:
        from scipy.signal import butter, filtfilt
        b, a = butter(3, [lowcut / (fps/2), highcut / (fps/2)], btype="band")
        return filtfilt(b, a, signal)

    def _calculate_confidence(self, signals: np.ndarray) -> float:
        """Low variance in signal = stable face = higher confidence."""
        variance = signals.var(axis=0).mean()
        return max(0.0, min(1.0, 1.0 - variance / 100.0))
```

---

## Persisting rPPG Observations

```python
async def create_rpppg_observations(
    analysis: dict,
    patient_id: int,
    encounter_id: int,
    org_id: str,
    user_sub: str,
) -> list[int]:
    """Create FHIR Observations from rPPG analysis with method coding."""
    created = []

    if analysis.get("heart_rate_bpm") and analysis["confidence"] > 0.6:
        obs = await observation_service.create({
            "status": "preliminary",   # preliminary = needs provider confirmation
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "encounter": {"reference": f"Encounter/{encounter_id}"},
            "effectiveDateTime": datetime.utcnow().isoformat() + "Z",
            "valueQuantity": {"value": analysis["heart_rate_bpm"], "unit": "/min", "system": "http://unitsofmeasure.org", "code": "/min"},
            "method": {"coding": [{
                "system": "http://snomed.info/sct",
                "code": "703689004",
                "display": "Remote photoplethysmography",
            }]},
            "note": [{"text": f"AI video analysis (rPPG). Confidence: {analysis['confidence']:.0%}. Provider verification required."}],
        }, user_sub, org_id)
        created.append(obs.observation_id)

    if analysis.get("respiratory_rate_bpm") and analysis["confidence"] > 0.6:
        obs = await observation_service.create({
            "status": "preliminary",
            "code": {"coding": [{"system": "http://loinc.org", "code": "9279-1", "display": "Respiratory rate"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "encounter": {"reference": f"Encounter/{encounter_id}"},
            "valueQuantity": {"value": analysis["respiratory_rate_bpm"], "unit": "/min", "system": "http://unitsofmeasure.org", "code": "/min"},
            "method": {"coding": [{"code": "video-analysis", "display": "AI video respiratory analysis"}]},
        }, user_sub, org_id)
        created.append(obs.observation_id)

    return created
```

---

## Ambient Documentation in Telehealth

The ambient AI pipeline from section 17-01 applies directly to video visits. The integration requires:

```python
# In telehealth session: capture audio from video room
# Daily.co supports audio recording via WebSocket audio track

@telehealth_router.post("/telehealth/sessions/{session_id}/$start-ambient")
async def start_ambient_recording(session_id: str, request: Request):
    """
    Start ambient documentation during a video visit.
    Audio is streamed to the ambient pipeline (section 17-01) for real-time transcription.
    """
    telehealth_session = await telehealth_session_repo.get_by_session_id(session_id)
    encounter_id = telehealth_session.encounter_id

    # Publish start event — ambient pipeline (Celery + WebSocket) picks this up
    await redis_client.publish(
        f"ambient:start",
        json.dumps({
            "encounter_id": encounter_id,
            "source": "telehealth",
            "session_id": session_id,
        })
    )
    return {"status": "ambient_started", "encounter_id": encounter_id}
```

The ambient pipeline (WhisperX → pyannote diarization → Claude extraction → draft FHIR) handles the rest exactly as documented in section 17-01, since it's audio-source agnostic.

---

## Skin Lesion AI Analysis (Dermatology Store-and-Forward)

```python
# app/services/telehealth/dermatology_ai.py

class DermatologyAIService:
    """
    AI-assisted analysis of skin lesion photos submitted via store-and-forward.
    Uses Claude vision to provide preliminary description; never a diagnosis.
    """

    async def analyze_lesion_image(
        self,
        image_bytes: bytes,
        clinical_context: str,
    ) -> dict:
        """
        Returns preliminary description and urgency assessment.
        Output is for specialist triage assistance only, not clinical decision.
        """
        import base64
        image_b64 = base64.standard_b64encode(image_bytes).decode()

        response = await anthropic_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64},
                    },
                    {
                        "type": "text",
                        "text": f"""You are assisting a dermatologist reviewing a patient-submitted skin lesion photo.

Clinical context provided by patient: {clinical_context}

Provide:
1. Objective visual description (size estimate, color, border, texture — ABCDE criteria)
2. Urgency level: ROUTINE | EXPEDITED | URGENT
3. Suggested follow-up timeframe

Important:
- Do NOT provide a diagnosis or differential
- Do NOT use diagnostic terminology (e.g. "melanoma", "basal cell")
- This output is for specialist triage assistance only
- A qualified dermatologist must make all clinical assessments""",
                    },
                ],
            }],
        )

        description = response.content[0].text

        # Parse urgency from response
        urgency = "ROUTINE"
        if "URGENT" in description.upper():
            urgency = "URGENT"
        elif "EXPEDITED" in description.upper():
            urgency = "EXPEDITED"

        return {
            "visual_description": description,
            "urgency": urgency,
            "disclaimer": "AI-assisted triage description. Not a clinical diagnosis. Dermatologist review required.",
        }
```

---

## Telehealth Quality Metrics

Track quality indicators to identify care gaps and billing compliance:

```python
@telehealth_router.get("/telehealth/quality-metrics")
async def get_telehealth_quality_metrics(request: Request):
    user = request.state.user
    org_id = user["activeOrganizationId"]

    async with session_factory() as session:
        metrics = await session.execute(text("""
            SELECT
                COUNT(*) AS total_visits,
                COUNT(*) FILTER (WHERE ts.actual_end IS NOT NULL) AS completed_visits,
                COUNT(*) FILTER (WHERE ts.patient_joined_at IS NULL AND ts.status = 'completed') AS no_shows,
                AVG(ts.duration_minutes) FILTER (WHERE ts.actual_end IS NOT NULL) AS avg_duration_min,
                COUNT(*) FILTER (WHERE ts.actual_start - ts.scheduled_start > INTERVAL '5 minutes') AS late_starts,
                COUNT(DISTINCT o.id) FILTER (WHERE o.method_coding @> '[{"code":"rppg"}]') AS ai_vitals_captured,
                COUNT(DISTINCT o.id) FILTER (WHERE o.method_coding @> '[{"code":"self-reported"}]') AS self_reported_vitals
            FROM telehealth_session ts
            JOIN encounter e ON e.id = ts.encounter_id
            LEFT JOIN observation o ON o.encounter_id = e.id
            WHERE ts.org_id = :org_id
              AND ts.scheduled_start >= NOW() - INTERVAL '30 days'
        """), {"org_id": org_id})

    return dict(metrics.fetchone())
```

---

## AI-Enhanced Visit Summary

After the telehealth visit ends, automatically generate a structured visit summary:

```python
async def generate_visit_summary(encounter_id: int, org_id: str) -> str:
    """
    Combines ambient transcript, self-reported vitals, rPPG vitals,
    and e-prescriptions into a coherent visit note draft.
    """
    # Gather all encounter data
    encounter = await encounter_repo.get(encounter_id, org_id)
    vitals = await observation_repo.list(encounter_id=encounter_id, category="vital-signs")
    medications = await medication_request_repo.list(encounter_id=encounter_id)
    orders = await service_request_repo.list(encounter_id=encounter_id)

    # Get ambient transcript (if available)
    draft_soap = await draft_soap_note_repo.get_by_encounter(encounter_id)

    prompt = f"""Synthesize the following telehealth visit data into a structured clinical note.

AMBIENT TRANSCRIPT SOAP NOTE (draft):
{draft_soap.content if draft_soap else "No ambient transcript available"}

VITALS CAPTURED DURING VISIT:
{[{"code": v.code_text, "value": v.value_quantity_value, "unit": v.value_quantity_unit, "method": v.method_coding} for v in vitals]}

MEDICATIONS ORDERED:
{[m.medication_codeable_concept_text for m in medications]}

ORDERS PLACED:
{[o.code_text for o in orders]}

Format as:
CC: (chief complaint)
HPI: (history of present illness)
VITALS: (list all captured vitals)
A/P: (assessment and plan, numbered)

Keep it clinically concise. Flag any AI-inferred vital (rPPG) as "(AI-estimated)" for provider verification."""

    response = await anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

---

## Technical Stack Summary

| Capability | Technology |
|---|---|
| Video platform | Daily.co (HIPAA BAA) |
| rPPG heart rate | rppg-toolbox + MediaPipe face detection |
| Skin lesion AI | Claude vision (claude-opus-4-8) |
| Ambient transcription | Whisper (same as section 17-01) |
| Vitals storage | FHIR Observation with method coding |
| Visit summary AI | Claude claude-opus-4-8 |

---

## Estimated Effort

| Component | Days |
|---|---|
| Patient self-reported vitals API | 1.5 |
| rPPG video analysis integration | 3 |
| AI rPPG Observations (preliminary) | 1 |
| Ambient documentation in telehealth | 1 (reuses section 17-01) |
| Dermatology AI triage for store-and-forward | 2 |
| AI visit summary generation | 1.5 |
| Telehealth quality metrics dashboard | 1 |
| **Total** | **11 days** |
