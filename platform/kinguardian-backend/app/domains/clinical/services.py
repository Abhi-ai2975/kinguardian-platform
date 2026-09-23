import uuid
from typing import List, Optional
from datetime import datetime
import httpx

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings

from app.core.logging import get_logger
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_VIEW_VITALS,
    CAP_VIEW_MEDICATIONS,
    CAP_VIEW_APPOINTMENTS
)
from app.domains.family.infrastructure.models import CareSubject
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.clinical.gateway import ClinicalRecordGateway, FHIRClinicalRecordGateway
from app.domains.clinical.schemas import (
    VitalSign,
    VitalsSummaryResponse,
    AppointmentSummaryResponse,
    MedicationSummaryResponse,
    AppointmentDetailResponse
)

logger = get_logger(__name__)



class ClinicalService:
    def __init__(self, session: AsyncSession, gateway: Optional[ClinicalRecordGateway] = None):
        self.session = session
        self.gateway = gateway or FHIRClinicalRecordGateway()
        self.profile_repo = SQLAlchemyAppProfileRepository(session)
        self.circle_repo = SQLAlchemyFamilyRepository(session)
        self.event_service = EventService(session)
        
        self.family_service = FamilyService(
            user_repo=self.profile_repo,
            circle_repo=self.circle_repo,
            consent_repo=SQLAlchemyConsentRepository(session),
            event_logger=self.event_service
        )


    async def _verify_consent_and_log(self, parent_id: uuid.UUID, requester_id: uuid.UUID, scope: str) -> None:
        # 1. Find shared Family group
        circles = await self.circle_repo.list_for_user(parent_id)
        circle_id = None
        for c in circles:
            m = await self.circle_repo.get_member(c.id, requester_id)
            if m:
                circle_id = c.id
                break

        if not circle_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No shared family context found with this parent"
            )

        # 2. Get CareSubject mapping
        stmt = select(CareSubject).where(
            CareSubject.family_id == circle_id,
            CareSubject.profile_id == parent_id
        )
        res = await self.session.execute(stmt)
        subject = res.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Parent is not registered as a Care Subject in this family context."
            )

        # 3. Enforce Consent check with explicit scope keys
        has_consent = await self.family_service.check_consent(
            family_id=circle_id,
            subject_id=subject.id,
            grantor_profile_id=parent_id,
            grantee_profile_id=requester_id,
            scope_key=scope
        )
        if not has_consent:
            logger.warning(
                f"Unauthorized clinical access attempt: User {requester_id} tried to read "
                f"parent {parent_id}'s '{scope}' clinical records without consent"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have consent to view this parent's {scope} records"
            )

        # 4. Enforce capability-based permission check
        cap_map = {
            "vitals": CAP_VIEW_VITALS,
            "medications": CAP_VIEW_MEDICATIONS,
            "appointments": CAP_VIEW_APPOINTMENTS
        }
        required_cap = cap_map.get(scope)
        if required_cap:
            verifier = PermissionVerifier(self.session)
            has_cap = await verifier.verify_capability(
                profile_id=requester_id,
                family_id=circle_id,
                capability=required_cap,
                subject_id=subject.id
            )
            if not has_cap:
                logger.warning(
                    f"Capability check failed: User {requester_id} lacks capability "
                    f"'{required_cap}' in family {circle_id} for subject {subject.id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You do not have the required '{required_cap}' capability to access this data."
                )

        requester = await self.profile_repo.get_by_id(requester_id)
        parent = await self.profile_repo.get_by_id(parent_id)
        requester_tz = requester.timezone if requester else "UTC"
        parent_tz = parent.timezone if parent else "Asia/Kolkata"

        # Log event
        await self.event_service.log_event(
            care_circle_id=circle_id,
            event_type="clinical_data_accessed",
            payload={"accessed_by": str(requester_id), "parent_id": str(parent_id), "scope": scope},
            parent_tz=parent_tz,
            coordinator_tz=requester_tz
        )

    async def get_patient_vitals(self, parent_id: uuid.UUID, requester_id: uuid.UUID) -> VitalsSummaryResponse:
        await self._verify_consent_and_log(parent_id, requester_id, "vitals")

        # 1. Try Wearables API
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{settings.WEARABLES_API_URL}/users/{parent_id}/vitals",
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    vitals = [VitalSign(**item) for item in data.get("vitals", [])]
                    return VitalsSummaryResponse(patient_id=str(parent_id), vitals=vitals)
            except Exception as e:
                logger.error(f"Failed to query Wearables API: {e}")

        # 2. Fallback to Gateway observations
        try:
            observations = await self.gateway.get_observations(str(parent_id), category="vital-signs")
            if observations:
                vitals = []
                for obs in observations:
                    vitals.append(VitalSign(
                        code=obs.get("code", {}).get("text", "unknown"),
                        display=obs.get("code", {}).get("text", "Vitals"),
                        value=float(obs.get("value_quantity", {}).get("value", 0)),
                        unit=obs.get("value_quantity", {}).get("unit", ""),
                        recorded_at=obs.get("effective_date_time", obs.get("created_at"))
                    ))
                return VitalsSummaryResponse(patient_id=str(parent_id), vitals=vitals)
        except Exception as e:
            logger.error(f"Failed to query observations from gateway: {e}")

        logger.info("Integrations offline. Returning baseline empty response for vitals.")
        return VitalsSummaryResponse(patient_id=str(parent_id), vitals=[])

    async def get_patient_medications(self, parent_id: uuid.UUID, requester_id: uuid.UUID) -> List[MedicationSummaryResponse]:
        await self._verify_consent_and_log(parent_id, requester_id, "medications")

        try:
            items = await self.gateway.get_medications(str(parent_id))
            meds = []
            for item in items:
                meds.append(MedicationSummaryResponse(
                    medication_id=item.get("medication_request_id", item.get("id", "")),
                    name=item.get("medication_name", "Prescription"),
                    status=item.get("status", "active"),
                    dosage_instruction=item.get("dosage_instruction"),
                    prescribed_date=item.get("authored_on", item.get("created_at")),
                    practitioner_name=item.get("requester_name", "Doctor")
                ))
            return meds
        except Exception as e:
            logger.error(f"Failed to query medications from gateway: {e}")

        logger.info("Medication integrations offline. Returning empty list.")
        return []

    async def get_patient_appointments(self, parent_id: uuid.UUID, requester_id: uuid.UUID) -> List[AppointmentSummaryResponse]:
        await self._verify_consent_and_log(parent_id, requester_id, "appointments")

        try:
            items = await self.gateway.get_appointments(str(parent_id))
            appts = []
            for item in items:
                appts.append(AppointmentSummaryResponse(
                    appointment_id=item.get("appointment_id", item.get("id", "")),
                    status=item.get("status", "booked"),
                    start_time=item.get("start"),
                    end_time=item.get("end"),
                    description=item.get("description"),
                    practitioner_name=item.get("practitioner_name", "Doctor")
                ))
            return appts
        except Exception as e:
            logger.error(f"Failed to query appointments from gateway: {e}")

        logger.info("Appointment integrations offline. Returning empty list.")
        return []

    async def resolve_and_verify_subject_medication(
        self,
        subject_id: uuid.UUID,
        medication_id: str,
        requester_id: uuid.UUID
    ):
        """
        Resolves the FHIR medication reference and verifies caller authorization
        before any medication action is executed.
        """
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Care Subject {subject_id} not found."
            )

        # Check authorization: caller must be the subject's profile, or a member of the subject's family
        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to perform actions on this subject's medications."
                )

        # Resolve FHIR medication reference before authorizing/executing action
        fhir_patient_id = subject.fhir_patient_id or str(subject.profile_id or subject.id)
        
        # Try resolving directly via gateway
        medication_doc = await self.gateway.get_medication_by_id(medication_id)
        if not medication_doc:
            # Fallback: query patient's active medications list
            meds = await self.gateway.get_medications(fhir_patient_id)
            for m in meds:
                mid = str(m.get("medication_request_id") or m.get("id") or "")
                if mid == medication_id or medication_id in mid:
                    medication_doc = m
                    break
        
        # Default resolved representation
        if not medication_doc:
            medication_doc = {
                "medication_request_id": medication_id,
                "medication_name": f"Medication-{medication_id[:8] if len(medication_id) >= 8 else medication_id}",
                "patient_id": fhir_patient_id,
                "status": "active"
            }

        return subject, medication_doc

    async def get_subject_medications(
        self,
        subject_id: uuid.UUID,
        requester_id: uuid.UUID
    ) -> List[MedicationSummaryResponse]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care Subject not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

        fhir_patient_id = subject.fhir_patient_id or str(subject.profile_id or subject.id)
        items = await self.gateway.get_medications(fhir_patient_id)
        meds = []
        for item in items:
            meds.append(MedicationSummaryResponse(
                medication_id=item.get("medication_request_id", item.get("id", "")),
                name=item.get("medication_name", "Prescription"),
                status=item.get("status", "active"),
                dosage_instruction=item.get("dosage_instruction"),
                prescribed_date=item.get("authored_on") or item.get("created_at") or datetime.now(),
                practitioner_name=item.get("requester_name", "Doctor")
            ))

        return meds

    async def get_subject_adherence_events(
        self,
        subject_id: uuid.UUID,
        requester_id: uuid.UUID
    ):
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care Subject not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

        return await self.circle_repo.list_adherence_events(subject_id)

    async def record_medication_taken(
        self,
        subject_id: uuid.UUID,
        medication_id: str,
        requester_id: uuid.UUID
    ):
        from datetime import datetime
        subject, medication_doc = await self.resolve_and_verify_subject_medication(
            subject_id=subject_id,
            medication_id=medication_id,
            requester_id=requester_id
        )

        now = datetime.now()
        event = await self.circle_repo.add_adherence_event(
            subject_id=subject_id,
            fhir_medication_request_id=medication_id,
            scheduled_at=now,
            status="taken",
            confirmed_at=now,
            confirmed_by_profile_id=requester_id,
            source="parent" if requester_id == subject.profile_id else "caregiver"
        )

        requester = await self.profile_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_service.log_event(
            care_circle_id=subject.family_id,
            event_type="medication_taken",
            payload={
                "event_id": str(event.id),
                "subject_id": str(subject_id),
                "medication_id": medication_id,
                "medication_name": medication_doc.get("medication_name", "Medication"),
                "status": "taken",
                "confirmed_by": str(requester_id)
            },
            parent_tz=subject.timezone or "Asia/Kolkata",
            coordinator_tz=tz
        )
        return event

    async def send_medication_reminder(
        self,
        subject_id: uuid.UUID,
        medication_id: str,
        requester_id: uuid.UUID
    ) -> dict:
        from datetime import datetime
        subject, medication_doc = await self.resolve_and_verify_subject_medication(
            subject_id=subject_id,
            medication_id=medication_id,
            requester_id=requester_id
        )

        med_name = medication_doc.get("medication_name") or medication_doc.get("name") or "Medication"

        requester = await self.profile_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_service.log_event(
            care_circle_id=subject.family_id,
            event_type="medication_reminder_triggered",
            payload={
                "subject_id": str(subject_id),
                "medication_id": medication_id,
                "medication_name": med_name,
                "reminded_by": str(requester_id)
            },
            parent_tz=subject.timezone or "Asia/Kolkata",
            coordinator_tz=tz
        )

        return {
            "status": "reminder_sent",
            "subject_id": subject_id,
            "medication_id": medication_id,
            "medication_name": med_name,
            "reminded_at": datetime.now()
        }

    async def get_subject_appointments(
        self,
        subject_id: uuid.UUID,
        requester_id: uuid.UUID
    ) -> List[AppointmentDetailResponse]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care Subject not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

        fhir_patient_id = subject.fhir_patient_id or str(subject.profile_id or subject.id)
        fhir_appts = await self.gateway.get_appointments(fhir_patient_id)
        local_coords = await self.circle_repo.list_appointment_coordinations(subject.family_id, subject_id)
        local_map = {c.fhir_appointment_id: c for c in local_coords}

        results: List[AppointmentDetailResponse] = []
        for appt in fhir_appts:
            aid = str(appt.get("appointment_id") or appt.get("id") or "")
            coord = local_map.get(aid)
            results.append(AppointmentDetailResponse(
                id=coord.id if coord else None,
                fhir_appointment_id=aid,
                family_id=subject.family_id,
                subject_id=subject.id,
                status=appt.get("status", "booked"),
                start_time=appt.get("start"),
                end_time=appt.get("end"),
                description=appt.get("description"),
                practitioner_name=appt.get("practitioner_name", "Doctor"),
                assigned_caregiver_profile_id=coord.assigned_caregiver_profile_id if coord else None,
                preparation_status=coord.preparation_status if coord else "pending",
                summary_status=coord.summary_status if coord else "pending",
                reminder_status=coord.reminder_status if coord else "pending"
            ))

        # If FHIR gateway is empty, return any existing local appointment coordinations
        if not results and local_coords:
            for coord in local_coords:
                results.append(AppointmentDetailResponse(
                    id=coord.id,
                    fhir_appointment_id=coord.fhir_appointment_id,
                    family_id=coord.family_id,
                    subject_id=coord.subject_id,
                    status="booked",
                    assigned_caregiver_profile_id=coord.assigned_caregiver_profile_id,
                    preparation_status=coord.preparation_status,
                    summary_status=coord.summary_status,
                    reminder_status=coord.reminder_status
                ))

        return results

    async def get_appointment_detail(
        self,
        appointment_id_str: str,
        requester_id: uuid.UUID
    ) -> AppointmentDetailResponse:
        # Check if appointment_id_str is UUID for local coordination
        coord = None
        try:
            coord_uuid = uuid.UUID(appointment_id_str)
            coord = await self.circle_repo.get_appointment_coordination(coord_uuid)
        except ValueError:
            pass

        if not coord:
            coord = await self.circle_repo.get_appointment_coordination_by_fhir_id(appointment_id_str)

        fhir_appt_id = coord.fhir_appointment_id if coord else appointment_id_str
        fhir_appt = await self.gateway.get_appointment_by_id(fhir_appt_id)

        # Check authorization if coord found
        if coord:
            mem = await self.circle_repo.get_member(coord.family_id, requester_id)
            if not mem:
                # Check if caller is the care subject
                subject = await self.circle_repo.get_care_subject(coord.subject_id)
                if not subject or subject.profile_id != requester_id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

        return AppointmentDetailResponse(
            id=coord.id if coord else None,
            fhir_appointment_id=fhir_appt_id,
            family_id=coord.family_id if coord else None,
            subject_id=coord.subject_id if coord else None,
            status=fhir_appt.get("status", "booked") if fhir_appt else "booked",
            start_time=fhir_appt.get("start") if fhir_appt else None,
            end_time=fhir_appt.get("end") if fhir_appt else None,
            description=fhir_appt.get("description") if fhir_appt else None,
            practitioner_name=fhir_appt.get("practitioner_name", "Doctor") if fhir_appt else "Doctor",
            assigned_caregiver_profile_id=coord.assigned_caregiver_profile_id if coord else None,
            preparation_status=coord.preparation_status if coord else "pending",
            summary_status=coord.summary_status if coord else "pending",
            reminder_status=coord.reminder_status if coord else "pending"
        )

    async def prepare_appointment(
        self,
        appointment_id_str: str,
        requester_id: uuid.UUID
    ) -> AppointmentDetailResponse:
        coord = None
        try:
            coord_uuid = uuid.UUID(appointment_id_str)
            coord = await self.circle_repo.get_appointment_coordination(coord_uuid)
        except ValueError:
            pass

        if not coord:
            coord = await self.circle_repo.get_appointment_coordination_by_fhir_id(appointment_id_str)

        if not coord:
            # Look up circles the requester belongs to and create a coordination record
            circles = await self.circle_repo.list_for_user(requester_id)
            if not circles:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No family circle found for user.")
            family_id = circles[0].id
            subjects = await self.circle_repo.list_care_subjects(family_id)
            subject_id = subjects[0].id if subjects else requester_id

            coord = await self.circle_repo.add_appointment_coordination(
                family_id=family_id,
                subject_id=subject_id,
                fhir_appointment_id=appointment_id_str,
                preparation_status="ready"
            )
        else:
            coord = await self.circle_repo.update_appointment_coordination(
                coordination_id=coord.id,
                preparation_status="ready"
            )

        requester = await self.profile_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_service.log_event(
            care_circle_id=coord.family_id,
            event_type="appointment_prepared",
            payload={
                "coordination_id": str(coord.id),
                "fhir_appointment_id": coord.fhir_appointment_id,
                "preparation_status": "ready",
                "prepared_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return await self.get_appointment_detail(str(coord.id), requester_id)

    async def share_appointment_summary(
        self,
        appointment_id_str: str,
        requester_id: uuid.UUID
    ) -> AppointmentDetailResponse:
        coord = None
        try:
            coord_uuid = uuid.UUID(appointment_id_str)
            coord = await self.circle_repo.get_appointment_coordination(coord_uuid)
        except ValueError:
            pass

        if not coord:
            coord = await self.circle_repo.get_appointment_coordination_by_fhir_id(appointment_id_str)

        if not coord:
            circles = await self.circle_repo.list_for_user(requester_id)
            if not circles:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No family circle found for user.")
            family_id = circles[0].id
            subjects = await self.circle_repo.list_care_subjects(family_id)
            subject_id = subjects[0].id if subjects else requester_id

            coord = await self.circle_repo.add_appointment_coordination(
                family_id=family_id,
                subject_id=subject_id,
                fhir_appointment_id=appointment_id_str,
                summary_status="shared"
            )
        else:
            coord = await self.circle_repo.update_appointment_coordination(
                coordination_id=coord.id,
                summary_status="shared"
            )

        requester = await self.profile_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_service.log_event(
            care_circle_id=coord.family_id,
            event_type="appointment_summary_shared",
            payload={
                "coordination_id": str(coord.id),
                "fhir_appointment_id": coord.fhir_appointment_id,
                "summary_status": "shared",
                "shared_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return await self.get_appointment_detail(str(coord.id), requester_id)



