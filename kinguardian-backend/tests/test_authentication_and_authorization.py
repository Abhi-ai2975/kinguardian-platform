"""Comprehensive tests for Authentication and Authorization in KinGuardian."""
import uuid
from datetime import UTC, datetime, timedelta
import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.db import Base, get_session
from app.main import app
from app.models import AuditLog, CareGrant, CareSubject, Family, Membership, Profile
from app.security import create_access_token, decode_token, hash_password, verify_password


@pytest_asyncio.fixture
async def client_and_sessions():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_session():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, sessions
    app.dependency_overrides.clear()
    await engine.dispose()


def test_password_hashing_and_verification():
    raw = "SuperSecret123!"
    hashed = hash_password(raw)
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(raw, None) is False
    assert verify_password(raw, "invalid_format") is False


def test_jwt_token_generation_and_decoding():
    data = {"sub": "user_123", "email": "user@example.com", "role": "coordinator"}
    access_token = create_access_token(data)
    decoded = decode_token(access_token, expected_type="access")
    assert decoded["sub"] == "user_123"
    assert decoded["email"] == "user@example.com"
    assert decoded["role"] == "coordinator"
    assert decoded["type"] == "access"

    with pytest.raises(Exception):
        decode_token("tampered.token.here", expected_type="access")


@pytest.mark.asyncio
async def test_register_user_creates_profile_and_returns_tokens(client_and_sessions):
    client, sessions = client_and_sessions
    payload = {
        "email": "priya.coordinator@kinguardian.com",
        "password": "Password123!",
        "name": "Priya Sharma",
        "timezone": "Asia/Kolkata",
        "role": "coordinator",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "priya.coordinator@kinguardian.com"
    assert data["user"]["display_name"] == "Priya Sharma"
    assert data["user"]["role"] == "coordinator"
    assert "password_hash" not in data["user"]

    # Verify stored in DB
    async with sessions() as session:
        profile = (await session.execute(
            select(Profile).where(Profile.email == "priya.coordinator@kinguardian.com")
        )).scalar_one_or_none()
        assert profile is not None
        assert profile.display_name == "Priya Sharma"
        assert verify_password("Password123!", profile.password_hash) is True

        audit = (await session.execute(
            select(AuditLog).where(AuditLog.action == "auth.registered.v1")
        )).scalar_one_or_none()
        assert audit is not None


@pytest.mark.asyncio
async def test_duplicate_registration_returns_409(client_and_sessions):
    client, _ = client_and_sessions
    payload = {
        "email": "duplicate@kinguardian.com",
        "password": "Password123!",
        "name": "Duplicate User",
    }
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    assert "already registered" in r2.json()["detail"]


@pytest.mark.asyncio
async def test_login_with_valid_and_invalid_credentials(client_and_sessions):
    client, _ = client_and_sessions
    reg_payload = {
        "email": "login_test@kinguardian.com",
        "password": "SecretPassword123",
        "name": "Login Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Valid login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "login_test@kinguardian.com",
        "password": "SecretPassword123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
    assert login_res.json()["user"]["email"] == "login_test@kinguardian.com"

    # Invalid password
    bad_res = await client.post("/api/v1/auth/login", json={
        "email": "login_test@kinguardian.com",
        "password": "WrongPassword"
    })
    assert bad_res.status_code == 401

    # Non-existent user
    not_found = await client.post("/api/v1/auth/login", json={
        "email": "nobody@kinguardian.com",
        "password": "WrongPassword"
    })
    assert not_found.status_code == 401


@pytest.mark.asyncio
async def test_bearer_token_authenticates_protected_endpoints(client_and_sessions):
    client, _ = client_and_sessions
    # Register coordinator
    reg = await client.post("/api/v1/auth/register", json={
        "email": "bearer_coord@kinguardian.com",
        "password": "Password123!",
        "name": "Bearer Coord",
        "role": "coordinator"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access /auth/me
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["profile"]["email"] == "bearer_coord@kinguardian.com"

    # Create family with Bearer token
    family_res = await client.post("/api/v1/families", headers=headers, json={
        "name": "Bearer Test Family",
        "home_timezone": "Asia/Kolkata"
    })
    assert family_res.status_code == 201
    family_id = family_res.json()["id"]

    # List families with Bearer token
    fam_list = await client.get("/api/v1/families", headers=headers)
    assert fam_list.status_code == 200
    assert len(fam_list.json()) == 1
    assert fam_list.json()[0]["id"] == family_id


@pytest.mark.asyncio
async def test_token_refresh(client_and_sessions):
    client, _ = client_and_sessions
    reg = await client.post("/api/v1/auth/register", json={
        "email": "refresh_user@kinguardian.com",
        "password": "Password123!",
        "name": "Refresh User"
    })
    refresh_token = reg.json()["refresh_token"]

    # Exchange refresh token
    refresh_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    new_access_token = refresh_res.json()["access_token"]
    assert new_access_token

    # Verify new token works on protected route
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["profile"]["email"] == "refresh_user@kinguardian.com"


@pytest.mark.asyncio
async def test_change_password(client_and_sessions):
    client, _ = client_and_sessions
    reg = await client.post("/api/v1/auth/register", json={
        "email": "change_pwd@kinguardian.com",
        "password": "OldPassword123",
        "name": "Change Pwd User"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong old password
    fail_res = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "WrongPassword",
        "new_password": "NewPassword456!"
    })
    assert fail_res.status_code == 400

    # Correct old password
    ok_res = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "OldPassword123",
        "new_password": "NewPassword456!"
    })
    assert ok_res.status_code == 200

    # Login with new password
    login_new = await client.post("/api/v1/auth/login", json={
        "email": "change_pwd@kinguardian.com",
        "password": "NewPassword456!"
    })
    assert login_new.status_code == 200

    # Login with old password fails
    login_old = await client.post("/api/v1/auth/login", json={
        "email": "change_pwd@kinguardian.com",
        "password": "OldPassword123"
    })
    assert login_old.status_code == 401


@pytest.mark.asyncio
async def test_rbac_member_role_updates_and_removal(client_and_sessions):
    client, sessions = client_and_sessions
    # Register coordinator and caregiver
    coord_reg = await client.post("/api/v1/auth/register", json={
        "email": "coord@rbac.com",
        "password": "Password123!",
        "name": "Coordinator User",
        "role": "coordinator"
    })
    coord_token = coord_reg.json()["access_token"]
    coord_headers = {"Authorization": f"Bearer {coord_token}"}

    cg_reg = await client.post("/api/v1/auth/register", json={
        "email": "cg@rbac.com",
        "password": "Password123!",
        "name": "Caregiver User",
        "role": "caregiver"
    })
    cg_token = cg_reg.json()["access_token"]
    cg_id = cg_reg.json()["user"]["id"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Coordinator creates family
    fam_res = await client.post("/api/v1/families", headers=coord_headers, json={"name": "RBAC Family"})
    fam_id = fam_res.json()["id"]

    # Coordinator adds caregiver as member
    add_m = await client.post(f"/api/v1/families/{fam_id}/members", headers=coord_headers, json={
        "profile_id": cg_id,
        "role": "caregiver"
    })
    assert add_m.status_code == 201

    # List members
    members = await client.get(f"/api/v1/families/{fam_id}/members", headers=coord_headers)
    assert members.status_code == 200
    assert len(members.json()) == 2

    # Coordinator updates caregiver role to observer
    patch_res = await client.patch(f"/api/v1/families/{fam_id}/members/{cg_id}", headers=coord_headers, json={
        "role": "observer"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["role"] == "observer"

    # Caregiver (now observer) tries to update coordinator's role -> 403 Forbidden
    coord_id = coord_reg.json()["user"]["id"]
    forbidden_patch = await client.patch(f"/api/v1/families/{fam_id}/members/{coord_id}", headers=cg_headers, json={
        "role": "observer"
    })
    assert forbidden_patch.status_code == 403

    # Coordinator removes caregiver from family
    del_res = await client.delete(f"/api/v1/families/{fam_id}/members/{cg_id}", headers=coord_headers)
    assert del_res.status_code == 200

    # Coordinator cannot remove self if only coordinator
    self_del = await client.delete(f"/api/v1/families/{fam_id}/members/{coord_id}", headers=coord_headers)
    assert self_del.status_code == 400


@pytest.mark.asyncio
async def test_access_grant_listing_and_revocation(client_and_sessions):
    client, _ = client_and_sessions
    # Setup coordinator, caregiver, parent
    coord = (await client.post("/api/v1/auth/register", json={
        "email": "c_grant@kinguardian.com",
        "password": "Password123!",
        "name": "Coordinator",
        "role": "coordinator"
    })).json()
    coord_headers = {"Authorization": f"Bearer {coord['access_token']}"}

    cg = (await client.post("/api/v1/auth/register", json={
        "email": "cg_grant@kinguardian.com",
        "password": "Password123!",
        "name": "Caregiver",
        "role": "caregiver"
    })).json()
    cg_headers = {"Authorization": f"Bearer {cg['access_token']}"}

    # Coordinator creates family and subject
    fam_id = (await client.post("/api/v1/families", headers=coord_headers, json={"name": "Grant Family"})).json()["id"]
    await client.post(f"/api/v1/families/{fam_id}/members", headers=coord_headers, json={"profile_id": cg["user"]["id"], "role": "caregiver"})
    subject_id = (await client.post(f"/api/v1/families/{fam_id}/subjects", headers=coord_headers, json={"preferred_timezone": "Asia/Kolkata"})).json()["id"]

    # Before grant: Caregiver cannot log check-in -> 403
    fail_checkin = await client.post("/api/v1/check-ins", headers=cg_headers, json={
        "family_id": fam_id,
        "subject_id": subject_id,
        "occurred_at": "2026-09-04T10:00:00+05:30",
        "mood": "good",
        "severity": "normal"
    })
    assert fail_checkin.status_code == 403

    # Coordinator grants 'checkins' scope to caregiver
    grant_res = await client.post(f"/api/v1/families/{fam_id}/subjects/{subject_id}/access-grants", headers=coord_headers, json={
        "profile_id": cg["user"]["id"],
        "scopes": ["checkins"]
    })
    assert grant_res.status_code == 201
    grant_id = grant_res.json()["id"]

    # Caregiver can now log check-in -> 201
    ok_checkin = await client.post("/api/v1/check-ins", headers=cg_headers, json={
        "family_id": fam_id,
        "subject_id": subject_id,
        "occurred_at": "2026-09-04T10:00:00+05:30",
        "mood": "good",
        "severity": "normal"
    })
    assert ok_checkin.status_code == 201

    # List grants
    grants_list = await client.get(f"/api/v1/families/{fam_id}/subjects/{subject_id}/access-grants", headers=coord_headers)
    assert grants_list.status_code == 200
    assert len(grants_list.json()) == 1

    # Revoke grant
    revoke_res = await client.delete(f"/api/v1/families/{fam_id}/subjects/{subject_id}/access-grants/{grant_id}", headers=coord_headers)
    assert revoke_res.status_code == 200

    # Caregiver can NO LONGER log check-in -> 403
    revoked_checkin = await client.post("/api/v1/check-ins", headers=cg_headers, json={
        "family_id": fam_id,
        "subject_id": subject_id,
        "occurred_at": "2026-09-04T11:00:00+05:30",
        "mood": "tired",
        "severity": "normal"
    })
    assert revoked_checkin.status_code == 403


@pytest.mark.asyncio
async def test_auth_me_and_token_response_include_roles_and_permissions(client_and_sessions):
    client, _ = client_and_sessions
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "permissions.test@kinguardian.com",
        "password": "Password123!",
        "name": "Permissions Tester",
        "role": "coordinator"
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "role" in data
    assert data["role"] == "coordinator"
    assert "permissions" in data
    assert "care:manage" in data["permissions"]
    assert "checkins:read" in data["permissions"]

    token = data["access_token"]
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] == "coordinator"
    assert "permissions" in me_data
    assert "care:manage" in me_data["permissions"]


@pytest.mark.asyncio
async def test_iam_token_exchange(client_and_sessions):
    client, _ = client_and_sessions
    # Generate a local token representing an IAM token
    raw_token = create_access_token({
        "sub": "iam_user_ext_456",
        "email": "iam.doctor@kinguardian.com",
        "name": "Dr. Ramesh IAM",
        "role": "coordinator",
        "permissions": ["patient:read", "encounter:create"]
    })

    res = await client.post("/api/v1/auth/iam-token", json={"token": raw_token})
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == "iam.doctor@kinguardian.com"
    assert data["user"]["display_name"] == "Dr. Ramesh IAM"
    assert data["role"] == "coordinator"
    assert "patient:read" in data["permissions"]
    assert "care:manage" in data["permissions"]

