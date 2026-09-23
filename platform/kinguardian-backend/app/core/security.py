"""
================================================================================
KinGuardian Core Security & Zero-Trust Authentication Module
================================================================================
Architecture & Rationale:
-------------------------
1. Identity Delegation (bezs-iam):
   KinGuardian delegates identity provisioning, credential hashing, and multi-factor
   authentication to the external IAM platform (`bezs-iam`).
   KinGuardian acts as a zero-trust resource server that consumes cryptographically
   signed Bearer JWT tokens.

2. Zero-Trust Local Profile Hydration:
   Upon receiving a valid JWT, KinGuardian extracts the immutable subject identifier (`sub`),
   validates standard OIDC claims (iss, aud, exp, iat), and hydrates or associates
   an internal `AppProfile` record. This separates auth identity from clinical care metadata.

3. Role-Based & Tenant-Scoped Access Control (RBAC):
   Authorization is strictly enforced server-side. FastAPI dependencies (`get_current_user`,
   `require_coordinator_role`, `verify_care_circle_membership`) inspect family circle
   memberships and explicit Granular Consents before any domain handler executes.
================================================================================
"""


import uuid
from typing import Optional, List, Dict, Any, Set
from datetime import datetime, timezone, timedelta
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.domains.family.infrastructure.models import AppProfile, FamilyMembership, CareSubject, CareRelationship
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.family.application.services import FamilyService
from app.domains.family.application.permissions import PermissionVerifier

logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)

# Required standard claims mandated by bezs-iam OpenID Connect specification
REQUIRED_JWT_CLAIMS: Set[str] = {"sub", "iss", "aud", "exp", "iat"}


def build_family_service(session: AsyncSession) -> FamilyService:
    """
    Factory function to construct a fully wired FamilyService instance
    bound to the current transactional database session.

    Args:
        session: Active SQLAlchemy AsyncSession.

    Returns:
        FamilyService: Domain orchestrator for care circles and memberships.
    """
    from app.domains.events.services import EventService
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


def validate_jwt_claims(payload: Dict[str, Any]) -> None:
    """
    Validates that the decoded JWT contains all required IAM claims:
    sub, iss, aud, exp, iat, and verifies expiry and issuer.
    """

    missing_claims = [claim for claim in REQUIRED_JWT_CLAIMS if claim not in payload]
    if missing_claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT token missing required claims: {', '.join(missing_claims)}"
        )

    # Expiry validation
    exp = payload.get("exp")
    if exp is not None:
        now_ts = datetime.now(timezone.utc).timestamp()
        if exp < now_ts:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="JWT token has expired."
            )

    # Issuer validation
    iss = payload.get("iss")
    if iss and settings.IAM_ISSUER and iss != settings.IAM_ISSUER:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token issuer '{iss}'."
        )



async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db_session: AsyncSession = Depends(get_db)
) -> AppProfile:
    """
    Authenticates requests via bezs-iam JWT Bearer tokens.
    Validates token signatures via IAM JWKS endpoint and verifies required claims.
    """
    if not credentials:
        if settings.ENVIRONMENT == "development":
            # Return Anjali (primary coordinator) for local dev and Swagger verification
            service = build_family_service(db_session)
            mock_profile_entity = await service.get_or_create_profile(
                iam_subject_id="iam_anjali_london_001",
                email="anjali.coordinator@example.com",
                display_name="Anjali",
                timezone="Europe/London"
            )
            profile = await db_session.get(AppProfile, mock_profile_entity.id)
            return profile
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated. Bearer token is required."
            )

    token = credentials.credentials
    try:
        if settings.ENVIRONMENT == "development" and not settings.IAM_JWKS_URL:
            payload = jwt.decode(token, options={"verify_signature": False})
        else:
            jwks_client = jwt.PyJWKClient(settings.IAM_JWKS_URL)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.IAM_AUDIENCE,
                issuer=settings.IAM_ISSUER
            )

    except Exception as e:
        logger.warning(f"JWT signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or signature"
        )

    # Validate required claims in non-development or when strict claims present
    if settings.ENVIRONMENT != "development":
        validate_jwt_claims(payload)

    sub = payload.get("sub")
    email = payload.get("email")
    if not sub:
        sub = email
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject claim"
        )

    service = build_family_service(db_session)
    timezone = payload.get("timezone", "UTC")
    display_name = payload.get("name", email.split("@")[0].capitalize() if email else "User")
    profile_entity = await service.get_or_create_profile(
        iam_subject_id=sub,
        email=email or f"{sub}@iam.kinguardian.com",
        display_name=display_name,
        timezone=timezone
    )
    
    profile = await db_session.get(AppProfile, profile_entity.id)
    return profile


async def verify_family_authorization(
    family_id: uuid.UUID,
    caller_profile_id: uuid.UUID,
    session: AsyncSession
) -> FamilyMembership:
    """
    Never trust family_id from the client without verifying the caller's membership.
    """
    res = await session.execute(
        select(FamilyMembership).where(
            FamilyMembership.family_id == family_id,
            FamilyMembership.profile_id == caller_profile_id
        )
    )
    membership = res.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Profile {caller_profile_id} is not an authorized member of Family {family_id}."
        )
    return membership


async def verify_subject_authorization(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    caller_profile_id: uuid.UUID,
    session: AsyncSession
) -> CareSubject:
    """
    Never trust subject_id from the client without verifying membership and subject existence in that family.
    """
    await verify_family_authorization(family_id, caller_profile_id, session)

    res = await session.execute(
        select(CareSubject).where(
            CareSubject.id == subject_id,
            CareSubject.family_id == family_id
        )
    )
    subject = res.scalar_one_or_none()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Care Subject {subject_id} not found in Family {family_id}."
        )
    return subject





def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=60)
    to_encode.update({"exp": expire.timestamp(), "iat": now.timestamp()})
    secret = settings.JWT_SECRET_KEY.get_secret_value() if hasattr(settings.JWT_SECRET_KEY, "get_secret_value") else str(settings.JWT_SECRET_KEY)
    return jwt.encode(to_encode, secret, algorithm="HS256")


def verify_token(token: str) -> Dict[str, Any]:
    try:
        secret = settings.JWT_SECRET_KEY.get_secret_value() if hasattr(settings.JWT_SECRET_KEY, "get_secret_value") else str(settings.JWT_SECRET_KEY)
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {e}"
        )


decode_access_token = verify_token



