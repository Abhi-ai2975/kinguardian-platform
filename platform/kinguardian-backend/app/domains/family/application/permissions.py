import uuid
from typing import Set, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.family.infrastructure.models import (
    FamilyMembership,
    CareRelationship,
    CareSubject,
    Consent,
    FamilyConversation,
    FamilyMessage
)

# Define explicit capability constants
CAP_VIEW_BASIC = "view_basic"
CAP_VIEW_HEALTH_SUMMARY = "view_health_summary"
CAP_VIEW_MEDICATIONS = "view_medications"
CAP_VIEW_VITALS = "view_vitals"
CAP_VIEW_LABS = "view_labs"
CAP_VIEW_DOCUMENTS = "view_documents"
CAP_VIEW_APPOINTMENTS = "view_appointments"
CAP_MANAGE_MEDICATIONS = "manage_medications"
CAP_MANAGE_APPOINTMENTS = "manage_appointments"
CAP_MANAGE_CARE_TASKS = "manage_care_tasks"
CAP_RECEIVE_HEALTH_ALERTS = "receive_health_alerts"
CAP_UPLOAD_DOCUMENTS = "upload_documents"
CAP_SHARE_HEALTH_SUMMARY = "share_health_summary"
CAP_COMMUNICATE_WITH_FAMILY = "communicate_with_family"
CAP_MANAGE_PERMISSIONS = "manage_permissions"
CAP_ASSIGN_CARE_TASKS = "assign_care_tasks"
CAP_CONFIRM_ADHERENCE = "confirm_adherence"

# Role-based capability assignments
ROLE_CAPABILITIES = {
    "coordinator": {
        CAP_VIEW_BASIC, CAP_VIEW_HEALTH_SUMMARY, CAP_VIEW_MEDICATIONS, CAP_VIEW_VITALS,
        CAP_VIEW_LABS, CAP_VIEW_DOCUMENTS, CAP_VIEW_APPOINTMENTS, CAP_MANAGE_MEDICATIONS,
        CAP_MANAGE_APPOINTMENTS, CAP_MANAGE_CARE_TASKS, CAP_RECEIVE_HEALTH_ALERTS,
        CAP_UPLOAD_DOCUMENTS, CAP_SHARE_HEALTH_SUMMARY, CAP_COMMUNICATE_WITH_FAMILY,
        CAP_MANAGE_PERMISSIONS, CAP_ASSIGN_CARE_TASKS, CAP_CONFIRM_ADHERENCE
    },
    "caregiver": {
        CAP_VIEW_BASIC, CAP_VIEW_HEALTH_SUMMARY, CAP_VIEW_MEDICATIONS, CAP_VIEW_VITALS,
        CAP_VIEW_APPOINTMENTS, CAP_MANAGE_MEDICATIONS, CAP_MANAGE_APPOINTMENTS,
        CAP_MANAGE_CARE_TASKS, CAP_RECEIVE_HEALTH_ALERTS, CAP_UPLOAD_DOCUMENTS,
        CAP_COMMUNICATE_WITH_FAMILY, CAP_CONFIRM_ADHERENCE
    },
    "family_member": {
        CAP_VIEW_BASIC, CAP_VIEW_HEALTH_SUMMARY, CAP_VIEW_APPOINTMENTS, CAP_COMMUNICATE_WITH_FAMILY
    },
    "parent": {
        CAP_VIEW_BASIC, CAP_VIEW_HEALTH_SUMMARY, CAP_VIEW_MEDICATIONS, CAP_VIEW_VITALS,
        CAP_VIEW_LABS, CAP_VIEW_DOCUMENTS, CAP_VIEW_APPOINTMENTS, CAP_MANAGE_MEDICATIONS,
        CAP_MANAGE_APPOINTMENTS, CAP_MANAGE_CARE_TASKS, CAP_RECEIVE_HEALTH_ALERTS,
        CAP_UPLOAD_DOCUMENTS, CAP_SHARE_HEALTH_SUMMARY, CAP_COMMUNICATE_WITH_FAMILY,
        CAP_MANAGE_PERMISSIONS, CAP_CONFIRM_ADHERENCE
    },
    "observer": {
        CAP_VIEW_BASIC, CAP_VIEW_HEALTH_SUMMARY, CAP_VIEW_APPOINTMENTS
    }
}

# Access level profiles matching care_relationships
ACCESS_LEVEL_CAPABILITIES = {
    "full": ROLE_CAPABILITIES["coordinator"],
    "standard": ROLE_CAPABILITIES["caregiver"],
    "basic": ROLE_CAPABILITIES["family_member"]
}


