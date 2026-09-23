# Video Visits — Synchronous Virtual Care

**FHIR Resources:** `Encounter` (class=VR), `Appointment`, `Consent`  
**Standards:** Ryan Haight Act, HIPAA Technical Safeguards, HITECH  
**Billing:** CPT 99202-99215 (telehealth modifier GT or 95), POS 02 (telehealth)

---

## Regulatory Requirements

| Requirement | Rule | Detail |
|---|---|---|
| **Ryan Haight Act** | DEA | Controlled substances cannot be prescribed via telehealth without prior in-person visit (except post-COVID flexibilities, renewed annually) |
| **HIPAA-compliant platform** | HHS | Must have BAA with video vendor; Zoom for Healthcare, Doxy.me, Teladoc qualify |
| **Cross-state licensing** | State medical boards | Provider must be licensed in patient's state at time of visit |
| **Consent** | Most states | Informed consent for telehealth required at first visit |
| **Documentation** | Payers | Must document telehealth modality in Encounter |
| **Audio-only** | CMS | Medicare reimburses audio-only (CPT 99441-99443) for patients without video capability |

---

## Video Platform Options

| Platform | HIPAA BAA | API Available | White-Label | Cost |
|---|---|---|---|---|
| **Doxy.me** | Yes | No | Yes (waiting room UI) | Free tier available |
| **Zoom for Healthcare** | Yes | Yes (Zoom SDK) | Yes | $15/host/month |
| **Daily.co** | Yes | Yes (REST + client SDK) | Yes | Usage-based |
| **Vonage (Video API)** | Yes | Yes | Yes | Usage-based |
| **Amazon Chime SDK** | Yes (AWS BAA) | Yes | Yes | Usage-based |

**Recommended:** Daily.co or Zoom SDK — both provide HIPAA BAA, JavaScript SDK for browser-based visits, and webhook events for session tracking.

---

## Telehealth Encounter Model

```python
# Telehealth adds extension to Encounter for video session tracking

class TelehealthSession(Base):
    __tablename__ = "telehealth_session"

    id                  = Column(BigInteger, primary_key=True)
    encounter_id        = Column(BigInteger, ForeignKey("encounter.id"), nullable=False, index=True)
    org_id              = Column(UUID, nullable=False)
    video_platform      = Column(String(50))         # zoom | daily | vonage
    session_id          = Column(String(255))         # platform-assigned session/room ID
    join_url_provider   = Column(Text)               # provider's authenticated join link
    join_url_patient    = Column(Text)               # patient's authenticated join link
    scheduled_start     = Column(DateTime(timezone=True))
    actual_start        = Column(DateTime(timezone=True))
    actual_end          = Column(DateTime(timezone=True))
    duration_minutes    = Column(Integer)
    status              = Column(String(30), default="created")  # created|ready|in-progress|completed|no-show|cancelled
    patient_joined_at   = Column(DateTime(timezone=True))
    provider_joined_at  = Column(DateTime(timezone=True))
    recording_url       = Column(Text)               # only if patient consented and org enabled
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    encounter           = relationship("Encounter", lazy="selectin")
```

---

## FHIR Encounter for Telehealth

```json
{
  "resourceType": "Encounter",
  "status": "in-progress",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "VR",
    "display": "virtual"
  },
  "type": [{
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "448337001",
      "display": "Telemedicine consultation with patient"
    }]
  }],
  "subject": { "reference": "Patient/10001" },
  "participant": [{
    "type": [{ "coding": [{ "code": "ATND", "display": "attender" }] }],
    "individual": { "reference": "Practitioner/30001" }
  }],
  "period": { "start": "2024-01-20T14:00:00Z" },
  "location": [{
    "location": { "reference": "Location/virtual-clinic" },
    "status": "active",
    "physicalType": {
      "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/location-physical-type", "code": "vi", "display": "Virtual" }]
    }
  }],
  "extension": [{
    "url": "https://fhir.example.com/StructureDefinition/telehealth-platform",
    "valueString": "daily.co"
  }, {
    "url": "https://fhir.example.com/StructureDefinition/telehealth-session-id",
    "valueString": "abc123"
  }]
}
```

