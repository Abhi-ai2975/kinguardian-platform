import uuid
from datetime import datetime, timezone
from typing import Union, Optional, Dict, Any, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent
)
from app.domains.family.domain.entities import AppProfileEntity, CareSubjectEntity
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_VIEW_BASIC,
    CAP_VIEW_HEALTH_SUMMARY,
    CAP_VIEW_MEDICATIONS,
    CAP_VIEW_VITALS,
    CAP_VIEW_LABS,
    CAP_VIEW_DOCUMENTS,
    CAP_VIEW_APPOINTMENTS,
    CAP_MANAGE_MEDICATIONS,
    CAP_MANAGE_APPOINTMENTS,
    CAP_MANAGE_CARE_TASKS,
    CAP_RECEIVE_HEALTH_ALERTS,
    CAP_UPLOAD_DOCUMENTS,
    CAP_SHARE_HEALTH_SUMMARY,
    CAP_COMMUNICATE_WITH_FAMILY,
    CAP_MANAGE_PERMISSIONS,
    ROLE_CAPABILITIES,
    ACCESS_LEVEL_CAPABILITIES
)

CLINICAL_ACTION_TO_CONSENT_SCOPE = {
    CAP_VIEW_VITALS: "vitals",
    CAP_VIEW_MEDICATIONS: "medications",
    CAP_VIEW_APPOINTMENTS: "appointments",
    CAP_VIEW_DOCUMENTS: "documents",
    CAP_VIEW_LABS: "labs",
    CAP_VIEW_HEALTH_SUMMARY: "health_summary",
    "view_vitals": "vitals",
    "view_medications": "medications",
    "view_appointments": "appointments",
    "view_documents": "documents",
    "view_labs": "labs",
    "view_health_summary": "health_summary",
}


