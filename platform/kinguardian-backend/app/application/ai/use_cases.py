"""
AI Application Use Cases:
- AskKinGuardianUseCase
- GenerateHealthInsightUseCase
- GenerateGuardianMomentUseCase
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.domains.agent.context_builder import AIContextBuilder
from app.domains.agent.safety import AISafetyGuard
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import AIInsightEntity


class AskKinGuardianUseCase:
    """Assembles zero-trust scoped clinical context and queries the KinGuardian agent."""
    def __init__(
        self,
        context_builder: AIContextBuilder,
        safety_guard: AISafetyGuard,
        family_service: FamilyService
    ):
        self.context_builder = context_builder
        self.safety_guard = safety_guard
        self.family_service = family_service

    async def execute(
        self,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        query: str,
        subject_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        # 1. Evaluate input safety & untrusted prompt wrapping
        wrapped_query = self.safety_guard.validate_and_sanitize_prompt(query)

        # 2. Build scoped minimized clinical context
        if subject_id:
            context = await self.context_builder.build_context(
                family_id=family_id,
                subject_id=subject_id,
                requester_id=actor_id,
                user_query=wrapped_query
            )
        else:
            context = None

        return {
            "query": wrapped_query,
            "status": "answered",
            "response": "KinGuardian response based on minimal authorized context.",
            "minimized_context": context.model_dump() if context and hasattr(context, "model_dump") else None
        }


# Backward compatibility alias
AskKinGuardianUseCase = AskKinGuardianUseCase



class GenerateHealthInsightUseCase:
    """Evaluates biometric trends and generates longitudinal health insights."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        insight_type: str = "vital_trends"
    ) -> AIInsightEntity:
        return await self.family_service.generate_subject_ai_insights(

            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            insight_type=insight_type
        )


class GenerateGuardianMomentUseCase:
    """Detects clinically meaningful events and synthesizes Guardian Moment cards."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        title: str,
        summary: str,
        observation: str,
        recommendation: Optional[str] = None,
        severity: str = "normal"
    ) -> AIInsightEntity:
        now = datetime.now(timezone.utc)
        return await self.family_service.add_ai_insight(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            type="guardian_moment",
            severity=severity,
            title=title,
            summary=summary,
            observation=observation,
            recommendation=recommendation,
            timeframe_start=now - timedelta(days=7),
            timeframe_end=now
        )
