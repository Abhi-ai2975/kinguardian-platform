# Asynchronous Virtual Care — E-Visits, Store-and-Forward, Questionnaires

**FHIR Resources:** `QuestionnaireResponse`, `DocumentReference`, `Task`, `Communication`  
**Billing:** CPT 99421-99423 (e-visits online digital evaluation), G2010 (store-and-forward)

---

## Async Virtual Care Modes

| Mode | Description | Turnaround | Best For |
|---|---|---|---|
| **E-Visit** | Patient fills out structured questionnaire; provider reviews async | 24–72 hrs | Routine follow-ups, chronic disease management |
| **Store-and-Forward** | Patient uploads photos/videos; specialist reviews later | 24–48 hrs | Dermatology, ophthalmology, wound care |
| **Secure Messaging** | Back-and-forth text Q&A (existing section 15-03) | Hours–days | Medication questions, admin issues |
| **eConsult** | PCP submits case to specialist; specialist replies async | 24–72 hrs | Specialist opinion without referral |

---

## E-Visit Questionnaire Flow

```
Patient opens portal
  → Selects reason for e-visit (symptom type)
  → System loads matching Questionnaire (e.g., "cold-and-flu", "diabetes-checkup")
  → Patient fills in QuestionnaireResponse
  → Provider reviews + responds via Communication

If urgent symptoms detected → flag for immediate callback
```

---

## E-Visit Questionnaire Definitions

```json
POST /Questionnaire
{
  "resourceType": "Questionnaire",
  "status": "active",
  "title": "Cold & Flu E-Visit",
  "code": [{ "system": "http://snomed.info/sct", "code": "444971000124105", "display": "E-visit" }],
  "item": [
    {
      "linkId": "1",
      "text": "What are your main symptoms?",
      "type": "choice",
      "repeats": true,
      "answerOption": [
        { "valueCoding": { "code": "S001", "display": "Fever" } },
        { "valueCoding": { "code": "S002", "display": "Cough" } },
        { "valueCoding": { "code": "S003", "display": "Sore throat" } },
        { "valueCoding": { "code": "S004", "display": "Body aches" } },
        { "valueCoding": { "code": "S005", "display": "Shortness of breath" } }
      ]
    },
    {
      "linkId": "2",
      "text": "How long have you had these symptoms?",
      "type": "choice",
      "answerOption": [
        { "valueCoding": { "code": "D1", "display": "Less than 24 hours" } },
        { "valueCoding": { "code": "D2", "display": "1–3 days" } },
        { "valueCoding": { "code": "D3", "display": "4–7 days" } },
        { "valueCoding": { "code": "D4", "display": "More than a week" } }
      ]
    },
    {
      "linkId": "3",
      "text": "Current temperature (if measured)?",
      "type": "decimal",
      "extension": [{
        "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unit",
        "valueCoding": { "code": "degF", "system": "http://unitsofmeasure.org" }
      }]
    },
    {
      "linkId": "4",
      "text": "Any difficulty breathing?",
      "type": "boolean"
    },
    {
      "linkId": "99-escalate",
      "text": "ESCALATION_FLAG",
      "type": "boolean",
      "readOnly": true,
      "_initial": [{ "valueBoolean": false }]
    }
  ]
}
```

---

## E-Visit Submission Service