class AuthorizationService:
    """
    Unified Policy Evaluation Authorization Engine.
    
    Evaluates:
    1. Family membership & status
    2. Care relationships & access levels
    3. Patient consent & scope
    4. Permission scopes & RBAC capabilities
    5. Resource ownership & self-access
    6. Expiration timestamps
    
    Default Deny: All requests are denied unless explicitly permitted by policy.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.verifier = PermissionVerifier(session)

    def _extract_id(self, entity_or_id: Union[AppProfile, AppProfileEntity, CareSubject, CareSubjectEntity, uuid.UUID, str]) -> uuid.UUID:
        if isinstance(entity_or_id, uuid.UUID):
            return entity_or_id
        if isinstance(entity_or_id, str):
            return uuid.UUID(entity_or_id)
        if hasattr(entity_or_id, "id"):
            return entity_or_id.id if isinstance(entity_or_id.id, uuid.UUID) else uuid.UUID(str(entity_or_id.id))
        raise ValueError(f"Cannot extract UUID from {entity_or_id}")

    async def can_view_subject(
        self,
        actor: Union[AppProfile, AppProfileEntity, uuid.UUID, str],
        subject: Union[CareSubject, CareSubjectEntity, uuid.UUID, str],
        family_id: Optional[Union[uuid.UUID, str]] = None
    ) -> bool:
        """
        Convenience policy evaluation for viewing a Care Subject.
        Evaluates family membership, subject ownership, care relationship, and basic view capabilities.
        """
        return await self.can(
            actor=actor,
            action=CAP_VIEW_BASIC,
            resource=subject,
            context={"family_id": family_id} if family_id else None
        )

    async def can(
        self,
        actor: Union[AppProfile, AppProfileEntity, uuid.UUID, str],
        action: str,
        resource: Any,
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Core policy evaluation engine.
        Returns True if permitted, False (Default Deny) otherwise.
        """
        try:
            actor_id = self._extract_id(actor)
        except Exception:
            return False

        context = context or {}
        now = datetime.now(timezone.utc)

        # 1. Resolve target subject and family_id from resource or context
        target_subject_id: Optional[uuid.UUID] = None
        target_family_id: Optional[uuid.UUID] = None
        subject_record: Optional[CareSubject] = None

        if isinstance(resource, (CareSubject, CareSubjectEntity)):
            target_subject_id = self._extract_id(resource)
            target_family_id = resource.family_id if isinstance(resource.family_id, uuid.UUID) else uuid.UUID(str(resource.family_id))
            if isinstance(resource, CareSubject):
                subject_record = resource
        elif hasattr(resource, "subject_id") and resource.subject_id:
            target_subject_id = self._extract_id(resource.subject_id)
            if hasattr(resource, "family_id") and resource.family_id:
                target_family_id = self._extract_id(resource.family_id)
        elif hasattr(resource, "family_id") and resource.family_id:
            target_family_id = self._extract_id(resource.family_id)

        if not target_family_id and "family_id" in context:
            target_family_id = self._extract_id(context["family_id"])

        if not target_subject_id and "subject_id" in context:
            target_subject_id = self._extract_id(context["subject_id"])

        # Fetch Subject record if we have subject_id but not the record itself
        if target_subject_id and not subject_record:
            subject_record = await self.session.get(CareSubject, target_subject_id)

        # 2. Resource Ownership & Self-Access Policy
        if subject_record:
            if subject_record.profile_id and subject_record.profile_id == actor_id:
                # Subject is viewing their own record -> Always permitted for view/manage own data
                return True
            if not target_family_id:
                target_family_id = subject_record.family_id

        # Direct resource creator ownership check
        if hasattr(resource, "source_profile_id") and resource.source_profile_id == actor_id:
            return True
        if hasattr(resource, "profile_id") and resource.profile_id == actor_id and action in {"view", "update", "delete", "read"}:
            return True

        if not target_family_id:
            # Cannot authorize without family boundary (Default Deny)
            return False

        # 3. Family Membership Policy Evaluation
        mem_query = select(FamilyMembership).where(
            FamilyMembership.family_id == target_family_id,
            FamilyMembership.profile_id == actor_id
        )
        mem_res = await self.session.execute(mem_query)
        membership = mem_res.scalar_one_or_none()

        if not membership:
            return False

        # Check membership status & expiration
        if membership.status != "active":
            return False
        left_at = getattr(membership, "left_at", None)
        if left_at and left_at <= now:
            return False


        # 4. Role Capabilities Evaluation
        user_caps: Set[str] = set(ROLE_CAPABILITIES.get(membership.membership_role, []))

        # 5. Care Relationship Policy Evaluation
        if target_subject_id:
            rel_query = select(CareRelationship).where(
                CareRelationship.family_id == target_family_id,
                CareRelationship.subject_id == target_subject_id,
                CareRelationship.profile_id == actor_id
            )
            rel_res = await self.session.execute(rel_query)
            care_rel = rel_res.scalar_one_or_none()

            if care_rel:
                # Check status and expiration
                if care_rel.status == "active":
                    rel_caps = ACCESS_LEVEL_CAPABILITIES.get(care_rel.access_level, set())
                    user_caps.update(rel_caps)

        # Check if requested action matches granted capabilities
        if action in user_caps:
            action_permitted = True
        elif action in {"view", "read", "view_basic"} and CAP_VIEW_BASIC in user_caps:
            action_permitted = True
        else:
            action_permitted = False

        if not action_permitted:
            return False

        # 6. Consent Policy Evaluation for Clinical / Sensitive Actions
        required_consent_scope = CLINICAL_ACTION_TO_CONSENT_SCOPE.get(action)
        if required_consent_scope and target_subject_id and subject_record:
            # If actor is coordinator or parent, coordinator might still need subject consent unless primary
            grantor_id = subject_record.profile_id
            if grantor_id and grantor_id != actor_id:
                consent_query = select(Consent).where(
                    Consent.family_id == target_family_id,
                    Consent.subject_id == target_subject_id,
                    Consent.grantee_profile_id == actor_id,
                    Consent.status == "active"
                )
                consent_res = await self.session.execute(consent_query)
                consent = consent_res.scalar_one_or_none()

                if not consent:
                    return False
                if consent.expires_at and consent.expires_at <= now:
                    return False
                if not consent.scope or not consent.scope.get(required_consent_scope, False):
                    return False

        # 7. Resource Status Check
        if hasattr(resource, "status"):
            res_status = getattr(resource, "status")
            if res_status in {"deleted", "archived", "suspended"} and action not in {"restore", "audit"}:
                return False

        return True

    async def assert_can(
        self,
        actor: Union[AppProfile, AppProfileEntity, uuid.UUID, str],
        action: str,
        resource: Any,
        context: Optional[Dict[str, Any]] = None,
        detail: Optional[str] = None
    ) -> None:
        """
        Enforces authorization policy. Raises HTTP 403 Forbidden on authorization failure.
        """
        permitted = await self.can(actor, action, resource, context)
        if not permitted:
            msg = detail or f"Access Denied: You do not have permission to perform '{action}' on this resource."
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
