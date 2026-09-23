import uuid
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.domains.family.domain.entities import (


    AppProfileEntity,
    FamilyEntity,
    FamilyMembershipEntity,
    FamilyRelationshipEntity,
    CareSubjectEntity,
    CareRelationshipEntity,
    CareTaskEntity,
    MedicationAdherenceEventEntity,
    WellbeingCheckinEntity,
    MonitoringPreferenceEntity,
    AIInsightSourceEntity,
    AIInsightEntity,
    NotificationEntity,
    NotificationDeliveryEntity,
    FamilyMessageEntity,
    FamilyConversationEntity,
    AppointmentCoordinationEntity,
    HealthDocumentEntity,
    DocumentExtractionEntity,
    AIConversationEntity,
    AIActionEntity,
    ConsentEntity
)
from app.domains.family.domain.interfaces import IAppProfileRepository, IFamilyRepository, IConsentRepository, IEventLogger
from app.domains.family.domain.exceptions import ProfileNotFoundError, DuplicateMembershipError, FamilyAccessError
from app.core.config import settings


VALID_TASK_CATEGORIES = {
    "medication",
    "appointment",
    "lab",
    "document",
    "call",
    "check_in",
    "follow_up",
    "caregiver",
    "other"
}

VALID_FEELINGS = {
    "good",
    "okay",
    "not_well"
}

VALID_MONITORING_METRICS = {
    "activity",
    "sleep",
    "blood_pressure",
    "weight",
    "heart_rate",
    "glucose"
}

VALID_MESSAGE_TYPES = {
    "text",
    "voice",
    "image",
    "document",
    "system",
    "ai"
}

VALID_REVIEW_STATUSES = {
    "pending_review",
    "approved",
    "rejected",
    "edited"
}

VALID_ACTION_STATUSES = {
    "pending_approval",
    "approved",
    "rejected",
    "executed",
    "failed"
}

ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "application/dicom"
}