---

## Video Session Service

```python
# app/services/telehealth/video_session_service.py

import httpx

class DailyVideoService:
    """
    Integration with Daily.co HIPAA video API.
    BAA required — configure via Daily.co dashboard before use.
    """

    BASE_URL = "https://api.daily.co/v1"

    def __init__(self):
        self.api_key = settings.DAILY_API_KEY
        self.headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def create_room(self, appointment_id: int, expires_at: datetime) -> dict:
        """Create a private video room for the appointment."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.BASE_URL}/rooms",
                headers=self.headers,
                json={
                    "name": f"visit-{appointment_id}",
                    "privacy": "private",
                    "properties": {
                        "exp": int(expires_at.timestamp()),
                        "max_participants": 4,             # patient + provider + 1 observer + interpreter
                        "enable_recording": False,          # off by default; enable if patient consents
                        "enable_transcription": False,      # ambient AI handles this separately
                        "start_video_off": False,
                        "start_audio_off": False,
                        "enable_knocking": True,            # patient waits in lobby
                        "enable_prejoin_ui": True,
                    },
                },
            )
            resp.raise_for_status()
            room = resp.json()
            return {"room_url": room["url"], "room_name": room["name"]}

    async def create_meeting_token(self, room_name: str, user_name: str, is_owner: bool, exp: datetime) -> str:
        """Create authenticated join token for provider (owner) or patient."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.BASE_URL}/meeting-tokens",
                headers=self.headers,
                json={
                    "properties": {
                        "room_name": room_name,
                        "user_name": user_name,
                        "is_owner": is_owner,           # provider is owner; can mute/remove
                        "exp": int(exp.timestamp()),
                        "eject_at_token_exp": True,     # end session when token expires
                    }
                },
            )
            resp.raise_for_status()
            return resp.json()["token"]

    async def delete_room(self, room_name: str):
        """Clean up room after visit ends."""
        async with httpx.AsyncClient() as client:
            await client.delete(f"{self.BASE_URL}/rooms/{room_name}", headers=self.headers)
```

---

## Telehealth Appointment Router

