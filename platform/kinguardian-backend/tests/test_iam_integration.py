"""
IAM Integration & Security Authorization Test Suite (Phase 4).

Validates:
1. Stateless JWT validation against bezs-iam claims (sub, iss, aud, exp, iat).
2. Profile lookup & JIT user provisioning from IAM tokens.
3. Current-user dependency resolution.
4. Family membership authorization gatekeeping (HTTP 403 on non-members).
5. Fine-grained RBAC permission evaluation & consent checking.
"""

import pytest
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.security import (
    get_current_user,
    validate_jwt_claims,
    verify_family_authorization,
    verify_subject_authorization,
    create_access_token
)
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    Consent
)
from app.domains.family.application.permissions import (
    PermissionVerifier,
    CAP_VIEW_MEDICATIONS,
    CAP_ASSIGN_CARE_TASKS,
    CAP_CONFIRM_ADHERENCE,
    CAP_VIEW_BASIC
)


def test_jwt_claims_validation():
    """
    Verifies that JWT claim validation strictly checks for sub, iss, aud, exp, iat,
    and rejects expired tokens or missing mandatory claims.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Valid Claims
    valid_payload = {
        "sub": "iam_user_123",
        "iss": settings.IAM_ISSUER or "https://iam.kinguardian.com",
        "aud": settings.IAM_AUDIENCE or "kinguardian-api",
        "exp": (now + timedelta(hours=1)).timestamp(),
        "iat": now.timestamp(),
        "email": "user@example.com"
    }
    # Should not raise exception
    validate_jwt_claims(valid_payload)

    # 2. Missing 'sub' claim
    missing_sub = valid_payload.copy()
    del missing_sub["sub"]
    with pytest.raises(HTTPException) as exc_info:
        validate_jwt_claims(missing_sub)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "missing required claims" in exc_info.value.detail

    # 3. Expired token
    expired_payload = valid_payload.copy()
    expired_payload["exp"] = (now - timedelta(seconds=10)).timestamp()
    with pytest.raises(HTTPException) as exc_info:
        validate_jwt_claims(expired_payload)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_profile_lookup_and_provisioning(db_session):
    """
    Verifies get_current_user extracts IAM claims, looks up or JIT provisions AppProfile.
    """
    now = datetime.now(timezone.utc)
    unique_sub = f"iam_subj_{uuid.uuid4().hex[:8]}"
    unique_email = f"{unique_sub}@example.com"

    token_payload = {
        "sub": unique_sub,
        "email": unique_email,
        "name": "Integration User",
        "timezone": "Asia/Kolkata",
        "iss": settings.IAM_ISSUER or "https://iam.kinguardian.com",
        "aud": settings.IAM_AUDIENCE or "kinguardian-api",
        "exp": (now + timedelta(hours=1)).timestamp(),
        "iat": now.timestamp()
    }
    raw_token = create_access_token(token_payload)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=raw_token)

    # Resolve current user dependency
    current_user = await get_current_user(credentials=credentials, db_session=db_session)
    assert current_user is not None
    assert current_user.iam_subject_id == unique_sub
    assert current_user.email == unique_email
    assert current_user.display_name == "Integration User"
    assert current_user.timezone == "Asia/Kolkata"


@pytest.mark.asyncio
async def test_family_membership_authorization(db_session):
    """
    Verifies verify_family_authorization prevents unauthorized cross-family access.
    """
    # 1. Create a user and a family
    profile = AppProfile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"user_{uuid.uuid4().hex[:6]}@test.com",
        timezone="UTC",
        status="active"
    )
    db_session.add(profile)
    await db_session.flush()

    family = Family(name="Test Family", primary_coordinator_profile_id=profile.id)
    db_session.add(family)
    await db_session.flush()

    # 2. Add as coordinator member
    membership = FamilyMembership(
        family_id=family.id,
        profile_id=profile.id,
        membership_role="coordinator",
        status="active"
    )
    db_session.add(membership)
    await db_session.commit()

    # 3. Authorized caller should succeed
    verified_membership = await verify_family_authorization(family.id, profile.id, db_session)
    assert verified_membership.membership_role == "coordinator"

    # 4. Unauthorized outsider should fail with HTTP 403 Forbidden
    outsider_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        await verify_family_authorization(family.id, outsider_id, db_session)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_permission_evaluator_rbac(db_session):
    """
    Verifies fine-grained permission evaluator on coordinator vs caregiver vs observer roles.
    """
    verifier = PermissionVerifier(db_session)

    # 1. Role capability checks
    assert verifier.role_has_capability("coordinator", CAP_ASSIGN_CARE_TASKS) is True
    assert verifier.role_has_capability("coordinator", CAP_VIEW_MEDICATIONS) is True
    assert verifier.role_has_capability("caregiver", CAP_CONFIRM_ADHERENCE) is True
    assert verifier.role_has_capability("caregiver", CAP_ASSIGN_CARE_TASKS) is False
    assert verifier.role_has_capability("observer", CAP_VIEW_BASIC) is True
    assert verifier.role_has_capability("observer", CAP_VIEW_MEDICATIONS) is False