```python
# app/services/telehealth/evisit_service.py

class EVisitService:
    URGENT_SYMPTOM_CODES = {"S005"}  # shortness of breath
    URGENT_TEMP_THRESHOLD_F = 103.5

    async def submit_evisit(
        self,
        questionnaire_response: QuestionnaireResponse,
        patient: Patient,
        org_id: str,
    ) -> dict:
        """
        Process submitted e-visit questionnaire.
        Flags urgent responses, assigns to provider queue.
        """
        is_urgent = self._check_urgency(questionnaire_response)

        if is_urgent:
            # Route to same-day callback, not async queue
            await self._escalate_to_urgent(questionnaire_response, patient, org_id)
            return {"status": "escalated", "message": "A provider will call you within 2 hours."}

        # Create a Task for provider to review
        task = await self.task_service.create({
            "status": "requested",
            "intent": "order",
            "priority": "routine",
            "code": {"coding": [{"code": "e-visit-review"}]},
            "description": f"E-visit: {questionnaire_response.questionnaire_title} for {patient.given_name} {patient.family_name}",
            "for": {"reference": f"Patient/{patient.patient_id}"},
            "focus": {"reference": f"QuestionnaireResponse/{questionnaire_response.questionnaire_response_id}"},
            "restriction": {
                "period": {
                    "end": (datetime.utcnow() + timedelta(hours=72)).isoformat() + "Z"
                }
            },
        }, org_id=org_id)

        # Notify patient of receipt
        await self._notify_patient_received(patient, task.task_id)

        return {
            "status": "received",
            "task_id": task.task_id,
            "expected_response_by": (datetime.utcnow() + timedelta(hours=72)).isoformat(),
        }

    def _check_urgency(self, qr: QuestionnaireResponse) -> bool:
        for item in qr.item or []:
            if item.link_id == "4" and item.answer_boolean is True:
                return True  # difficulty breathing
            if item.link_id == "1":
                for answer in item.answers or []:
                    if answer.get("valueCoding", {}).get("code") in self.URGENT_SYMPTOM_CODES:
                        return True
            if item.link_id == "3" and item.answer_decimal:
                if float(item.answer_decimal) >= self.URGENT_TEMP_THRESHOLD_F:
                    return True
        return False

    async def respond_to_evisit(
        self,
        task_id: int,
        provider_response: str,
        plan_items: list[str],
        prescriptions: list[dict] | None,
        org_id: str,
        provider_id: int,
    ) -> dict:
        """Provider responds to e-visit; creates Communication and optional orders."""
        task = await self.task_repo.get(task_id, org_id)

        # Create Communication (the provider's response)
        communication = await self.communication_service.create({
            "status": "completed",
            "category": [{"coding": [{"code": "notification"}]}],
            "subject": task.for_reference,
            "sender": {"reference": f"Practitioner/{provider_id}"},
            "payload": [{"contentString": provider_response}],
            "basedOn": [{"reference": f"Task/{task.task_id}"}],
        }, org_id=org_id)

        # Mark Task complete
        await self.task_repo.patch(task_id, {"status": "completed"})

        # Create prescriptions if needed
        created_rx = []
        for rx in (prescriptions or []):
            med_request = await self.medication_request_service.create(rx, org_id=org_id)
            created_rx.append(med_request.medication_request_id)

        # Bill: create Encounter (type=e-visit) + ChargeItem
        encounter = await self._create_evisit_encounter(task, provider_id, org_id)
        await self._capture_evisit_charge(encounter, org_id)

        return {
            "communication_id": communication.communication_id,
            "prescription_ids": created_rx,
            "encounter_id": encounter.encounter_id,
        }

    async def _capture_evisit_charge(self, encounter, org_id: str):
        """CPT 99421-99423 based on provider time spent."""
        # Simplified: use 99422 (intermediate complexity, 6-12 min)
        await self.charge_item_service.create({
            "status": "billable",
            "code": {"coding": [{"system": "http://www.ama-assn.org/go/cpt", "code": "99422"}]},
            "subject": encounter.patient_reference,
            "context": {"reference": f"Encounter/{encounter.encounter_id}"},
        }, org_id=org_id)
```

---

## Store-and-Forward: Photo Submissions

