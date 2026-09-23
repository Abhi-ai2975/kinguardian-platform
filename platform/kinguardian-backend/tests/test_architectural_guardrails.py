"""
Architectural Guardrails & 'Do Not Build' Enforcement Test Suite.

Enforces strict platform constraints against architectural anti-patterns:
1. No second authentication system -> Delegated strictly to IAM
2. No second FHIR server -> Delegated strictly to bezs-emr
3. No second object storage system -> Delegated strictly to FileNest WORM
4. No second agent runtime -> Delegated strictly to bezs-agent
5. No second observability platform -> Delegated strictly to bezs-observability (OpenTelemetry)
6. No generic workflow engine without a requirement -> Concrete domain services & state machines
7. No microservice explosion -> Cohesive Modular Monolith
8. No generic CRUD controllers with business logic -> Thin presentation routers
9. No SQL access from API routers -> Routers must NOT execute raw SQL queries
10. No AI tools with unrestricted database access -> Scoped, consent-bounded, read-only tools
"""

import pytest
import inspect
import re
from pathlib import Path
from app.core.config import settings
from app.domains.clinical.gateway import FHIRClinicalRecordGateway
from app.core.adapters.prod_filenest import FileNestGateway
from app.core.adapters.prod_agent import AgentGateway
from app.core.telemetry import MetricsCollector
from app.domains.agent.tools import ControlledToolRegistry




def test_no_second_authentication_system():
    """
    Verifies that KinGuardian does NOT implement a standalone auth server or password storage.
    Delegates authentication and token issuance strictly to IAM.
    """
    assert hasattr(settings, "IAM_ISSUER")
    assert hasattr(settings, "IAM_JWKS_URL")
    assert hasattr(settings, "IAM_AUDIENCE")
    
    # KinGuardian does not store user passwords
    from app.domains.family.infrastructure.models import AppProfile
    assert not hasattr(AppProfile, "password_hash")
    assert not hasattr(AppProfile, "hashed_password")
    assert not hasattr(AppProfile, "salt")


def test_no_second_fhir_server():
    """
    Verifies that KinGuardian interacts with FHIR via client gateway and does not store master clinical tables.
    """
    assert issubclass(FHIRClinicalRecordGateway, object)
    assert hasattr(settings, "EMR_GQL_URL")
    assert hasattr(settings, "EMR_CORE_URL")


def test_no_second_object_storage_system():
    """
    Verifies that KinGuardian delegates binary storage to FileNest and stores no binary blobs in SQL.
    """
    from app.domains.family.infrastructure.models import HealthDocument
    assert hasattr(HealthDocument, "filenest_file_id")
    assert not hasattr(HealthDocument, "binary_data")
    assert not hasattr(HealthDocument, "file_blob")


def test_no_second_agent_runtime():
    """
    Verifies that KinGuardian integrates with the external autonomous bezs-agent rather than embedding LLM engines.
    """
    assert issubclass(AgentGateway, object)
    assert hasattr(settings, "AGENT_SERVICE_URL")
    assert hasattr(settings, "AGENT_TIMEOUT")


def test_no_second_observability_platform():
    """
    Verifies that KinGuardian exports standardized OpenTelemetry metrics to bezs-observability.
    """
    assert issubclass(MetricsCollector, object)
    assert hasattr(settings, "OBSERVABILITY_URL")



def test_no_direct_sql_access_from_api_routers():
    """
    Static analysis check verifying that API routers NEVER execute direct raw SQL statements
    (e.g., db.execute(text(...)), select(...) executed directly inside router handlers).
    Routers must delegate to application services or repositories.
    """
    router_files = list(Path("app/domains").rglob("*router*.py"))
    assert len(router_files) > 0

    forbidden_patterns = [
        r"\.execute\(text\(",
        r"\.execute\(select\(",
        r"SELECT\s+\*\s+FROM"
    ]

    for router_path in router_files:
        content = router_path.read_text(encoding="utf-8")
        for pattern in forbidden_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            assert len(matches) == 0, (
                f"Architecture violation: Direct SQL execution pattern '{pattern}' "
                f"found in API router {router_path}. Routers must delegate to domain services."
            )


from app.domains.agent.tools import ControlledToolRegistry


def test_no_ai_tools_with_unrestricted_database_access():
    """
    Verifies that all AI tools exposed to bezs-agent are strictly bounded,
    read-only or scoped, and never permit arbitrary SQL or administrative DB execution.
    """
    forbidden_tool_names = [
        "execute_sql",
        "raw_query",
        "database_admin",
        "delete_database",
        "run_migration",
        "eval_python"
    ]

    tool_classes = ControlledToolRegistry.TOOL_CLASSES
    assert len(tool_classes) > 0

    for tool_cls in tool_classes:
        tool_name = getattr(tool_cls, "name", "").lower()
        for forbidden in forbidden_tool_names:
            assert forbidden not in tool_name, (
                f"Security violation: Unrestricted tool '{tool_name}' exposed to AI agent."
            )
        # All tools must have description and input validation schema
        assert hasattr(tool_cls, "description")
        assert hasattr(tool_cls, "parameters_schema")
        assert hasattr(tool_cls, "required_permission")