```python
@telehealth_router.post(
    "/telehealth/appointments/{appointment_id}/$create-visit",
    operation_id="create_telehealth_visit",
    summary="Create video room and generate join links for a telehealth appointment",
)
async def create_telehealth_visit(
    appointment_id: int,
    request: Request,
    appointment: Appointment = Depends(resolve_appointment),
):
    user = request.state.user
    provider = await practitioner_repo.get_by_user_id(user["sub"], user["activeOrganizationId"])
    patient = appointment.patient

    # Create video room (expires 4 hours after scheduled start)
    expires_at = appointment.start_datetime + timedelta(hours=4)
    room = await daily_video_service.create_room(appointment_id, expires_at)

    # Provider token (is_owner=True — can manage the room)
    provider_token = await daily_video_service.create_meeting_token(
        room["room_name"], provider.display_name, is_owner=True, exp=expires_at
    )

    # Patient token (is_owner=False)
    patient_token = await daily_video_service.create_meeting_token(
        room["room_name"], f"{patient.given_name} {patient.family_name}", is_owner=False, exp=expires_at
    )

    # Store session in DB
    session = await telehealth_session_repo.create({
        "encounter_id": appointment.encounter_id,
        "org_id": user["activeOrganizationId"],
        "video_platform": "daily",
        "session_id": room["room_name"],
        "join_url_provider": f"{room['room_url']}?t={provider_token}",
        "join_url_patient": f"{room['room_url']}?t={patient_token}",
        "scheduled_start": appointment.start_datetime,
        "status": "ready",
    })

    # Notify patient
    await notification_service.send_telehealth_ready(
        patient=patient,
        join_url=session.join_url_patient,
        appointment_time=appointment.start_datetime,
    )

    return {
        "provider_join_url": session.join_url_provider,
        "patient_join_url": session.join_url_patient,
        "session_id": room["room_name"],
        "expires_at": expires_at.isoformat(),
    }


@telehealth_router.post(
    "/telehealth/sessions/{session_id}/webhooks",
    operation_id="telehealth_webhook",
    summary="Receive Daily.co session events (internal)",
    include_in_schema=False,
)
async def telehealth_webhook(request: Request, session_id: str):
    """
    Receives meeting-started, participant-joined, meeting-ended events from Daily.co.
    Updates TelehealthSession and Encounter accordingly.
    """
    payload = await request.json()
    event_type = payload.get("action")
    room_name = payload.get("room", {}).get("name")

    session = await telehealth_session_repo.get_by_session_id(room_name)
    if not session:
        return {"ok": True}

    if event_type == "meeting-started":
        await telehealth_session_repo.patch(session.id, {"status": "in-progress", "actual_start": datetime.utcnow()})

    elif event_type == "participant-joined":
        participant_name = payload.get("participant", {}).get("user_name", "")
        # Heuristic: non-provider is the patient
        if "Patient" in participant_name or not payload["participant"].get("is_owner"):
            await telehealth_session_repo.patch(session.id, {"patient_joined_at": datetime.utcnow()})
        else:
            await telehealth_session_repo.patch(session.id, {"provider_joined_at": datetime.utcnow()})

    elif event_type == "meeting-ended":
        ended_at = datetime.utcnow()
        duration = int((ended_at - session.actual_start).total_seconds() / 60) if session.actual_start else 0
        await telehealth_session_repo.patch(session.id, {
            "status": "completed",
            "actual_end": ended_at,
            "duration_minutes": duration,
        })
        # Update FHIR Encounter period.end and status
        await encounter_service.patch(session.encounter_id, {
            "status": "finished",
            "period": {"end": ended_at.isoformat() + "Z"},
        })
        # Clean up the room
        await daily_video_service.delete_room(room_name)

    return {"ok": True}
```

---

## Telehealth Consent

```python
# At first telehealth encounter, capture informed consent

async def capture_telehealth_consent(patient_id: int, practitioner_id: int, org_id: str) -> dict:
    return await consent_service.create({
        "status": "active",
        "scope": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "treatment"}]},
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes",
                "code": "telehealth",
                "display": "Telehealth Consent",
            }]
        }],
        "patient": {"reference": f"Patient/{patient_id}"},
        "dateTime": datetime.utcnow().isoformat() + "Z",
        "provision": {
            "type": "permit",
            "period": {"start": datetime.utcnow().date().isoformat()},
            "purpose": [{"code": "TREAT"}],
        },
        "policyRule": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "OPTIN"}]
        },
    }, org_id=org_id)
```

---

## Billing for Telehealth

| Scenario | Modifier | POS |
|---|---|---|
| Medicare video visit | GT or 95 | 02 (telehealth) |
| Medicare audio-only | 93 | 02 |
| Commercial payer video | Check payer policy | 02 or 11 |
| State Medicaid | Varies | 02 |

```python
# Automatic modifier injection for telehealth claims:
if encounter.class_code == "VR":
    claim_item["modifier"] = [{"coding": [{"code": "95"}]}]  # synchronous telehealth
    claim["serviceFacilityLocation"] = {"coding": [{"code": "02"}]}  # telehealth POS
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `TelehealthSession` DB model | 1 |
| Daily.co room creation + token service | 2 |
| Telehealth appointment router + webhook | 2 |
| Patient notification (join link + reminder) | 1 |
| Telehealth consent capture | 0.5 |
| Billing modifier injection | 0.5 |
| Provider telehealth dashboard (join queue) | 2 |
| **Total** | **9 days** |
