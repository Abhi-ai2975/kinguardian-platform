# Online Patient Scheduling

**FHIR Resources:** `Schedule`, `Slot`, `Appointment`  
**Regulatory:** PCMH standard requires patient self-scheduling capability

---

## How It Works

```
Patient logs into portal → clicks "Book Appointment"
         ↓
Patient selects:
  - Reason for visit (New patient / Follow-up / Urgent care / Telehealth)
  - Provider (or "First available")
  - Date range preference
         ↓
GET /Slot?schedule=...&status=free&start=ge2024-01-15&_count=20
  → Returns available time slots
         ↓
Patient selects a slot
         ↓
POST /Appointment
  { slot: [Slot/220001], participant: [Patient/10001, Practitioner/30001], ... }
         ↓
Appointment status: "booked"
         ↓
Confirmation email + SMS to patient
Notification to provider's calendar
```

---

## Slot Discovery API

The key query for the scheduling UI:

```
GET /Slot?
  schedule=Schedule/200001&
  status=free&
  start=ge2024-01-15T00:00:00Z&
  start=le2024-01-22T23:59:59Z&
  _count=50

Response:
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 12,
  "entry": [
    { "resource": { "resourceType": "Slot", "id": "220001", "start": "2024-01-15T09:00:00Z", "end": "2024-01-15T09:30:00Z", "status": "free", "serviceType": [{ "coding": [{ "code": "follow-up" }] }] } },
    ...
  ]
}
```

---

## Multi-Provider / Multi-Location Slot Search

Patients often want "first available" across multiple providers or locations:

```python
# app/routers/operations/scheduling.py

@scheduling_router.get(
    "/$find-available-slots",
    operation_id="find_available_slots",
    summary="Find available slots across providers and locations",
    description="Returns free slots matching the requested service type and time window, across specified practitioners or organization.",
)
async def find_available_slots(
    service_type: str = Query(..., description="Appointment type: new-patient, follow-up, telehealth, urgent"),
    start: str = Query(..., description="ISO 8601 start datetime"),
    end: str = Query(..., description="ISO 8601 end datetime"),
    practitioner: str | None = Query(None, description="Practitioner FHIR ID to filter"),
    location: str | None = Query(None, description="Location FHIR ID to filter"),
    _count: int = Query(20, le=100),
    request: Request = ...,
):
    user = request.state.user
    org_id = user["activeOrganizationId"]

    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)

    async with session_factory() as session:
        result = await session.execute(
            text("""
                SELECT sl.slot_id, sl.start_time, sl.end_time, sl.status,
                       sc.schedule_id, p.practitioner_id, p.family_name, p.given_name,
                       loc.location_id, loc.name AS location_name
                FROM slot sl
                JOIN schedule sc ON sc.id = sl.schedule_id
                LEFT JOIN practitioner p ON p.id = sc.actor_practitioner_id
                LEFT JOIN location loc ON loc.id = sc.actor_location_id
                WHERE sl.org_id = :org_id
                  AND sl.status = 'free'
                  AND sl.start_time >= :start
                  AND sl.start_time <= :end
                  AND (:service_type IS NULL OR :service_type = ANY(sl.service_type_codes))
                  AND (:practitioner_id IS NULL OR p.practitioner_id = :practitioner_id)
                  AND (:location_id IS NULL OR loc.location_id = :location_id)
                ORDER BY sl.start_time
                LIMIT :count
            """),
            {
                "org_id": org_id,
                "start": start_dt,
                "end": end_dt,
                "service_type": service_type,
                "practitioner_id": int(practitioner.split("/")[1]) if practitioner else None,
                "location_id": int(location.split("/")[1]) if location else None,
                "count": _count,
            },
        )
        rows = result.fetchall()

    return {"slots": [dict(r) for r in rows]}
```

---

## Book Appointment (Patient-Side)

