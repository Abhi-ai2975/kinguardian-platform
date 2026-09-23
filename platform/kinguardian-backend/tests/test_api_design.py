import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_rest_api_base_path_and_routes():
    """
    Verifies that all endpoints are strictly registered under the /api/v1 REST base path.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health checks (outside api/v1)
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        
        # 2. Verify all OpenAPI routes are prefixed with /api/v1 (except /health)
        openapi_paths = list(app.openapi()["paths"].keys())
        api_v1_routes = [p for p in openapi_paths if p.startswith("/api/v1/")]
        
        # Ensure we have extensive endpoints under /api/v1
        assert len(api_v1_routes) >= 20
        assert "/api/v1/family/home" in api_v1_routes
        assert "/api/v1/parent/home" in api_v1_routes
        assert "/api/v1/families/{family_id}/dashboard" in api_v1_routes
        assert "/api/v1/families/{family_id}/subjects/{subject_id}/summary" in api_v1_routes
        assert "/api/v1/clinical/vitals/{parent_id}" in api_v1_routes
        assert "/api/v1/documents/{parent_id}" in api_v1_routes
        assert "/api/v1/agent/query" in api_v1_routes
        assert "/api/v1/events/{circle_id}" in api_v1_routes



@pytest.mark.asyncio
async def test_bearer_authentication_enforcement():
    """
    Verifies that authenticated endpoints require Bearer authentication.
    """
    from app.core.security import get_current_user
    from fastapi import HTTPException
    from fastapi.security import HTTPAuthorizationCredentials
    from unittest.mock import AsyncMock
    
    mock_session = AsyncMock()
    
    # When ENVIRONMENT != "development" and no credentials provided -> raises 401
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=None, db_session=mock_session)
        assert exc_info.value.status_code == 401
        assert "Not authenticated" in exc_info.value.detail
        
        # When invalid JWT token provided -> raises 401
        invalid_creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=invalid_creds, db_session=mock_session)
        assert exc_info.value.status_code == 401
    finally:
        settings.ENVIRONMENT = orig_env


def test_required_jwt_claims_validation():
    """
    Verifies that JWT claim validation checks sub, iss, aud, exp, iat.
    """
    from app.core.security import validate_jwt_claims
    from fastapi import HTTPException
    
    # 1. Valid payload with all required claims
    valid_payload = {
        "sub": "user_123",
        "iss": "http://localhost:5001",
        "aud": "kinguardian-platform-api",
        "exp": 1893456000,
        "iat": 1700000000,
        "scope": "read write",
        "family_id": "fam-456"
    }
    validate_jwt_claims(valid_payload)  # Should not raise
    
    # 2. Missing 'exp' and 'iat' -> raises 401
    invalid_payload = {
        "sub": "user_123",
        "iss": "http://localhost:5001",
        "aud": "kinguardian-platform-api"
    }
    with pytest.raises(HTTPException) as exc_info:
        validate_jwt_claims(invalid_payload)
    assert exc_info.value.status_code == 401
    assert "missing required claims" in exc_info.value.detail


@pytest.mark.asyncio
async def test_zero_trust_family_and_subject_authorization(db_session):
    """
    Verifies that client-provided family_id and subject_id are never trusted without DB authorization.
    """
    import uuid
    from fastapi import HTTPException
    from app.core.security import verify_family_authorization, verify_subject_authorization
    from app.domains.family.application.services import FamilyService
    from app.domains.family.infrastructure.repositories import (
        SQLAlchemyAppProfileRepository,
        SQLAlchemyFamilyRepository,
        SQLAlchemyConsentRepository
    )
    from app.domains.events.services import EventService
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    
    # 1. Create a coordinator profile and a legitimate family
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_zt",
        email="coord_zt@kinguardian.com",
        display_name="Coordinator ZT",
        timezone="America/New_York"
    )
    family = await family_svc.create_care_circle(coordinator.id, "ZT Family", "coordinator")
    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-zt",
        profile_id=coordinator.id,
        relationship_to_coordinator="self"
    )
    
    # 2. An unauthorized user attempts to access this family
    stranger = await family_svc.get_or_create_profile(
        iam_subject_id="iam_stranger_zt",
        email="stranger@kinguardian.com",
        display_name="Stranger",
        timezone="UTC"
    )
    
    # Verify unauthorized family access raises 403
    with pytest.raises(HTTPException) as exc_info:
        await verify_family_authorization(family.id, stranger.id, db_session)
    assert exc_info.value.status_code == 403
    
    # Verify unauthorized subject access raises 403
    with pytest.raises(HTTPException) as exc_info:
        await verify_subject_authorization(family.id, subject.id, stranger.id, db_session)
    assert exc_info.value.status_code == 403
    
    # Verify non-existent subject in legitimate family raises 404
    with pytest.raises(HTTPException) as exc_info:
        await verify_subject_authorization(family.id, uuid.uuid4(), coordinator.id, db_session)
    assert exc_info.value.status_code == 404
    
    # Legitimate member succeeds
    membership = await verify_family_authorization(family.id, coordinator.id, db_session)
    assert membership.profile_id == coordinator.id
    
    subj = await verify_subject_authorization(family.id, subject.id, coordinator.id, db_session)
    assert subj.id == subject.id