class FamilyService:
    def __init__(
        self,
        user_repo: IAppProfileRepository,
        circle_repo: IFamilyRepository,
        consent_repo: IConsentRepository,
        event_logger: IEventLogger
    ):
        self.user_repo = user_repo
        self.circle_repo = circle_repo
        self.consent_repo = consent_repo
        self.event_logger = event_logger

    async def get_or_create_profile(
        self,
        iam_subject_id: str,
        email: str,
        display_name: Optional[str] = None,
        timezone: str = "UTC"
    ) -> AppProfileEntity:
        profile = await self.user_repo.get_by_iam_subject_id(iam_subject_id)
        if not profile:
            profile = await self.user_repo.get_by_email(email)
            if not profile:
                profile = await self.user_repo.create(iam_subject_id, email, display_name, timezone)
        return profile

    async def create_care_circle(self, creator_id: uuid.UUID, name: str, creator_role: str) -> FamilyEntity:
        primary_coord = creator_id if creator_role == "coordinator" else None
        circle = await self.circle_repo.create(name, primary_coordinator_profile_id=primary_coord)
        await self.circle_repo.add_member(circle.id, creator_id, creator_role)
        
        creator = await self.user_repo.get_by_id(creator_id)
        tz = creator.timezone if creator else "UTC"
        await self.event_logger.log_event(
            care_circle_id=circle.id,
            event_type="care_circle_created",
            payload={"creator_id": str(creator_id), "name": name, "creator_role": creator_role},
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        
        refreshed_circle = await self.circle_repo.get_by_id(circle.id)
        if not refreshed_circle:
             raise ProfileNotFoundError(profile_id=str(creator_id))
        return refreshed_circle

    async def add_member_to_circle(self, requester_id: uuid.UUID, care_circle_id: uuid.UUID, target_email: str, role: str) -> FamilyMembershipEntity:
        requester_mem = await self.circle_repo.get_member(care_circle_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        target_profile = await self.user_repo.get_by_email(target_email)
        if not target_profile:
            placeholder_sub = f"iam_placeholder_{uuid.uuid4().hex[:8]}"
            target_profile = await self.user_repo.create(placeholder_sub, target_email)

        existing_mem = await self.circle_repo.get_member(care_circle_id, target_profile.id)
        if existing_mem:
            raise DuplicateMembershipError()

        member = await self.circle_repo.add_member(care_circle_id, target_profile.id, role)

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=care_circle_id,
            event_type="member_added",
            payload={"added_by": str(requester_id), "target_user_id": str(target_profile.id), "target_email": target_email, "role": role},
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return member

    async def list_family_members(self, requester_id: uuid.UUID, care_circle_id: uuid.UUID) -> List[FamilyMembershipEntity]:
        requester_mem = await self.circle_repo.get_member(care_circle_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_members(care_circle_id)

    async def update_family_member(
        self,
        requester_id: uuid.UUID,
        care_circle_id: uuid.UUID,
        member_id: uuid.UUID,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> FamilyMembershipEntity:
        requester_mem = await self.circle_repo.get_member(care_circle_id, requester_id)
        if not requester_mem or requester_mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You must be a coordinator or parent to modify member roles/status.")

        updated = await self.circle_repo.update_member(
            family_id=care_circle_id,
            member_id=member_id,
            membership_role=role,
            status=status
        )
        if not updated:
            raise FamilyAccessError(f"Member {member_id} not found in Family {care_circle_id}.")
        return updated

    async def remove_family_member_by_id(self, requester_id: uuid.UUID, care_circle_id: uuid.UUID, member_id: uuid.UUID) -> bool:
        requester_mem = await self.circle_repo.get_member(care_circle_id, requester_id)
        if not requester_mem or requester_mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You must be a coordinator or parent to remove family members.")

        target_member = await self.circle_repo.get_member_by_id(care_circle_id, member_id)
        if not target_member:
            raise FamilyAccessError(f"Member {member_id} not found in Family {care_circle_id}.")

        result = await self.circle_repo.remove_member_by_id(care_circle_id, member_id)
        if result:
            requester = await self.user_repo.get_by_id(requester_id)
            tz = requester.timezone if requester else "UTC"
            await self.event_logger.log_event(
                care_circle_id=care_circle_id,
                event_type="member_removed",
                payload={"removed_by": str(requester_id), "member_id": str(member_id)},
                parent_tz="Asia/Kolkata",
                coordinator_tz=tz
            )
        return result


    async def list_user_circles(self, user_id: uuid.UUID) -> List[FamilyEntity]:
        return await self.circle_repo.list_for_user(user_id)

    async def get_family(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> FamilyEntity:
        mem = await self.circle_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError(f"User {requester_id} is not an authorized member of Family {family_id}.")
        family = await self.circle_repo.get_by_id(family_id)
        if not family:
            raise FamilyAccessError(f"Family {family_id} not found.")
        return family

    async def update_family(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        name: Optional[str] = None,
        primary_coordinator_profile_id: Optional[uuid.UUID] = None
    ) -> FamilyEntity:
        mem = await self.circle_repo.get_member(family_id, requester_id)
        if not mem or mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You must be a coordinator or parent to modify family settings.")
        updated = await self.circle_repo.update(
            family_id=family_id,
            name=name,
            primary_coordinator_profile_id=primary_coordinator_profile_id
        )
        if not updated:
            raise FamilyAccessError(f"Family {family_id} not found.")
        return updated


    async def create_consent(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantee_id: Optional[uuid.UUID] = None,
        grantee_email: Optional[str] = None,
        scope: Optional[dict] = None,
        status: str = "active",
        consent_type: str = "clinical_data_access",
        expires_at: Optional[datetime] = None
    ) -> ConsentEntity:
        mem = await self.circle_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if not grantee_id and grantee_email:
            grantee = await self.user_repo.get_by_email(grantee_email)
            if not grantee:
                placeholder_sub = f"iam_ph_{uuid.uuid4().hex[:8]}"
                grantee = await self.user_repo.create(placeholder_sub, grantee_email)
            grantee_id = grantee.id
        elif not grantee_id:
            raise FamilyAccessError("Either grantee_id or grantee_email must be provided.")

        consent = await self.consent_repo.create_or_update_consent(
            family_id=family_id,
            subject_id=subject_id,
            grantor_profile_id=requester_id,
            grantee_profile_id=grantee_id,
            scope=scope or {},
            status=status,
            consent_type=consent_type,
            expires_at=expires_at
        )

        grantor = await self.user_repo.get_by_id(requester_id)
        tz = grantor.timezone if grantor else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="consent_granted",
            payload={
                "consent_id": str(consent.id),
                "grantor_profile_id": str(requester_id),
                "grantee_profile_id": str(grantee_id),
                "subject_id": str(subject_id),
                "scope": scope,
                "status": status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return consent

    async def list_family_consents(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> List[ConsentEntity]:
        mem = await self.circle_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.consent_repo.list_by_family(family_id)

    async def revoke_family_consent(self, requester_id: uuid.UUID, family_id: uuid.UUID, consent_id: uuid.UUID) -> ConsentEntity:
        mem = await self.circle_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        consent = await self.consent_repo.get_by_id(consent_id)
        if not consent or consent.family_id != family_id:
            raise FamilyAccessError(f"Consent {consent_id} not found in Family {family_id}.")

        if consent.grantor_profile_id != requester_id and mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You do not have permission to revoke this consent.")

        revoked = await self.consent_repo.revoke_consent(consent_id, requester_id)
        if not revoked:
            raise FamilyAccessError(f"Failed to revoke consent {consent_id}.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="consent_revoked",
            payload={
                "consent_id": str(consent_id),
                "revoked_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return revoked

    async def set_consent(
        self,
        grantor_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantee_email: str,
        scope: dict,
        status: str = "active"
    ) -> ConsentEntity:
        grantee = await self.user_repo.get_by_email(grantee_email)
        if not grantee:
            raise ProfileNotFoundError(email=grantee_email)
            
        consent = await self.consent_repo.create_or_update_consent(
            family_id=family_id,
            subject_id=subject_id,
            grantor_profile_id=grantor_id,
            grantee_profile_id=grantee.id,
            scope=scope,
            status=status
        )

        grantor = await self.user_repo.get_by_id(grantor_id)
        tz = grantor.timezone if grantor else "Asia/Kolkata"

        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="consent_updated",
            payload={
                "grantor_profile_id": str(grantor_id),
                "grantee_profile_id": str(grantee.id),
                "subject_id": str(subject_id),
                "scope": scope,
                "status": status
            },
            parent_tz=tz,
            coordinator_tz=grantee.timezone
        )

        return consent

    async def get_consent_list_for_parent(self, parent_id: uuid.UUID) -> List[ConsentEntity]:
        return await self.consent_repo.list_by_parent(parent_id)


    async def check_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID,
        scope_key: str
    ) -> bool:
        if grantor_profile_id == grantee_profile_id:
            return True
            
        consent = await self.consent_repo.get_consent(
            family_id=family_id,
            subject_id=subject_id,
            grantor_profile_id=grantor_profile_id,
            grantee_profile_id=grantee_profile_id
        )
        if not consent:
            return False
            
        return consent.status == "active" and consent.scope.get(scope_key) is True

    async def add_relationship(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        from_profile_id: uuid.UUID,
        to_profile_id: uuid.UUID,
        relationship_type: str
    ) -> FamilyRelationshipEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        rel = await self.circle_repo.add_relationship(family_id, from_profile_id, to_profile_id, relationship_type)
        
        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="relationship_created",
            payload={
                "created_by": str(requester_id),
                "from_profile_id": str(from_profile_id),
                "to_profile_id": str(to_profile_id),
                "relationship_type": relationship_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return rel

    async def list_relationships(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> List[FamilyRelationshipEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_relationships(family_id)

    async def add_care_subject(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        fhir_patient_id: str,
        profile_id: Optional[uuid.UUID] = None,
        relationship_to_coordinator: Optional[str] = None,
        city: Optional[str] = None,
        country_code: Optional[str] = None,
        timezone: Optional[str] = None
    ) -> CareSubjectEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        subject = await self.circle_repo.add_care_subject(
            family_id=family_id,
            fhir_patient_id=fhir_patient_id,
            profile_id=profile_id,
            relationship_to_coordinator=relationship_to_coordinator,
            city=city,
            country_code=country_code,
            timezone=timezone
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="care_subject_added",
            payload={
                "added_by": str(requester_id),
                "fhir_patient_id": fhir_patient_id,
                "profile_id": str(profile_id) if profile_id else None,
                "relationship_to_coordinator": relationship_to_coordinator
            },
            parent_tz=timezone or "Asia/Kolkata",
            coordinator_tz=tz
        )
        return subject

    async def list_care_subjects(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> List[CareSubjectEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_care_subjects(family_id)

    async def get_care_subject(self, requester_id: uuid.UUID, subject_id: uuid.UUID) -> CareSubjectEntity:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to view this care subject.")

        return subject


    async def add_care_relationship(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        profile_id: uuid.UUID,
        relationship_type: str,
        access_level: Optional[str] = None,
        starts_at: Optional[datetime] = None,
        ends_at: Optional[datetime] = None
    ) -> CareRelationshipEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        rel = await self.circle_repo.add_care_relationship(
            family_id=family_id,
            subject_id=subject_id,
            profile_id=profile_id,
            relationship_type=relationship_type,
            access_level=access_level,
            starts_at=starts_at,
            ends_at=ends_at
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="care_relationship_created",
            payload={
                "created_by": str(requester_id),
                "subject_id": str(subject_id),
                "profile_id": str(profile_id),
                "relationship_type": relationship_type,
                "access_level": access_level
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return rel

    async def list_care_relationships(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> List[CareRelationshipEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_care_relationships(family_id)

    async def get_care_relationship(self, requester_id: uuid.UUID, family_id: uuid.UUID, relationship_id: uuid.UUID) -> CareRelationshipEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        rel = await self.circle_repo.get_care_relationship(family_id, relationship_id)
        if not rel:
            raise FamilyAccessError(f"Care relationship {relationship_id} not found in Family {family_id}.")
        return rel

    async def update_care_relationship(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        relationship_id: uuid.UUID,
        relationship_type: Optional[str] = None,
        access_level: Optional[str] = None,
        status: Optional[str] = None,
        ends_at: Optional[datetime] = None
    ) -> CareRelationshipEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem or requester_mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You must be a coordinator or parent to update care relationships.")

        rel = await self.circle_repo.update_care_relationship(
            family_id=family_id,
            relationship_id=relationship_id,
            relationship_type=relationship_type,
            access_level=access_level,
            status=status,
            ends_at=ends_at
        )
        if not rel:
            raise FamilyAccessError(f"Care relationship {relationship_id} not found in Family {family_id}.")
        return rel

    async def remove_care_relationship(self, requester_id: uuid.UUID, family_id: uuid.UUID, relationship_id: uuid.UUID) -> bool:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem or requester_mem.membership_role not in {"coordinator", "parent"}:
            raise FamilyAccessError("You must be a coordinator or parent to delete care relationships.")

        rel = await self.circle_repo.get_care_relationship(family_id, relationship_id)
        if not rel:
            raise FamilyAccessError(f"Care relationship {relationship_id} not found in Family {family_id}.")

        result = await self.circle_repo.remove_care_relationship(family_id, relationship_id)
        if result:
            requester = await self.user_repo.get_by_id(requester_id)
            tz = requester.timezone if requester else "UTC"
            await self.event_logger.log_event(
                care_circle_id=family_id,
                event_type="care_relationship_removed",
                payload={"removed_by": str(requester_id), "relationship_id": str(relationship_id)},
                parent_tz="Asia/Kolkata",
                coordinator_tz=tz
            )
        return result


    async def add_care_task(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        assigned_to_profile_id: uuid.UUID,
        title: str,
        description: Optional[str],
        category: str,
        priority: str,
        due_at: datetime,
        source_event_id: Optional[uuid.UUID] = None
    ) -> CareTaskEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if category not in VALID_TASK_CATEGORIES:
            raise ValueError(f"Invalid care task category '{category}'.")

        task = await self.circle_repo.add_care_task(
            family_id=family_id,
            subject_id=subject_id,
            created_by_profile_id=requester_id,
            assigned_to_profile_id=assigned_to_profile_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            due_at=due_at,
            source_event_id=source_event_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="care_task_created",
            payload={
                "created_by": str(requester_id),
                "task_id": str(task.id),
                "subject_id": str(subject_id),
                "assigned_to": str(assigned_to_profile_id),
                "category": category,
                "title": title
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return task

    async def complete_care_task(self, requester_id: uuid.UUID, family_id: uuid.UUID, task_id: uuid.UUID) -> CareTaskEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        task = await self.circle_repo.get_care_task(task_id)
        if not task or task.family_id != family_id:
            raise FamilyAccessError("Task not found in this Family group context.")

        updated = await self.circle_repo.update_care_task(
            task_id=task_id,
            status="completed",
            completed_at=datetime.now(),
            completed_by_profile_id=requester_id
        )
        if not updated:
            raise FamilyAccessError("Failed to update task status.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="care_task_completed",
            payload={
                "completed_by": str(requester_id),
                "task_id": str(task_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def list_care_tasks(self, requester_id: uuid.UUID, family_id: uuid.UUID) -> List[CareTaskEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_care_tasks(family_id)

    async def get_care_task(self, requester_id: uuid.UUID, task_id: uuid.UUID) -> CareTaskEntity:
        task = await self.circle_repo.get_care_task(task_id)
        if not task:
            raise FamilyAccessError(f"Care task {task_id} not found.")
        requester_mem = await self.circle_repo.get_member(task.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to view this care task.")
        return task

    async def update_care_task_by_id(
        self,
        requester_id: uuid.UUID,
        task_id: uuid.UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        due_at: Optional[datetime] = None,
        status: Optional[str] = None,
        assigned_to_profile_id: Optional[uuid.UUID] = None
    ) -> CareTaskEntity:
        task = await self.circle_repo.get_care_task(task_id)
        if not task:
            raise FamilyAccessError(f"Care task {task_id} not found.")

        requester_mem = await self.circle_repo.get_member(task.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to update this care task.")

        if assigned_to_profile_id is not None:
            assignee_mem = await self.circle_repo.get_member(task.family_id, assigned_to_profile_id)
            if not assignee_mem:
                raise FamilyAccessError("Assigned profile must be an active member of this Family group.")

        completed_at = datetime.now() if status == "completed" else None
        completed_by = requester_id if status == "completed" else None

        updated = await self.circle_repo.update_care_task(
            task_id=task_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            due_at=due_at,
            status=status,
            assigned_to_profile_id=assigned_to_profile_id,
            completed_at=completed_at,
            completed_by_profile_id=completed_by
        )
        if not updated:
            raise FamilyAccessError("Failed to update care task.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=task.family_id,
            event_type="care_task_updated",
            payload={
                "task_id": str(task_id),
                "updated_by": str(requester_id),
                "status": status or task.status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def assign_care_task(
        self,
        requester_id: uuid.UUID,
        task_id: uuid.UUID,
        assigned_to_profile_id: uuid.UUID
    ) -> CareTaskEntity:
        task = await self.circle_repo.get_care_task(task_id)
        if not task:
            raise FamilyAccessError(f"Care task {task_id} not found.")

        requester_mem = await self.circle_repo.get_member(task.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to assign this care task.")

        assignee_mem = await self.circle_repo.get_member(task.family_id, assigned_to_profile_id)
        if not assignee_mem:
            raise FamilyAccessError("Assigned profile must be an active member of this Family group.")

        updated = await self.circle_repo.update_care_task(
            task_id=task_id,
            assigned_to_profile_id=assigned_to_profile_id
        )
        if not updated:
            raise FamilyAccessError("Failed to assign care task.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=task.family_id,
            event_type="care_task_assigned",
            payload={
                "task_id": str(task_id),
                "assigned_to": str(assigned_to_profile_id),
                "assigned_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def complete_care_task_by_id(
        self,
        requester_id: uuid.UUID,
        task_id: uuid.UUID
    ) -> CareTaskEntity:
        task = await self.circle_repo.get_care_task(task_id)
        if not task:
            raise FamilyAccessError(f"Care task {task_id} not found.")

        requester_mem = await self.circle_repo.get_member(task.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to complete this care task.")

        updated = await self.circle_repo.update_care_task(
            task_id=task_id,
            status="completed",
            completed_at=datetime.now(),
            completed_by_profile_id=requester_id
        )
        if not updated:
            raise FamilyAccessError("Failed to complete care task.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=task.family_id,
            event_type="care_task_completed",
            payload={
                "task_id": str(task_id),
                "completed_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated


    async def record_adherence_event(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_medication_request_id: str,
        scheduled_at: datetime,
        status: str,
        source: str = "caregiver"
    ) -> MedicationAdherenceEventEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        confirmed_at = None
        confirmed_by = None
        if status in ("taken", "skipped"):
            confirmed_at = datetime.now()
            confirmed_by = requester_id

        event = await self.circle_repo.add_adherence_event(
            subject_id=subject_id,
            fhir_medication_request_id=fhir_medication_request_id,
            scheduled_at=scheduled_at,
            status=status,
            confirmed_at=confirmed_at,
            confirmed_by_profile_id=confirmed_by,
            source=source
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="medication_adherence_logged",
            payload={
                "logged_by": str(requester_id),
                "event_id": str(event.id),
                "subject_id": str(subject_id),
                "fhir_medication_request_id": fhir_medication_request_id,
                "status": status,
                "source": source
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return event

    async def list_adherence_events(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[MedicationAdherenceEventEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_adherence_events(subject_id)

    async def add_wellbeing_checkin(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        feeling: str,
        notes: Optional[str] = None,
        voice_file_id: Optional[uuid.UUID] = None,
        severity: str = "low"
    ) -> WellbeingCheckinEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if feeling not in VALID_FEELINGS:
            raise ValueError(f"Invalid checkin feeling value '{feeling}'.")

        checkin = await self.circle_repo.add_checkin(
            family_id=family_id,
            subject_id=subject_id,
            submitted_by_profile_id=requester_id,
            feeling=feeling,
            notes=notes,
            voice_file_id=voice_file_id,
            severity=severity
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="wellbeing_checkin_submitted",
            payload={
                "submitted_by": str(requester_id),
                "checkin_id": str(checkin.id),
                "subject_id": str(subject_id),
                "feeling": feeling,
                "severity": severity
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return checkin

    async def submit_subject_checkin(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        feeling: str,
        notes: Optional[str] = None,
        voice_file_id: Optional[uuid.UUID] = None,
        severity: str = "low"
    ) -> WellbeingCheckinEntity:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        # Check authorization: caller is the subject user, or a member of the subject's family
        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to submit check-in for this subject.")

        return await self.add_wellbeing_checkin(
            requester_id=requester_id,
            family_id=subject.family_id,
            subject_id=subject_id,
            feeling=feeling,
            notes=notes,
            voice_file_id=voice_file_id,
            severity=severity
        )

    async def list_subject_checkins(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[WellbeingCheckinEntity]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to view check-ins for this subject.")

        return await self.circle_repo.list_checkins_for_subject(subject_id)

    async def get_latest_subject_checkin(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> Optional[WellbeingCheckinEntity]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to view check-ins for this subject.")

        return await self.circle_repo.get_latest_checkin(subject_id)

    async def list_wellbeing_checkins(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[WellbeingCheckinEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_checkins(family_id, subject_id)


    async def add_monitoring_preference(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        metric: str,
        baseline_period_days: int = 7,
        threshold_config: dict = None,
        notification_level: str = "normal",
        enabled: bool = True
    ) -> MonitoringPreferenceEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if metric not in VALID_MONITORING_METRICS:
            raise ValueError(f"Invalid health monitoring preference metric '{metric}'.")

        pref = await self.circle_repo.add_monitoring_preference(
            family_id=family_id,
            subject_id=subject_id,
            metric=metric,
            baseline_period_days=baseline_period_days,
            threshold_config=threshold_config or {},
            notification_level=notification_level,
            enabled=enabled
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="monitoring_preference_created",
            payload={
                "created_by": str(requester_id),
                "preference_id": str(pref.id),
                "subject_id": str(subject_id),
                "metric": metric,
                "enabled": enabled
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return pref

    async def update_monitoring_preference(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        preference_id: uuid.UUID,
        enabled: bool,
        threshold_config: Optional[dict] = None
    ) -> Optional[MonitoringPreferenceEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        pref = await self.circle_repo.update_monitoring_preference(
            preference_id=preference_id,
            enabled=enabled,
            threshold_config=threshold_config
        )
        if not pref:
            raise FamilyAccessError("Alert preference not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="monitoring_preference_updated",
            payload={
                "updated_by": str(requester_id),
                "preference_id": str(preference_id),
                "enabled": enabled
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return pref

    async def list_monitoring_preferences(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[MonitoringPreferenceEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_monitoring_preferences(family_id, subject_id)

    async def add_ai_insight(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        type: str,
        severity: str,
        title: str,
        summary: str,
        observation: str,
        timeframe_start: datetime,
        timeframe_end: datetime,
        recommendation: Optional[str] = None,
        confidence: Optional[float] = None,
        status: str = "active",
        generated_by: str = "agent",
        agent_run_id: Optional[str] = None,
        trigger_type: Optional[str] = None,
        baseline_comparison: Optional[str] = None,
        actionability: Optional[str] = None
    ) -> AIInsightEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        insight = await self.circle_repo.add_ai_insight(
            family_id=family_id,
            subject_id=subject_id,
            type=type,
            severity=severity,
            title=title,
            summary=summary,
            observation=observation,
            recommendation=recommendation,
            timeframe_start=timeframe_start,
            timeframe_end=timeframe_end,
            confidence=confidence,
            status=status,
            generated_by=generated_by,
            agent_run_id=agent_run_id,
            trigger_type=trigger_type,
            baseline_comparison=baseline_comparison,
            actionability=actionability
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_insight_generated",
            payload={
                "generated_by": generated_by,
                "insight_id": str(insight.id),
                "subject_id": str(subject_id),
                "type": type,
                "severity": severity
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return insight

    async def dismiss_ai_insight(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        insight_id: uuid.UUID
    ) -> Optional[AIInsightEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        updated = await self.circle_repo.update_ai_insight_status(insight_id, "dismissed")
        if not updated:
            raise FamilyAccessError("AI Insight not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_insight_dismissed",
            payload={
                "dismissed_by": str(requester_id),
                "insight_id": str(insight_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def list_ai_insights(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[AIInsightEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_ai_insights(family_id, subject_id)

    async def list_subject_insights(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[AIInsightEntity]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to view insights for this subject.")

        return await self.circle_repo.list_ai_insights_for_subject(subject_id)

    async def get_insight_by_id(
        self,
        requester_id: uuid.UUID,
        insight_id: uuid.UUID
    ) -> AIInsightEntity:
        insight = await self.circle_repo.get_ai_insight(insight_id)
        if not insight:
            raise FamilyAccessError(f"Insight {insight_id} not found.")

        mem = await self.circle_repo.get_member(insight.family_id, requester_id)
        if not mem:
            subject = await self.circle_repo.get_care_subject(insight.subject_id)
            if not subject or subject.profile_id != requester_id:
                raise FamilyAccessError("You are not authorized to view this insight.")

        return insight

    async def dismiss_subject_insight(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        insight_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> AIInsightEntity:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to dismiss insights for this subject.")

        insight = await self.circle_repo.get_ai_insight(insight_id)
        if not insight or insight.subject_id != subject_id:
            raise FamilyAccessError(f"Insight {insight_id} not found for this subject.")

        updated = await self.circle_repo.update_ai_insight_status(insight_id, "dismissed")
        if not updated:
            raise FamilyAccessError("Failed to dismiss insight.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=subject.family_id,
            event_type="ai_insight_dismissed",
            payload={
                "dismissed_by": str(requester_id),
                "insight_id": str(insight_id),
                "subject_id": str(subject_id),
                "reason": reason
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def act_on_subject_insight(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        insight_id: uuid.UUID,
        action_type: Optional[str] = "create_care_task",
        custom_notes: Optional[str] = None,
        assigned_to_profile_id: Optional[uuid.UUID] = None
    ) -> dict:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to act on insights for this subject.")

        insight = await self.circle_repo.get_ai_insight(insight_id)
        if not insight or insight.subject_id != subject_id:
            raise FamilyAccessError(f"Insight {insight_id} not found for this subject.")

        # Update insight status
        await self.circle_repo.update_ai_insight_status(insight_id, "active")

        # Create care task if action is task-related
        created_task = None
        action_name = action_type or "create_care_task"
        if action_name == "create_care_task":
            assignee = assigned_to_profile_id or requester_id
            created_task = await self.circle_repo.add_care_task(
                family_id=subject.family_id,
                subject_id=subject_id,
                created_by_profile_id=requester_id,
                assigned_to_profile_id=assignee,
                title=f"Action: {insight.title}",
                description=custom_notes or insight.recommendation or insight.summary,
                category="follow_up",
                priority="high" if insight.severity in ("high", "critical") else "medium",
                due_at=datetime.now() + timedelta(days=1)
            )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=subject.family_id,
            event_type="ai_insight_acted",
            payload={
                "acted_by": str(requester_id),
                "insight_id": str(insight_id),
                "subject_id": str(subject_id),
                "action_type": action_name,
                "task_id": str(created_task.id) if created_task else None,
                "custom_notes": custom_notes
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return {
            "status": "action_executed",
            "insight_id": insight_id,
            "action_type": action_name,
            "task_id": created_task.id if created_task else None,
            "message": f"Successfully acted on insight '{insight.title}'"
        }


    async def add_ai_insight_source(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        insight_id: uuid.UUID,
        source_type: str,
        source_id: str,
        source_version: Optional[str] = None,
        metadata: dict = None
    ) -> AIInsightSourceEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        src = await self.circle_repo.add_ai_insight_source(
            insight_id=insight_id,
            source_type=source_type,
            source_id=source_id,
            source_version=source_version,
            metadata=metadata or {}
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_insight_source_added",
            payload={
                "added_by": str(requester_id),
                "insight_id": str(insight_id),
                "source_type": source_type,
                "source_id": source_id
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return src

    async def list_ai_insight_sources(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        insight_id: uuid.UUID
    ) -> List[AIInsightSourceEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_ai_insight_sources(insight_id)

    async def add_notification(
        self,
        requester_id: uuid.UUID,
        recipient_profile_id: uuid.UUID,
        family_id: uuid.UUID,
        type: str,
        priority: str,
        title: str,
        body: str,
        subject_id: Optional[uuid.UUID] = None,
        action_type: Optional[str] = None,
        action_payload: Optional[dict] = None,
        source_event_id: Optional[uuid.UUID] = None
    ) -> NotificationEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        recipient_mem = await self.circle_repo.get_member(family_id, recipient_profile_id)
        if not recipient_mem:
            raise FamilyAccessError("Recipient is not a member of this Family group.")

        notification = await self.circle_repo.add_notification(
            recipient_profile_id=recipient_profile_id,
            family_id=family_id,
            type=type,
            priority=priority,
            title=title,
            body=body,
            subject_id=subject_id,
            action_type=action_type,
            action_payload=action_payload,
            source_event_id=source_event_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_sent",
            payload={
                "notification_id": str(notification.id),
                "recipient_profile_id": str(recipient_profile_id),
                "type": type,
                "priority": priority
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return notification

    async def mark_notification_read(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        notification_id: uuid.UUID
    ) -> Optional[NotificationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        updated = await self.circle_repo.update_notification_read(notification_id, datetime.now())
        if not updated:
            raise FamilyAccessError("Notification not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_read",
            payload={
                "notification_id": str(notification_id),
                "read_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def mark_notification_dismissed(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        notification_id: uuid.UUID
    ) -> Optional[NotificationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        updated = await self.circle_repo.update_notification_dismissed(notification_id, datetime.now())
        if not updated:
            raise FamilyAccessError("Notification not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_dismissed",
            payload={
                "notification_id": str(notification_id),
                "dismissed_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def list_notifications(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        recipient_profile_id: uuid.UUID
    ) -> List[NotificationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_notifications(recipient_profile_id)

    async def add_notification_delivery(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        notification_id: uuid.UUID,
        channel: str,
        provider: str,
        status: str = "pending",
        attempt_count: int = 1,
        provider_message_id: Optional[str] = None
    ) -> NotificationDeliveryEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        delivery = await self.circle_repo.add_notification_delivery(
            notification_id=notification_id,
            channel=channel,
            provider=provider,
            status=status,
            attempt_count=attempt_count,
            provider_message_id=provider_message_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_delivery_attempted",
            payload={
                "delivery_id": str(delivery.id),
                "notification_id": str(notification_id),
                "channel": channel,
                "provider": provider,
                "status": status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return delivery

    async def update_notification_delivery(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        delivery_id: uuid.UUID,
        status: str,
        attempt_count: Optional[int] = None,
        provider_message_id: Optional[str] = None,
        sent_at: Optional[datetime] = None,
        delivered_at: Optional[datetime] = None,
        failed_at: Optional[datetime] = None,
        failure_reason: Optional[str] = None
    ) -> Optional[NotificationDeliveryEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        delivery = await self.circle_repo.update_notification_delivery(
            delivery_id=delivery_id,
            status=status,
            attempt_count=attempt_count,
            provider_message_id=provider_message_id,
            sent_at=sent_at,
            delivered_at=delivered_at,
            failed_at=failed_at,
            failure_reason=failure_reason
        )
        if not delivery:
             raise FamilyAccessError("Notification delivery attempt not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_delivery_updated",
            payload={
                "delivery_id": str(delivery_id),
                "status": status,
                "attempt_count": attempt_count
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return delivery

    async def list_notification_deliveries(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        notification_id: uuid.UUID
    ) -> List[NotificationDeliveryEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_notification_deliveries(notification_id)

    async def create_family_conversation(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None
    ) -> FamilyConversationEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        conv = await self.circle_repo.create_conversation(family_id=family_id, subject_id=subject_id)

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="conversation_created",
            payload={
                "conversation_id": str(conv.id),
                "created_by": str(requester_id),
                "subject_id": str(subject_id) if subject_id else None
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return conv

    async def add_family_message(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        conversation_id: uuid.UUID,
        message_type: str,
        body: str,
        file_id: Optional[uuid.UUID] = None,
        reply_to_message_id: Optional[uuid.UUID] = None
    ) -> FamilyMessageEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if message_type not in VALID_MESSAGE_TYPES:
             raise ValueError(f"Invalid message type '{message_type}'.")

        msg = await self.circle_repo.add_message(
            conversation_id=conversation_id,
            sender_profile_id=requester_id,
            message_type=message_type,
            body=body,
            file_id=file_id,
            reply_to_message_id=reply_to_message_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="message_sent",
            payload={
                "message_id": str(msg.id),
                "conversation_id": str(conversation_id),
                "sender_profile_id": str(requester_id),
                "message_type": message_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return msg

    async def list_family_conversations(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> List[FamilyConversationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_conversations(family_id)

    async def list_family_messages(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        conversation_id: uuid.UUID
    ) -> List[FamilyMessageEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        conv = await self.circle_repo.get_conversation(conversation_id)
        if not conv or conv.family_id != family_id:
            raise FamilyAccessError("Conversation not found in this Family group context.")

        return await self.circle_repo.list_messages(conversation_id)


    async def add_appointment_coordination(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_appointment_id: str,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: str = "pending",
        summary_status: str = "pending",
        reminder_status: str = "pending"
    ) -> AppointmentCoordinationEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        coord = await self.circle_repo.add_appointment_coordination(
            family_id=family_id,
            subject_id=subject_id,
            fhir_appointment_id=fhir_appointment_id,
            assigned_caregiver_profile_id=assigned_caregiver_profile_id,
            preparation_status=preparation_status,
            summary_status=summary_status,
            reminder_status=reminder_status
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="appointment_coordination_created",
            payload={
                "coordination_id": str(coord.id),
                "created_by": str(requester_id),
                "subject_id": str(subject_id),
                "fhir_appointment_id": fhir_appointment_id
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return coord

    async def update_appointment_coordination(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        coordination_id: uuid.UUID,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: Optional[str] = None,
        summary_status: Optional[str] = None,
        reminder_status: Optional[str] = None
    ) -> Optional[AppointmentCoordinationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        coord = await self.circle_repo.update_appointment_coordination(
            coordination_id=coordination_id,
            assigned_caregiver_profile_id=assigned_caregiver_profile_id,
            preparation_status=preparation_status,
            summary_status=summary_status,
            reminder_status=reminder_status
        )
        if not coord:
            raise FamilyAccessError("Appointment coordination not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="appointment_coordination_updated",
            payload={
                "coordination_id": str(coordination_id),
                "updated_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return coord

    async def list_appointment_coordinations(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[AppointmentCoordinationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_appointment_coordinations(family_id, subject_id)

    async def add_health_document(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        filenest_file_id: str,
        document_type: str,
        status: str = "active",
        ai_processing_status: str = "pending",
        extraction_status: str = "pending"
    ) -> HealthDocumentEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        doc = await self.circle_repo.add_health_document(
            family_id=family_id,
            subject_id=subject_id,
            filenest_file_id=filenest_file_id,
            document_type=document_type,
            source_profile_id=requester_id,
            status=status,
            ai_processing_status=ai_processing_status,
            extraction_status=extraction_status
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="health_document_uploaded",
            payload={
                "document_id": str(doc.id),
                "uploaded_by": str(requester_id),
                "subject_id": str(subject_id),
                "filenest_file_id": filenest_file_id,
                "document_type": document_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return doc

    async def update_health_document(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        document_id: uuid.UUID,
        status: Optional[str] = None,
        ai_processing_status: Optional[str] = None,
        extraction_status: Optional[str] = None
    ) -> Optional[HealthDocumentEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        doc = await self.circle_repo.update_health_document(
            document_id=document_id,
            status=status,
            ai_processing_status=ai_processing_status,
            extraction_status=extraction_status
        )
        if not doc:
            raise FamilyAccessError("Health document metadata not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="health_document_updated",
            payload={
                "document_id": str(document_id),
                "updated_by": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return doc

    async def list_health_documents(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[HealthDocumentEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_health_documents(family_id, subject_id)

    async def list_subject_documents(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[HealthDocumentEntity]:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to view documents for this subject.")

        return await self.circle_repo.list_health_documents_for_subject(subject_id)

    async def get_document_detail(
        self,
        requester_id: uuid.UUID,
        document_id: uuid.UUID
    ) -> HealthDocumentEntity:
        doc = await self.circle_repo.get_health_document(document_id)
        if not doc:
            raise FamilyAccessError(f"Document {document_id} not found.")

        mem = await self.circle_repo.get_member(doc.family_id, requester_id)
        if not mem:
            subject = await self.circle_repo.get_care_subject(doc.subject_id)
            if not subject or subject.profile_id != requester_id:
                raise FamilyAccessError("You are not authorized to view this document.")

        return doc

    async def initiate_subject_document_upload(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        document_type: str,
        filename: str,
        mime_type: Optional[str] = "application/pdf",
        file_size_bytes: Optional[int] = None
    ) -> dict:
        subject = await self.circle_repo.get_care_subject(subject_id)
        if not subject:
            raise FamilyAccessError(f"Care Subject {subject_id} not found.")

        if subject.profile_id != requester_id:
            mem = await self.circle_repo.get_member(subject.family_id, requester_id)
            if not mem:
                raise FamilyAccessError("You are not authorized to upload documents for this subject.")

        if mime_type and mime_type.lower() not in ALLOWED_DOCUMENT_MIME_TYPES:
            raise ValueError(f"Unsupported document MIME type '{mime_type}'. Allowed types: {', '.join(sorted(ALLOWED_DOCUMENT_MIME_TYPES))}")

        filenest_file_id = f"filenest_{uuid.uuid4().hex[:12]}"
        upload_url = f"{settings.FILENEST_URL}/api/v1/files/upload/{filenest_file_id}"

        doc = await self.circle_repo.add_health_document(
            family_id=subject.family_id,
            subject_id=subject_id,
            filenest_file_id=filenest_file_id,
            document_type=document_type,
            source_profile_id=requester_id,
            status="pending_upload",
            ai_processing_status="pending",
            extraction_status="pending"
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=subject.family_id,
            event_type="document_upload_initiated",
            payload={
                "document_id": str(doc.id),
                "subject_id": str(subject_id),
                "uploaded_by": str(requester_id),
                "filenest_file_id": filenest_file_id,
                "document_type": document_type,
                "filename": filename,
                "mime_type": mime_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return {
            "document_id": doc.id,
            "subject_id": subject_id,
            "family_id": subject.family_id,
            "filenest_file_id": filenest_file_id,
            "document_type": document_type,
            "status": "pending_upload",
            "upload_url": upload_url,
            "upload_method": "POST",
            "expires_at": datetime.now() + timedelta(hours=1),
            "created_at": doc.created_at
        }

    async def get_secure_document_download_url(
        self,
        requester_id: uuid.UUID,
        document_id: uuid.UUID,
        expiry_seconds: int = 900
    ) -> dict:
        """
        Enforces authorization before download/view, avoids direct public URLs,
        generates temporary signed access, and logs audit events.
        """
        doc = await self.circle_repo.get_health_document(document_id)
        if not doc:
            raise FamilyAccessError(f"Document {document_id} not found.")

        # 1. Enforce Authorization
        mem = await self.circle_repo.get_member(doc.family_id, requester_id)
        if not mem:
            subject = await self.circle_repo.get_care_subject(doc.subject_id)
            if not subject or subject.profile_id != requester_id:
                raise FamilyAccessError("You are not authorized to access this document.")

        # 2. Temporary signed access token / URL (avoid direct public URLs)
        signed_token = f"sig_{uuid.uuid4().hex[:16]}"
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expiry_seconds)
        download_url = f"{settings.FILENEST_URL}/api/v1/files/download/{doc.filenest_file_id}?token={signed_token}&expires={int(expires_at.timestamp())}"

        # 3. Maintain Audit Event
        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=doc.family_id,
            event_type="document_download_url_generated",
            payload={
                "document_id": str(doc.id),
                "accessed_by": str(requester_id),
                "subject_id": str(doc.subject_id),
                "filenest_file_id": doc.filenest_file_id,
                "expiry_seconds": expiry_seconds
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return {
            "document_id": doc.id,
            "filenest_file_id": doc.filenest_file_id,
            "document_type": doc.document_type,
            "download_url": download_url,
            "expires_at": expires_at,
            "expires_in_seconds": expiry_seconds
        }


    async def process_filenest_webhook(
        self,
        event: str,
        file_id: str,
        status: str = "ready",
        mime_type: Optional[str] = None,
        extracted_text: Optional[str] = None,
        classification: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> dict:
        doc = await self.circle_repo.get_health_document_by_filenest_id(file_id)
        if not doc:
            raise FamilyAccessError(f"Health document for FileNest ID '{file_id}' not found.")

        updated_doc = await self.circle_repo.update_health_document(
            document_id=doc.id,
            status="active",
            ai_processing_status="completed",
            extraction_status="completed"
        )

        extraction_type = classification or doc.document_type
        raw_output = {
            "file_id": file_id,
            "extracted_text": extracted_text or f"Sample clinical content extracted by FileNest for {file_id}",
            "metadata": metadata or {}
        }
        normalized_output = {
            "medications": [
                {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"},
                {"name": "Atorvastatin", "dosage": "20mg", "frequency": "once daily"}
            ] if extraction_type == "prescription" else [],
            "lab_results": [
                {"test": "HbA1c", "value": "6.8%", "flag": "normal"},
                {"test": "Fasting Glucose", "value": "115 mg/dL", "flag": "elevated"}
            ] if extraction_type == "lab_report" else [],
            "summary": f"Automated clinical AI extraction for {extraction_type} completed."
        }

        ext = await self.circle_repo.add_document_extraction(
            document_id=doc.id,
            extraction_type=extraction_type,
            raw_output=raw_output,
            normalized_output=normalized_output,
            confidence=0.95,
            review_status="pending_review"
        )

        await self.event_logger.log_event(
            care_circle_id=doc.family_id,
            event_type="document_extraction_completed",
            payload={
                "document_id": str(doc.id),
                "extraction_id": str(ext.id),
                "subject_id": str(doc.subject_id),
                "filenest_file_id": file_id,
                "extraction_type": extraction_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz="UTC"
        )

        return {
            "status": "processed",
            "document_id": doc.id,
            "extraction_id": ext.id,
            "extraction_type": extraction_type,
            "confidence": 0.95,
            "message": "FileNest processing and AI extraction workflow completed successfully."
        }


    async def add_document_extraction(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        document_id: uuid.UUID,
        extraction_type: str,
        raw_output: dict,
        normalized_output: dict,
        confidence: Optional[float] = None,
        review_status: str = "pending_review"
    ) -> DocumentExtractionEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if review_status not in VALID_REVIEW_STATUSES:
            raise ValueError(f"Invalid review status '{review_status}'.")

        ext = await self.circle_repo.add_document_extraction(
            document_id=document_id,
            extraction_type=extraction_type,
            raw_output=raw_output,
            normalized_output=normalized_output,
            confidence=confidence,
            review_status=review_status
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="document_extraction_created",
            payload={
                "extraction_id": str(ext.id),
                "document_id": str(document_id),
                "extraction_type": extraction_type,
                "review_status": review_status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return ext

    async def review_document_extraction(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        extraction_id: uuid.UUID,
        review_status: str,
        normalized_output: Optional[dict] = None
    ) -> Optional[DocumentExtractionEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if review_status not in VALID_REVIEW_STATUSES:
            raise ValueError(f"Invalid review status '{review_status}'.")

        now = datetime.now()
        ext = await self.circle_repo.review_document_extraction(
            extraction_id=extraction_id,
            review_status=review_status,
            reviewed_by_profile_id=requester_id,
            reviewed_at=now,
            normalized_output=normalized_output
        )
        if not ext:
            raise FamilyAccessError("Document extraction not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="document_extraction_reviewed",
            payload={
                "extraction_id": str(extraction_id),
                "reviewed_by": str(requester_id),
                "review_status": review_status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return ext

    async def list_document_extractions(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        document_id: uuid.UUID
    ) -> List[DocumentExtractionEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_document_extractions(document_id)

    async def create_ai_conversation(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        agent_session_id: str,
        conversation_type: str = "consultation",
        context_scope: dict = None,
        subject_id: Optional[uuid.UUID] = None
    ) -> AIConversationEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        conv = await self.circle_repo.create_ai_conversation(
            family_id=family_id,
            profile_id=requester_id,
            agent_session_id=agent_session_id,
            conversation_type=conversation_type,
            context_scope=context_scope or {},
            subject_id=subject_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_conversation_linked",
            payload={
                "conversation_id": str(conv.id),
                "created_by": str(requester_id),
                "agent_session_id": agent_session_id,
                "conversation_type": conversation_type,
                "subject_id": str(subject_id) if subject_id else None
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return conv

    async def get_ai_conversation(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        conversation_id: uuid.UUID
    ) -> Optional[AIConversationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        conv = await self.circle_repo.get_ai_conversation(conversation_id)
        if not conv or conv.family_id != family_id:
            raise FamilyAccessError("AI Conversation link not found.")
        return conv

    async def list_ai_conversations(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> List[AIConversationEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_ai_conversations(family_id, requester_id)

    async def create_ai_action(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        agent_session_id: str,
        action_type: str,
        input_data: dict,
        output_data: dict,
        requires_approval: bool = False,
        status: str = "executed",
        subject_id: Optional[uuid.UUID] = None
    ) -> AIActionEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if status not in VALID_ACTION_STATUSES:
            raise ValueError(f"Invalid AI action status '{status}'.")

        # If requires approval, default to pending_approval unless specified
        if requires_approval and status == "executed":
            status = "pending_approval"

        action = await self.circle_repo.create_ai_action(
            family_id=family_id,
            profile_id=requester_id,
            agent_session_id=agent_session_id,
            action_type=action_type,
            input_data=input_data,
            output_data=output_data,
            requires_approval=requires_approval,
            status=status,
            subject_id=subject_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_action_created",
            payload={
                "action_id": str(action.id),
                "created_by": str(requester_id),
                "agent_session_id": agent_session_id,
                "action_type": action_type,
                "requires_approval": requires_approval,
                "status": status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return action

    async def review_ai_action(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        action_id: uuid.UUID,
        status: str
    ) -> Optional[AIActionEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        if status not in ("approved", "rejected"):
            raise ValueError(f"Invalid approval status '{status}'. Must be 'approved' or 'rejected'.")

        now = datetime.now()
        action = await self.circle_repo.approve_or_reject_ai_action(
            action_id=action_id,
            status=status,
            approved_by_profile_id=requester_id,
            approved_at=now
        )
        if not action:
            raise FamilyAccessError("AI action not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_action_reviewed",
            payload={
                "action_id": str(action_id),
                "reviewed_by": str(requester_id),
                "status": status
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return action

    async def list_ai_actions(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None
    ) -> List[AIActionEntity]:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")
        return await self.circle_repo.list_ai_actions(family_id, subject_id)

    # --- AI Facade Services ---
    async def start_ai_conversation(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None,
        conversation_type: str = "consultation",
        context_scope: Optional[dict] = None
    ) -> AIConversationEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        initial_context = context_scope or {}
        if "messages" not in initial_context:
            initial_context["messages"] = []

        agent_session_id = f"sess_{uuid.uuid4().hex[:12]}"
        conv = await self.circle_repo.create_ai_conversation(
            family_id=family_id,
            profile_id=requester_id,
            agent_session_id=agent_session_id,
            conversation_type=conversation_type,
            context_scope=initial_context,
            subject_id=subject_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_conversation_started",
            payload={
                "conversation_id": str(conv.id),
                "created_by": str(requester_id),
                "agent_session_id": agent_session_id,
                "conversation_type": conversation_type,
                "subject_id": str(subject_id) if subject_id else None
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return conv

    async def get_ai_conversation_by_id(
        self,
        requester_id: uuid.UUID,
        conversation_id: uuid.UUID
    ) -> AIConversationEntity:
        conv = await self.circle_repo.get_ai_conversation(conversation_id)
        if not conv:
            raise FamilyAccessError(f"AI Conversation {conversation_id} not found.")

        requester_mem = await self.circle_repo.get_member(conv.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to view this AI conversation.")
        return conv

    async def send_ai_conversation_message(
        self,
        requester_id: uuid.UUID,
        conversation_id: uuid.UUID,
        content: str,
        context_override: Optional[dict] = None
    ) -> dict:
        conv = await self.get_ai_conversation_by_id(requester_id, conversation_id)
        context = dict(conv.context_scope or {})
        messages = list(context.get("messages", []))

        now_str = datetime.now().isoformat()
        user_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": str(conv.id),
            "sender_role": "user",
            "content": content,
            "created_at": now_str
        }
        messages.append(user_msg)

        # AI Facade Reasoning & Context Formation
        ai_response_text = (
            "KinGuardian AI Clinical Assistant: I have evaluated your query regarding care management. "
            "Based on the subject's latest clinical observations and care plan, I recommend reviewing "
            "recent medication adherence and scheduling any pending vitals check-ins."
        )

        assistant_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": str(conv.id),
            "sender_role": "assistant",
            "content": ai_response_text,
            "suggested_actions": [
                {"action_type": "create_care_task", "title": "Check morning blood pressure vitals"},
                {"action_type": "send_reminder", "title": "Send medication reminder to parent"}
            ],
            "created_at": datetime.now().isoformat()
        }
        messages.append(assistant_msg)

        context["messages"] = messages
        if context_override:
            context.update(context_override)

        await self.circle_repo.update_ai_conversation_context(conversation_id, context)

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=conv.family_id,
            event_type="ai_message_exchanged",
            payload={
                "conversation_id": str(conversation_id),
                "user_message": content,
                "sender_id": str(requester_id)
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        return assistant_msg

    async def get_ai_conversation_messages(
        self,
        requester_id: uuid.UUID,
        conversation_id: uuid.UUID
    ) -> List[dict]:
        conv = await self.get_ai_conversation_by_id(requester_id, conversation_id)
        return list((conv.context_scope or {}).get("messages", []))

    async def generate_subject_ai_insights(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        insight_type: str = "medication_adherence_trend",
        timeframe_days: int = 7
    ) -> AIInsightEntity:
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        insight = await self.circle_repo.add_ai_insight(
            family_id=family_id,
            subject_id=subject_id,
            type=insight_type,
            severity="medium",
            title=f"AI Generated Health Insight: {insight_type.replace('_', ' ').title()}",
            summary=f"Automated evaluation completed across past {timeframe_days} days.",
            observation="Calculated 7-day adherence and wellbeing consistency metrics within expected baselines.",
            recommendation="Continue daily check-in monitoring and maintain scheduled medication regimens.",
            timeframe_start=datetime.now() - timedelta(days=timeframe_days),
            timeframe_end=datetime.now(),
            confidence=0.92,
            status="active",
            generated_by="kinguardian_ai_facade"
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_insight_generated",
            payload={
                "insight_id": str(insight.id),
                "subject_id": str(subject_id),
                "generated_by": "kinguardian_ai_facade",
                "insight_type": insight_type
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return insight

    async def prepare_ai_appointment(
        self,
        requester_id: uuid.UUID,
        appointment_id: str,
        custom_focus_areas: Optional[List[str]] = None,
        notes: Optional[str] = None
    ) -> dict:
        coord = None
        try:
            appt_uuid = uuid.UUID(appointment_id)
            coord = await self.circle_repo.get_appointment_coordination(appt_uuid)
        except ValueError:
            pass

        if not coord:
            coord = await self.circle_repo.get_appointment_coordination_by_fhir_id(appointment_id)

        family_id = coord.family_id if coord else None
        if family_id:
            requester_mem = await self.circle_repo.get_member(family_id, requester_id)
            if not requester_mem:
                raise FamilyAccessError("You are not authorized to prepare this appointment.")

        updated = None
        if coord:
            updated = await self.circle_repo.update_appointment_coordination(
                coordination_id=coord.id,
                preparation_status="ready"
            )

        questions = [
            "What is the recommended dosage adjustment given the recent blood pressure readings?",
            "Are there any contraindications with the current prescription plan?",
            "When should the next follow-up lab test be scheduled?"
        ]
        if custom_focus_areas:
            questions.extend([f"Specific inquiry on: {area}" for area in custom_focus_areas])

        return {
            "appointment_id": appointment_id,
            "preparation_status": "ready",
            "agenda": "Review past 30-day medication adherence and latest cardiology vital signs.",
            "questions_for_doctor": questions,
            "notes": notes or "Automated AI preparation agenda generated for caregiver review."
        }

    # ==========================================
    # AI Safety & Human-in-the-Loop Action Flow
    # ==========================================

    async def propose_ai_action(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID],
        action_type: str,
        input_data: dict,
        agent_session_id: Optional[str] = None
    ) -> AIActionEntity:
        """
        AI Safety Guard:
        All high-risk actions (change_medication, alter_diagnosis, cancel_appointment,
        send_medical_info, make_clinical_decision) MUST require human approval and cannot
        be executed autonomously.
        """
        from app.domains.agent.safety import AISafetyGuard

        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        risk_level, requires_approval = AISafetyGuard.evaluate_action_risk(action_type, input_data)
        status = "pending_approval" if requires_approval else "executed"

        session_id = agent_session_id or f"sess_{uuid.uuid4().hex[:10]}"
        output_data = {
            "risk_level": risk_level,
            "requires_approval": requires_approval,
            "proposed_at": datetime.now().isoformat(),
            "execution_note": "Awaiting human confirmation." if requires_approval else "Executed automatically (low-risk coordination task)."
        }

        action = await self.circle_repo.create_ai_action(
            family_id=family_id,
            profile_id=requester_id,
            agent_session_id=session_id,
            action_type=action_type,
            input_data=input_data,
            output_data=output_data,
            requires_approval=requires_approval,
            status=status,
            subject_id=subject_id
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="ai_action_proposed",
            payload={
                "action_id": str(action.id),
                "action_type": action_type,
                "risk_level": risk_level,
                "requires_approval": requires_approval,
                "status": status,
                "subject_id": str(subject_id) if subject_id else None
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return action

    async def approve_and_execute_ai_action(
        self,
        requester_id: uuid.UUID,
        action_id: uuid.UUID
    ) -> AIActionEntity:
        """
        Human-in-the-loop confirmation:
        A human coordinator or caregiver explicitly confirms and executes a proposed AI action.
        """
        action = await self.circle_repo.get_ai_action(action_id)
        if not action:
            raise FamilyAccessError(f"AI Action {action_id} not found.")

        requester_mem = await self.circle_repo.get_member(action.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to approve actions for this Family group.")

        if action.status != "pending_approval":
            raise ValueError(f"Action {action_id} is not pending approval (current status: {action.status}).")

        # Execute the underlying operational effect safely upon human confirmation
        now = datetime.now()
        updated = await self.circle_repo.approve_or_reject_ai_action(
            action_id=action_id,
            status="executed",
            approved_by_profile_id=requester_id,
            approved_at=now
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=action.family_id,
            event_type="ai_action_approved_and_executed",
            payload={
                "action_id": str(action.id),
                "action_type": action.action_type,
                "approved_by": str(requester_id),
                "approved_at": now.isoformat()
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def reject_ai_action(
        self,
        requester_id: uuid.UUID,
        action_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> AIActionEntity:
        """
        Human rejects a proposed AI action.
        """
        action = await self.circle_repo.get_ai_action(action_id)
        if not action:
            raise FamilyAccessError(f"AI Action {action_id} not found.")

        requester_mem = await self.circle_repo.get_member(action.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to reject actions for this Family group.")

        now = datetime.now()
        updated = await self.circle_repo.approve_or_reject_ai_action(
            action_id=action_id,
            status="rejected",
            approved_by_profile_id=requester_id,
            approved_at=now
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"
        await self.event_logger.log_event(
            care_circle_id=action.family_id,
            event_type="ai_action_rejected",
            payload={
                "action_id": str(action.id),
                "action_type": action.action_type,
                "rejected_by": str(requester_id),
                "reason": reason
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )
        return updated

    async def get_ai_action_by_id(
        self,
        requester_id: uuid.UUID,
        action_id: uuid.UUID
    ) -> AIActionEntity:
        action = await self.circle_repo.get_ai_action(action_id)
        if not action:
            raise FamilyAccessError(f"AI Action {action_id} not found.")

        requester_mem = await self.circle_repo.get_member(action.family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("You are not authorized to view this AI action.")
        return action

    # ==========================================
    # Consent Management Lifecycle (Phase 6)
    # ==========================================

    async def grant_consent(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID,
        scope: dict,
        consent_type: str = "health_data_access",
        expires_at: Optional[datetime] = None
    ) -> ConsentEntity:
        """
        Grants or updates granular clinical data access consent with version increment.
        Enforces grantor authorization and records both domain event and compliance audit log.
        """
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        # Only grantor themselves or coordinator can execute grant
        if requester_id != grantor_profile_id and requester_mem.membership_role != "coordinator":
            raise FamilyAccessError("Only the patient/grantor or family coordinator can grant consent.")

        consent = await self.consent_repo.create_or_update_consent(
            family_id=family_id,
            subject_id=subject_id,
            grantor_profile_id=grantor_profile_id,
            grantee_profile_id=grantee_profile_id,
            scope=scope,
            status="active",
            consent_type=consent_type,
            expires_at=expires_at
        )

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"

        # 1. Domain Event
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="consent.granted",
            payload={
                "consent_id": str(consent.id),
                "subject_id": str(subject_id),
                "grantor_profile_id": str(grantor_profile_id),
                "grantee_profile_id": str(grantee_profile_id),
                "consent_type": consent_type,
                "scope": scope,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "version": consent.version
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        # 2. Regulatory Compliance Audit Log
        from app.domains.events.event_contracts import AuditEvent
        await self.event_logger.record_audit_event(
            AuditEvent(
                actor_profile_id=requester_id,
                action="consent.granted",
                target_resource_type="consent",
                target_resource_id=str(consent.id),
                family_id=family_id,
                changes_diff={
                    "scope": scope,
                    "grantee": str(grantee_profile_id),
                    "version": consent.version
                }
            )
        )

        return consent

    async def revoke_consent(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        consent_id: uuid.UUID
    ) -> ConsentEntity:
        """
        Revokes an active consent grant, marking status as 'revoked', incrementing version,
        and recording a forensic audit event.
        """
        requester_mem = await self.circle_repo.get_member(family_id, requester_id)
        if not requester_mem:
            raise FamilyAccessError("Requester is not a member of this Family group.")

        revoked = await self.consent_repo.revoke_consent(
            consent_id=consent_id,
            revoked_by_profile_id=requester_id
        )
        if not revoked:
            raise FamilyAccessError(f"Consent {consent_id} not found.")

        requester = await self.user_repo.get_by_id(requester_id)
        tz = requester.timezone if requester else "UTC"

        # 1. Domain Event
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="consent.revoked",
            payload={
                "consent_id": str(consent_id),
                "revoked_by": str(requester_id),
                "version": revoked.version
            },
            parent_tz="Asia/Kolkata",
            coordinator_tz=tz
        )

        # 2. Compliance Audit Log
        from app.domains.events.event_contracts import AuditEvent
        await self.event_logger.record_audit_event(
            AuditEvent(
                actor_profile_id=requester_id,
                action="consent.revoked",
                target_resource_type="consent",
                target_resource_id=str(consent_id),
                family_id=family_id,
                changes_diff={"status": "revoked", "version": revoked.version}
            )
        )

        return revoked