class PermissionVerifier:
    """
    Evaluates fine-grained authorization policies and RBAC matrix.
    Never relies only on frontend visibility.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    @classmethod
    def role_has_capability(cls, role: str, capability: str) -> bool:
        caps = ROLE_CAPABILITIES.get(role, set())
        return capability in caps

    async def get_user_capabilities(
        self,
        profile_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None
    ) -> Set[str]:
        # 1. Fetch Membership Role
        membership_res = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == profile_id
            )
        )
        membership = membership_res.scalar_one_or_none()
        if not membership:
            return set()

        capabilities = set(ROLE_CAPABILITIES.get(membership.membership_role, []))

        # 2. Fetch specific Care Relationship access levels if subject_id is supplied
        if subject_id:
            relationship_res = await self.session.execute(
                select(CareRelationship).where(
                    CareRelationship.family_id == family_id,
                    CareRelationship.subject_id == subject_id,
                    CareRelationship.profile_id == profile_id,
                    CareRelationship.status == "active"
                )
            )
            relationship = relationship_res.scalar_one_or_none()
            if relationship and relationship.access_level:
                rel_caps = ACCESS_LEVEL_CAPABILITIES.get(relationship.access_level, set())
                capabilities.update(rel_caps)

        return capabilities

    async def verify_capability(
        self,
        profile_id: uuid.UUID,
        family_id: uuid.UUID,
        capability: str,
        subject_id: Optional[uuid.UUID] = None
    ) -> bool:
        user_caps = await self.get_user_capabilities(profile_id, family_id, subject_id)
        return capability in user_caps

    # ==========================================
    # Authorization Test Matrix Explicit Methods
    # ==========================================

    async def can_view_health_summary(self, actor_id: uuid.UUID, subject_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Yes; Parent: Yes (own); Caregiver: Configurable."""
        # Check if actor is the subject themselves
        sub_res = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
        subject = sub_res.scalar_one_or_none()
        if subject and subject.profile_id == actor_id:
            return True

        return await self.verify_capability(actor_id, family_id, CAP_VIEW_HEALTH_SUMMARY, subject_id)

    async def can_view_medications(self, actor_id: uuid.UUID, subject_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Yes; Parent: Yes (own); Caregiver: Configurable."""
        sub_res = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
        subject = sub_res.scalar_one_or_none()
        if subject and subject.profile_id == actor_id:
            return True

        return await self.verify_capability(actor_id, family_id, CAP_VIEW_MEDICATIONS, subject_id)

    async def can_change_medication_definition(self, actor_id: uuid.UUID, subject_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Restricted; Parent: No; Caregiver: No (EMR Practitioner only)."""
        return False  # Strictly forbidden for app roles; requires licensed clinical provider

    async def can_confirm_adherence(self, actor_id: uuid.UUID, subject_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Yes; Parent: Yes (own); Caregiver: Configurable (when active)."""
        sub_res = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
        subject = sub_res.scalar_one_or_none()
        if subject and subject.profile_id == actor_id:
            return True

        return await self.verify_capability(actor_id, family_id, CAP_CONFIRM_ADHERENCE, subject_id)

    async def can_view_private_messages(self, actor_id: uuid.UUID, conversation_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Configurable (if member with permission); Parent: Yes (own subject/messages); Caregiver: No unless participant."""
        conv_res = await self.session.execute(
            select(FamilyConversation).where(
                FamilyConversation.id == conversation_id,
                FamilyConversation.family_id == family_id
            )
        )
        conv = conv_res.scalar_one_or_none()
        if not conv:
            return False

        # Check membership and communication capability
        has_comm = await self.verify_capability(actor_id, family_id, CAP_COMMUNICATE_WITH_FAMILY, conv.subject_id)
        if not has_comm:
            return False

        # If subject is actor himself, allow
        if conv.subject_id:
            sub_res = await self.session.execute(select(CareSubject).where(CareSubject.id == conv.subject_id))
            sub = sub_res.scalar_one_or_none()
            if sub and sub.profile_id == actor_id:
                return True

        # Coordinators have access to family circle messages
        mem_res = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == actor_id
            )
        )
        mem = mem_res.scalar_one_or_none()
        if mem and mem.membership_role in ("coordinator", "primary_coordinator"):
            return True

        # Caregivers/Observers can only view if they are explicit message senders in this conversation
        msg_res = await self.session.execute(
            select(FamilyMessage).where(
                FamilyMessage.conversation_id == conversation_id,
                FamilyMessage.sender_profile_id == actor_id
            )
        )
        return msg_res.scalar_one_or_none() is not None

    async def can_assign_care_task(self, actor_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Yes; Parent: No; Caregiver: No."""
        mem_res = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == actor_id
            )
        )
        mem = mem_res.scalar_one_or_none()
        if not mem:
            return False
        return mem.membership_role in ("coordinator", "primary_coordinator")

    async def can_revoke_consent(self, actor_id: uuid.UUID, consent_id: uuid.UUID, family_id: uuid.UUID) -> bool:
        """Coordinator: Depending on grantor; Parent: Yes (own); Caregiver: No."""
        consent_res = await self.session.execute(
            select(Consent).where(
                Consent.id == consent_id,
                Consent.family_id == family_id
            )
        )
        consent = consent_res.scalar_one_or_none()
        if not consent:
            return False

        # The grantor can always revoke their own consent
        if consent.grantor_profile_id == actor_id:
            return True

        # Primary coordinator can revoke if permitted in circle policy
        mem_res = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == actor_id
            )
        )
        mem = mem_res.scalar_one_or_none()
        if mem and mem.membership_role in ("coordinator", "primary_coordinator"):
            return True

        return False
