"""
AI Security Boundary & Context Authorization Gateway:
Enforces that mobile clients never hold direct model-provider credentials (OpenAI/Gemini/Claude).

Architectural Flow:
Mobile Client
    ↓
KinGuardian API (/api/v1/agent/query)
    ↓
Authorization + Context Builder (Consent validation, PHI minimization, Prompt injection sanitization)
    ↓
Agent Service (KinGuardian Agent Runtime with Server-Side Model Authentication)
    ↓
Authorized Tools (Deterministic capability verification strictly outside the LLM)
"""

import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.agent.safety import (
    UntrustedContentWrapper,
    UntrustedInputType,
    ExternalToolAuthorizationGatekeeper
)
from app.domains.family.application.permissions import ROLE_CAPABILITIES, CAP_VIEW_VITALS
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)

logger = get_logger(__name__)


class AISecurityBoundary:
    """
    Enforces the complete multi-tier AI security boundary:
    1. Zero model provider API keys exposed to mobile devices.
    2. Context building with deterministic consent evaluation & prompt injection shielding.
    3. Tool execution authorization outside the LLM.
    """

    @classmethod
    async def process_agent_request_boundary(
        cls,
        session: AsyncSession,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        user_query: str,
        requested_tool: Optional[str] = None,
        tool_required_capability: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the full security boundary for AI queries.
        """
        family_repo = SQLAlchemyFamilyRepository(session)
        consent_repo = SQLAlchemyConsentRepository(session)

        # 1. Tenancy & Membership Authorization Check
        membership = await family_repo.get_member(family_id, requester_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requester is not a member of this Family Care Circle."
            )

        subject = await family_repo.get_care_subject(subject_id)
        if not subject or subject.family_id != family_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Care subject not found in this family circle."
            )

        # 2. Consent Verification for Clinical Context
        consents = await consent_repo.list_by_family(family_id)
        has_clinical_consent = any(
            c.subject_id == subject_id and
            c.grantee_profile_id == requester_id and
            c.status == "active" and
            c.scope.get("vitals", False) is True
            for c in consents
        ) or (subject.profile_id == requester_id or membership.membership_role in ["coordinator", "primary_coordinator"])

        # 3. Context Builder with Prompt Injection Sanitization & PHI Minimization
        sanitized_input = UntrustedContentWrapper(
            content_type=UntrustedInputType.USER_TEXT,
            raw_content=user_query,
            source_profile_id=requester_id
        ).to_safe_prompt_context()

        # Build minimized context
        minimized_context = {
            "subject_pseudonym": f"Subject-{str(subject_id)[:8]}",
            "relationship": subject.relationship_to_coordinator or "subject",
            "clinical_data_included": has_clinical_consent,
            "sanitized_user_query": sanitized_input
        }

        # 4. Tool Execution Authorization (if tool call requested)
        tool_authorized = True
        tool_rejection_reason = None
        if requested_tool and tool_required_capability:
            actor_caps = ROLE_CAPABILITIES.get(membership.membership_role, set())
            tool_authorized, tool_rejection_reason = (
                ExternalToolAuthorizationGatekeeper.authorize_tool_request(
                    tool_name=requested_tool,
                    actor_role=membership.membership_role,
                    actor_capabilities=actor_caps,
                    tool_required_capability=tool_required_capability,
                    is_high_risk=False
                )
            )
            if not tool_authorized:
                logger.warning(
                    f"AI Tool Access Denied: tool={requested_tool}, role={membership.membership_role}. "
                    f"Reason: {tool_rejection_reason}"
                )

        logger.info(
            f"AI Security Boundary cleared for requester={requester_id}, family={family_id}, "
            f"subject={subject_id}, model_keys_exposed=False"
        )

        return {
            "authorized": True,
            "model_provider_credentials_exposed": False,
            "minimized_context": minimized_context,
            "tool_authorized": tool_authorized,
            "tool_rejection_reason": tool_rejection_reason,
            "agent_runtime_endpoint": f"{settings.AGENT_API_URL}/api/v1/agent/query"
        }