```python
@portal_router.post(
    "/portal/appointments",
    operation_id="patient_book_appointment",
    summary="Patient books an appointment from a free slot",
)
async def patient_book_appointment(
    body: PatientAppointmentBookSchema,
    request: Request,
):
    user = request.state.user
    patient_id = user["patient_id"]           # from portal JWT

    # Verify the slot is still free (race condition protection)
    slot = await slot_repo.get(body.slot_id, user["org_id"])
    if slot.status != "free":
        return JSONResponse({"error": "Slot is no longer available. Please choose another time."}, status_code=409)

    # Lock the slot (optimistic lock with version check)
    async with session_factory() as session:
        async with session.begin():
            locked = await session.execute(
                text("SELECT id FROM slot WHERE slot_id = :id AND status = 'free' FOR UPDATE"),
                {"id": body.slot_id},
            )
            if not locked.scalar():
                raise HTTPException(409, "Slot no longer available")

            # Book the appointment
            appt = await appointment_service.create({
                "status": "booked",
                "serviceType": slot.service_type,
                "reasonCode": body.reason_codes,
                "start": slot.start_time.isoformat(),
                "end": slot.end_time.isoformat(),
                "slot": [{"reference": f"Slot/{slot.slot_id}"}],
                "participant": [
                    {"actor": {"reference": f"Patient/{patient_id}"}, "status": "accepted"},
                    {"actor": {"reference": f"Practitioner/{slot.schedule.actor_practitioner_id}"}, "status": "needs-action"},
                ],
                "comment": body.patient_notes,
            }, user["sub"], user["org_id"], session=session)

            # Mark slot as busy
            await session.execute(
                text("UPDATE slot SET status = 'busy' WHERE id = :id"),
                {"id": slot.id},
            )

    # Send confirmations
    await self.notification_service.send_appointment_confirmation(appt, patient_id)
    return {"appointment_id": appt.appointment_id, "status": "booked", "start": appt.start.isoformat()}
```

---

## Appointment Reminders (Automated)

```python
@celery.task
async def send_appointment_reminders():
    """Run daily: send reminders for appointments 24h and 2h out."""
    tomorrow = datetime.utcnow() + timedelta(hours=24)
    in_two_hours = datetime.utcnow() + timedelta(hours=2)

    for window, label in [(tomorrow, "tomorrow"), (in_two_hours, "in 2 hours")]:
        appointments = await appointment_repo.get_upcoming(window, window + timedelta(minutes=30))
        for appt in appointments:
            if not appt.reminder_sent:
                await send_reminder(appt, label)
                await appointment_repo.mark_reminder_sent(appt.id)

async def send_reminder(appt, label: str):
    patient = appt.patient
    message = f"Reminder: You have an appointment {label} at {appt.start.strftime('%I:%M %p')} with {appt.practitioner_name}. Reply CANCEL to cancel."
    await sms_service.send(patient.phone, message)
    await email_service.send(patient.email, subject="Appointment Reminder", body=message)
    # Also create FHIR Communication for audit trail
    await communication_service.create({
        "status": "completed",
        "category": [{"coding": [{"code": "reminder"}]}],
        "subject": {"reference": f"Patient/{patient.patient_id}"},
        "payload": [{"contentString": message}],
        "sent": datetime.utcnow().isoformat() + "Z",
    })
```

---

## Patient Cancellation

```python
@portal_router.patch("/portal/appointments/{appointment_id}/cancel")
async def patient_cancel_appointment(
    appointment_id: int,
    reason: str = Body(...),
    request: Request = ...,
):
    user = request.state.user
    appt = await appointment_repo.get_by_portal_patient(appointment_id, user["patient_id"])

    # Enforce cancellation policy (e.g., must be 24h before)
    if appt.start < datetime.utcnow() + timedelta(hours=24):
        return JSONResponse({"error": "Appointments must be cancelled at least 24 hours in advance. Please call the office."}, status_code=422)

    await appointment_service.patch(appointment_id, {
        "status": "cancelled",
        "cancelationReason": {"coding": [{"code": "pat"}], "text": reason},
    }, user["sub"], user["org_id"])

    # Release the slot back to free
    if appt.slot:
        await slot_repo.set_status(appt.slot.slot_id, "free")

    # Notify provider
    await notification_service.send_cancellation_notice(appt)
    return {"status": "cancelled"}
```

---

## Estimated Effort

| Component | Days |
|---|---|
| `$find-available-slots` multi-provider search | 2 |
| `patient_book_appointment` with slot locking | 2 |
| Cancellation + slot release | 1 |
| Appointment reminder automation | 1 |
| No-show prediction integration (section 17) | 0.5 |
| **Total** | **6.5 days** |