```python
@telehealth_router.post(
    "/telehealth/store-forward",
    operation_id="submit_store_forward",
    summary="Patient submits photos for async specialist review",
)
async def submit_store_forward(
    request: Request,
    images: list[UploadFile] = File(...),
    chief_complaint: str = Form(...),
    specialty: str = Form(..., description="dermatology|ophthalmology|wound-care"),
):
    user = request.state.user
    patient_id = user["patient_id"]

    document_refs = []
    for img in images:
        content = await img.read()
        if len(content) > 10 * 1024 * 1024:   # 10 MB limit
            raise ValueError(f"Image {img.filename} exceeds 10MB limit")

        # Store image in secure object storage (S3 or Azure Blob)
        storage_url = await secure_storage_service.upload(
            content=content,
            content_type=img.content_type,
            path=f"patient-uploads/{patient_id}/{uuid4()}/{img.filename}",
        )

        # Create DocumentReference per image
        doc_ref = await document_reference_service.create({
            "status": "current",
            "type": {"coding": [{"system": "http://loinc.org", "code": "72170-4", "display": "Photographic image"}]},
            "category": [{"coding": [{"code": "store-forward"}]}],
            "subject": {"reference": f"Patient/{patient_id}"},
            "content": [{
                "attachment": {
                    "contentType": img.content_type,
                    "url": storage_url,
                    "title": img.filename,
                    "creation": datetime.utcnow().isoformat() + "Z",
                }
            }],
            "context": {
                "event": [{"coding": [{"code": chief_complaint}]}],
            },
        }, user["sub"], user["activeOrganizationId"])
        document_refs.append(doc_ref)

    # Create Task for specialist to review
    task = await task_service.create({
        "status": "requested",
        "intent": "order",
        "priority": "routine",
        "code": {"coding": [{"code": "store-forward-review"}]},
        "description": f"Store-and-forward {specialty} consult: {chief_complaint}",
        "for": {"reference": f"Patient/{patient_id}"},
        "input": [{"type": {"coding": [{"code": "document"}]},
                   "valueReference": {"reference": f"DocumentReference/{d.document_reference_id}"}}
                  for d in document_refs],
        "restriction": {"period": {"end": (datetime.utcnow() + timedelta(hours=48)).isoformat() + "Z"}},
    }, user["sub"], user["activeOrganizationId"])

    return {
        "status": "submitted",
        "task_id": task.task_id,
        "document_count": len(document_refs),
        "expected_response_by": (datetime.utcnow() + timedelta(hours=48)).isoformat(),
    }
```

---

## eConsult (PCP → Specialist)

```python
@telehealth_router.post(
    "/telehealth/econsult",
    operation_id="create_econsult",
    summary="Submit a case for specialist opinion without direct patient referral",
)
async def create_econsult(body: EConsultSchema, request: Request):
    """
    PCP submits clinical summary + question to a specialist.
    Specialist responds async; no referral needed; billed under consulting provider.
    """
    user = request.state.user

    # Create ServiceRequest (type=econsult)
    service_request = await service_request_service.create({
        "status": "active",
        "intent": "proposal",
        "category": [{"coding": [{"code": "econsult"}]}],
        "code": {"coding": [{"code": body.specialty_code}]},
        "subject": {"reference": f"Patient/{body.patient_id}"},
        "requester": {"reference": f"Practitioner/{user['sub']}"},
        "performer": [{"reference": f"PractitionerRole/{body.specialist_role_id}"}],
        "reasonCode": [{"text": body.clinical_question}],
        "note": [{"text": body.clinical_summary}],
    }, user["sub"], user["activeOrganizationId"])

    # Notify specialist
    await notification_service.send_econsult_request(
        specialist_role_id=body.specialist_role_id,
        service_request_id=service_request.service_request_id,
        clinical_question=body.clinical_question,
    )

    return {"service_request_id": service_request.service_request_id}
```

---

## Async Visit Workflow State

```
QuestionnaireResponse (submitted)
    ↓
Task (status=requested) — appears in provider worklist
    ↓
Provider reviews → Task (status=in-progress)
    ↓
Provider responds → Communication created
                  → Task (status=completed)
                  → Encounter (type=e-visit) created for billing
                  → MedicationRequest created (if Rx needed)
                  → Patient notified
```

---

## Billing Summary

| CPT | Description | When to Bill |
|---|---|---|
| 99421 | Online digital E&M, 5–10 min | Simple inquiry, quick response |
| 99422 | Online digital E&M, 11–20 min | Typical e-visit |
| 99423 | Online digital E&M, > 21 min | Complex chronic disease management |
| G2010 | Store-and-forward | Dermatology, wound, ophthalmology image review |
| 99446–99452 | Interprofessional telephone consult | eConsult verbal discussion |

---

## Estimated Effort

| Component | Days |
|---|---|
| E-visit Questionnaire loader + UI | 2 |
| `EVisitService` urgency detection + task routing | 2 |
| Provider e-visit worklist + response API | 2 |
| Store-and-forward image upload + DocumentReference | 2 |
| eConsult ServiceRequest flow | 1.5 |
| E-visit billing (Encounter + ChargeItem) | 1 |
| Patient notification on response | 0.5 |
| **Total** | **11 days** |
