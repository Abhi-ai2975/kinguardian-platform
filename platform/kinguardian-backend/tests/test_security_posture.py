import pytest
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from fastapi import HTTPException

from app.main import app
from app.core.config import settings
from app.core.security import validate_jwt_claims, get_current_user
from app.core.logging import sanitize_value, SENSITIVE_PATTERNS
from app.core.rate_limit import InMemoryRateLimiter
from app.domains.agent.tools import ControlledToolRegistry
from app.domains.agent.mcp.server import KinGuardianEMRMCPBridge
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService


def test_no_sensitive_data_in_logs_redaction():
    """
    Verifies that sanitize_value redacts bearer tokens, passwords, API keys, and SSNs from logs.
    """
    raw_log = "User logged in with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123 password=MySecretPass123"
    sanitized = sanitize_value(raw_log)

    assert "[REDACTED_TOKEN]" in sanitized
    assert "token123" not in sanitized
    assert "[REDACTED_PASSWORD]" in sanitized
    assert "MySecretPass123" not in sanitized

    # Dict payload redaction
    payload = {
        "user": "dr_smith",
        "password": "super_secret_password",
        "api_key": "live_key_998877",
        "patient_note": "Patient observed with blood pressure 120/80"
    }
    sanitized_dict = sanitize_value(payload)
    assert sanitized_dict["password"] == "[REDACTED]"
    assert sanitized_dict["api_key"] == "[REDACTED]"
    assert sanitized_dict["user"] == "dr_smith"


def test_jwt_validation_and_required_claims():
    """
    Verifies strict validation of required JWT claims (sub, iss, aud, exp, iat).
    """
    # 1. Valid payload
    valid_payload = {
        "sub": "user_123",
        "iss": settings.IAM_ISSUER,
        "aud": "kinguardian-platform-api",
        "exp": 1999999999,
        "iat": 1700000000
    }
    validate_jwt_claims(valid_payload)  # Should not raise

    # 2. Missing 'exp' and 'aud' claims
    invalid_payload = {
        "sub": "user_123",
        "iss": settings.IAM_ISSUER
    }
    with pytest.raises(HTTPException) as exc:
        validate_jwt_claims(invalid_payload)
    assert exc.value.status_code == 401
    assert "missing required claims" in exc.value.detail


def test_rate_limiter_enforcement():
    """
    Verifies sliding-window rate limiter blocks excessive requests with 429 and Retry-After.
    """
    limiter = InMemoryRateLimiter(requests_per_minute=3)
    client_id = "192.168.1.50"

    # First 3 requests allowed
    assert limiter.is_allowed(client_id)[0] is True
    assert limiter.is_allowed(client_id)[0] is True
    assert limiter.is_allowed(client_id)[0] is True

    # 4th request blocked
    allowed, retry_after = limiter.is_allowed(client_id)
    assert allowed is False
    assert retry_after > 0


@pytest.mark.asyncio
async def test_no_unrestricted_ai_tool_access_and_mcp_raw_sql_block(db_session):
    """
    Verifies that raw SQL operations are blocked in MCP and AI domain tools enforce least privilege.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)

    mcp_bridge = KinGuardianEMRMCPBridge(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # 1. Raw SQL must be strictly blocked with MCP error response
    from app.domains.agent.mcp.server import MCPToolCallRequest
    res = await mcp_bridge.execute_mcp_tool(
        actor_id=uuid.uuid4(),
        request=MCPToolCallRequest(
            name="execute_sql",
            arguments={"query": "SELECT * FROM app_profiles;"},
            family_id=uuid.uuid4()
        )
    )
    assert res.success is False
    assert res.is_error is True
    assert "Security Policy Violation" in res.error




    # 2. Controlled tool registry enforces circle membership
    from app.domains.agent.tools import AgentToolContext
    registry = ControlledToolRegistry(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )
    caller_id = uuid.uuid4()
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # Caller not in family -> Authorization Denied in result
    res_tool = await registry.execute_tool(
        name="get_medications",
        params={"subject_id": str(subject_id)},
        context=AgentToolContext(
            actor_id=caller_id,
            family_id=family_id,
            subject_id=subject_id
        )
    )
    assert res_tool.success is False
    assert "Authorization Denied" in res_tool.error





@pytest.mark.asyncio
async def test_security_headers_and_request_id_in_responses(db_session):
    """
    Verifies defense-in-depth: Security Headers (HSTS, nosniff, DENY) and X-Request-ID on HTTP responses.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    user = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_sec_headers",
        email="sec_user@kinguardian.com",
        display_name="Sec User"
    )

    app_profile = await db_session.get(AppProfile, user.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/i18n/languages")
            assert resp.status_code == 200

            # Verify Security Headers
            assert "X-Request-ID" in resp.headers
            assert resp.headers["X-Content-Type-Options"] == "nosniff"
            assert resp.headers["X-Frame-Options"] == "DENY"
            assert "Strict-Transport-Security" in resp.headers
    finally:
        app.dependency_overrides.clear()
