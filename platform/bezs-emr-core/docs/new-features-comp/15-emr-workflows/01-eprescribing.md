# Electronic Prescribing (ePrescribing) — NCPDP SCRIPT + Surescripts

**Standards:** NCPDP SCRIPT 2017071, FHIR R4 MedicationRequest  
**Network:** Surescripts (US national ePrescribing network)

---

## What Is ePrescribing?

ePrescribing is the electronic transmission of a prescription from a prescriber's system to a pharmacy — replacing hand-written or faxed prescriptions. In the US, ePrescribing is **mandatory** for most controlled substances in many states and is required for CMS Meaningful Use compliance.

### The Flow

```
Clinician creates MedicationRequest
         ↓
CPOE validates (drug-drug interactions, allergies)
         ↓
MedicationRequest status: "active"
         ↓
ePrescribing engine converts to NCPDP SCRIPT NewRx message
         ↓
Surescripts network routes to patient's preferred pharmacy
         ↓
Pharmacy returns RxFill or RxChangeRequest
         ↓
MedicationRequest updated with dispense status
```

---

## FHIR Resources Involved

| Resource | Role |
|---|---|
| `MedicationRequest` | The prescription itself |
| `Medication` | Drug details (if not in MedicationRequest.medicationCodeableConcept) |
| `Patient` | Prescriber needs patient demographics for pharmacy |
| `Practitioner` | Prescriber NPI for Surescripts |
| `Coverage` | Insurance for pharmacy benefit check |
| `MedicationDispense` | Created when pharmacy fills the prescription |
| `Task` | Tracks the ePrescribing workflow state |

---

## NCPDP SCRIPT Message Types

| Message | Direction | Purpose |
|---|---|---|
| `NewRx` | EMR → Pharmacy | New prescription |
| `CancelRx` | EMR → Pharmacy | Cancel an existing prescription |
| `RxChangeRequest` | Pharmacy → EMR | Pharmacy requests a change (generic substitution, clarification) |
| `RxChangeResponse` | EMR → Pharmacy | Approve or deny change request |
| `RxRenewalRequest` | Pharmacy → EMR | Patient requests a refill |
| `RxRenewalResponse` | EMR → Pharmacy | Approve/deny refill request |
| `RxFill` | Pharmacy → EMR | Prescription was filled |
| `RxFillIndicator` | Pharmacy → EMR | Partial fill notification |

---

## MedicationRequest → NCPDP Mapping

```python
# app/services/eprescribing_service.py

class EPrescribingService:
    """Converts MedicationRequest to NCPDP SCRIPT NewRx and sends via Surescripts API."""

    async def send_new_rx(
        self,
        medication_request_id: int,
        pharmacy_ncpdp_id: str,
        user_id: str,
        org_id: str,
    ) -> dict:
        rx = await self.med_request_repo.get(medication_request_id, user_id, org_id)
        patient = rx.patient
        practitioner = rx.requester  # resolved via relationship

        ncpdp_message = {
            "MessageRequestCode": "NewRx",
            "RelatesToMessageID": str(uuid.uuid4()),
            "SentTime": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
            "Patient": {
                "Name": {"LastName": patient.family_name, "FirstName": patient.given_name},
                "DateOfBirth": {"Date": patient.birth_date.strftime("%Y%m%d") if patient.birth_date else ""},
                "Gender": {"Code": "M" if patient.gender == "male" else "F"},
                "Address": {"AddressLine1": patient.address_line if patient.address_line else ""},
            },
            "Prescriber": {
                "NPI": practitioner.npi_number,
                "Name": {"LastName": practitioner.family_name, "FirstName": practitioner.given_name},
                "DEANumber": practitioner.dea_number,
            },
            "MedicationPrescribed": {
                "DrugDescription": rx.medication_code_text or "",
                "DrugCoded": {
                    "ProductCode": {"Code": self._extract_rxnorm(rx.medication_code), "Qualifier": "ND"},
                },
                "Quantity": {"Value": str(rx.dose_quantity_value or ""), "CodeListQualifier": "38", "UnitSourceCode": "9"},
                "DaysSupply": str(rx.days_supply or 30),
                "Sig": {"SigText": rx.dosage_instruction_text or ""},
                "NumberOfRefills": str(rx.number_of_repeats_allowed or 0),
                "SubstitutionPermitted": "0" if rx.substitution_code == "N" else "1",
            },
            "Pharmacy": {"NCPDPID": pharmacy_ncpdp_id},
        }

        # Send via Surescripts API
        result = await self._send_to_surescripts(ncpdp_message)

        # Update MedicationRequest status
        await self.med_request_repo.patch(
            medication_request_id,
            {"status": "active", "status_reason": [{"coding": [{"code": "sent-to-pharmacy"}]}]},
            user_id, org_id,
        )

        # Create Task to track workflow
        await self.task_service.create({
            "status": "in-progress",
            "code": {"coding": [{"code": "eprescribing-sent"}]},
            "focus": {"reference": f"MedicationRequest/{rx.medication_request_id}"},
            "description": f"Prescription sent to pharmacy {pharmacy_ncpdp_id}",
        }, user_id, org_id)

        return result
```

