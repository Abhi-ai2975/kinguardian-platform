"""
Application AI Package:
Orchestrates zero-trust scoped context building, safety guardrails, MCP tools, and external authorization gatekeepers.
"""

from app.domains.agent.context_builder import (
    AIContextBuilder,
    AIScopedContextPayload,
    infer_dimensions_from_query
)
from app.domains.agent.safety import (
    AISafetyGuard,
    UntrustedContentWrapper,
    ExternalToolAuthorizationGatekeeper
)
from app.domains.agent.tools import ControlledToolRegistry, KinGuardianDomainTool
from app.application.ai.use_cases import (
    AskKinGuardianUseCase,
    AskKinGuardianUseCase,
    GenerateHealthInsightUseCase,
    GenerateGuardianMomentUseCase
)

__all__ = [
    "AIContextBuilder",
    "AIScopedContextPayload",
    "infer_dimensions_from_query",
    "AISafetyGuard",
    "UntrustedContentWrapper",
    "ExternalToolAuthorizationGatekeeper",
    "ControlledToolRegistry",
    "KinGuardianDomainTool",
    "AskKinGuardianUseCase",
    "AskKinGuardianUseCase",
    "GenerateHealthInsightUseCase",
    "GenerateGuardianMomentUseCase"
]