---

## Controlled Substance ePrescribing (EPCS)

Prescribing controlled substances (Schedule II-V) electronically requires:

1. **DEA-compliant 2-factor authentication** — prescriber must use hardware token or biometric + PIN
2. **Digital signature** — prescription must be signed with prescriber's private key
3. **Audit log** — every EPCS transaction logged to `AuditEvent`
4. **State PMP query** — check Prescription Monitoring Program before prescribing opioids

```python
class EPCSService:
    async def sign_controlled_rx(
        self,
        medication_request_id: int,
        prescriber_id: int,
        auth_token: str,  # 2FA token from hardware key
    ) -> dict:
        # Verify 2FA token
        if not await self.auth_service.verify_epcs_token(prescriber_id, auth_token):
            raise PermissionError("EPCS: 2FA verification failed")

        # Query state PMP
        pmp_result = await self.pmp_service.query(patient_id, state="CA")
        if pmp_result.has_concerning_patterns:
            # Create clinical note about PMP result
            await self.create_pmp_note(patient_id, pmp_result)

        # Sign the prescription
        signed_rx = await self.sign_rx(medication_request_id, prescriber_id)

        # Log to AuditEvent
        await self.audit_service.log_epcs(prescriber_id, medication_request_id, auth_method="hardware-token")

        return signed_rx
```

---

## Pharmacy Search API

The EMR needs to let clinicians search for the patient's preferred pharmacy:

```python
GET /fhir/$pharmacy-search?name=CVS&zip=94105&ncpdp_specialty=retail

# Response (uses Surescripts directory API):
{
  "resourceType": "Bundle",
  "type": "searchset",
  "entry": [{
    "resource": {
      "resourceType": "Organization",
      "identifier": [{ "system": "http://ncpdp.org/provider-id", "value": "1234567" }],
      "name": "CVS Pharmacy #1234",
      "telecom": [{ "system": "phone", "value": "415-555-0100" }],
      "address": [{ "line": ["123 Market St"], "city": "San Francisco", "state": "CA", "postalCode": "94105" }]
    }
  }]
}
```

---

## Renewal Request Handling

When a pharmacy sends an `RxRenewalRequest`:

```python
@surescripts_webhook.post("/renewal-request")
async def handle_renewal_request(body: dict):
    """Pharmacy requests a refill on behalf of a patient."""
    # Find original MedicationRequest
    original_rx_id = body["RelatesToMessageID"]
    original_rx = await find_by_surescripts_id(original_rx_id)

    # Create a Task for the prescriber to review
    task = await task_service.create({
        "status": "requested",
        "intent": "order",
        "code": {"coding": [{"code": "rx-renewal-request"}]},
        "focus": {"reference": f"MedicationRequest/{original_rx.medication_request_id}"},
        "for": {"reference": f"Patient/{original_rx.patient.patient_id}"},
        "owner": {"reference": f"Practitioner/{original_rx.requester.practitioner_id}"},
        "description": f"Renewal request from {body['Pharmacy']['StoreName']}",
        "authoredOn": datetime.utcnow().isoformat() + "Z",
    })

    # Trigger Subscription notification to prescriber's inbox
    await subscription_matcher.notify("Task", task.task_id)
```

---

## ePrescribing Implementation Phases

| Phase | Component | Effort |
|---|---|---|
| 1 | MedicationRequest → NCPDP mapping | 3 days |
| 2 | Surescripts sandbox integration | 2 days |
| 3 | Pharmacy directory search | 1 day |
| 4 | Renewal request handling | 2 days |
| 5 | EPCS controlled substance support | 3 days |
| 6 | State PMP integration | 2 days |
| 7 | Production Surescripts certification | 5 days |
| **Total** | | **18 days** |

Note: Surescripts production access requires a formal certification process and signed agreements.
