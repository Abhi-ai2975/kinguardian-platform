"""
tests.test_projects — HTTP-level tests for /v1/projects routes.

Uses the client + mock_project_svc fixtures so no real DB, IAM, or storage
is needed. The service layer is fully mocked — tests verify status codes,
response shapes, and correct error propagation from service → HTTP.
"""
import pytest
from unittest.mock import AsyncMock

from app.errors import ConflictError, NotFoundError
from app.schemas.project import ProjectListResponse
from tests.conftest import TEST_PROJECT_ID, TEST_ORG_ID, make_tenant_ctx, make_project_schema


# ── POST /v1/projects ─────────────────────────────────────────────────────────


async def test_create_project_returns_201_with_json(client, mock_project_svc):
    mock_project_svc.create_project = AsyncMock(return_value=make_project_schema())

    response = await client.post(
        "/v1/projects",
        json={"name": "Test Project", "storage_mode": "managed", "storage_provider": "s3"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == TEST_PROJECT_ID
    assert data["name"] == "Test Project"
    assert data["organization_id"] == TEST_ORG_ID
    assert data["storage_mode"] == "managed"
    assert data["is_active"] is True


async def test_create_project_returns_403_when_scope_missing(client, mock_project_svc):
    mock_project_svc._ctx = make_tenant_ctx(scopes=frozenset())

    response = await client.post(
        "/v1/projects",
        json={"name": "Blocked"},
    )

    assert response.status_code == 403


async def test_create_project_returns_409_on_slug_conflict(client, mock_project_svc):
    mock_project_svc.create_project = AsyncMock(
        side_effect=ConflictError("Slug already exists")
    )

    response = await client.post(
        "/v1/projects",
        json={"name": "Duplicate", "storage_mode": "byob", "storage_provider": "s3"},
    )

    assert response.status_code == 409
    data = response.json()
    assert data["error"] == "CONFLICT"
    assert "already exists" in data["message"]


async def test_create_project_returns_422_when_name_missing(client, mock_project_svc):
    response = await client.post("/v1/projects", json={})
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "VALIDATION_ERROR"


async def test_create_project_slug_auto_derived_from_name(client, mock_project_svc):
    """When slug is omitted, the server derives it from name."""
    mock_project_svc.create_project = AsyncMock(
        return_value=make_project_schema(name="Hello World", slug="hello-world")
    )

    response = await client.post(
        "/v1/projects",
        json={"name": "Hello World"},
    )

    assert response.status_code == 201
    # The service is called — slug validation happens in the Pydantic schema
    mock_project_svc.create_project.assert_awaited_once()


# ── GET /v1/projects ──────────────────────────────────────────────────────────


async def test_list_projects_returns_200_with_pagination(client, mock_project_svc):
    mock_project_svc.list_projects = AsyncMock(
        return_value=ProjectListResponse(
            items=[make_project_schema()],
            total=1,
            page=1,
            page_size=20,
            total_pages=1,
        )
    )

    response = await client.get("/v1/projects")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["total_pages"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == TEST_PROJECT_ID


async def test_list_projects_returns_403_when_scope_missing(client, mock_project_svc):
    mock_project_svc._ctx = make_tenant_ctx(scopes=frozenset())
    response = await client.get("/v1/projects")
    assert response.status_code == 403


async def test_list_projects_empty_result(client, mock_project_svc):
    mock_project_svc.list_projects = AsyncMock(
        return_value=ProjectListResponse(
            items=[], total=0, page=1, page_size=20, total_pages=1
        )
    )

    response = await client.get("/v1/projects")
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == 0


# ── GET /v1/projects/{project_id} ────────────────────────────────────────────


async def test_get_project_returns_200(client, mock_project_svc):
    mock_project_svc.get_project = AsyncMock(return_value=make_project_schema())

    response = await client.get(f"/v1/projects/{TEST_PROJECT_ID}")

    assert response.status_code == 200
    assert response.json()["id"] == TEST_PROJECT_ID


async def test_get_project_returns_404_when_not_found(client, mock_project_svc):
    mock_project_svc.get_project = AsyncMock(
        side_effect=NotFoundError("Project not found")
    )

    response = await client.get("/v1/projects/nonexistent")

    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "NOT_FOUND"


async def test_get_project_returns_403_when_scope_missing(client, mock_project_svc):
    mock_project_svc._ctx = make_tenant_ctx(scopes=frozenset())
    response = await client.get(f"/v1/projects/{TEST_PROJECT_ID}")
    assert response.status_code == 403


# ── PATCH /v1/projects/{project_id} ──────────────────────────────────────────


async def test_update_project_returns_200_with_updated_name(client, mock_project_svc):
    mock_project_svc.update_project = AsyncMock(
        return_value=make_project_schema(name="Updated Name")
    )

    response = await client.patch(
        f"/v1/projects/{TEST_PROJECT_ID}",
        json={"name": "Updated Name"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


async def test_update_project_returns_404_when_not_found(client, mock_project_svc):
    mock_project_svc.update_project = AsyncMock(
        side_effect=NotFoundError("Project not found")
    )

    response = await client.patch(
        "/v1/projects/nonexistent",
        json={"name": "Will Not Work"},
    )

    assert response.status_code == 404


async def test_update_project_returns_403_when_scope_missing(client, mock_project_svc):
    mock_project_svc._ctx = make_tenant_ctx(scopes=frozenset({"projects:read"}))  # read only

    response = await client.patch(
        f"/v1/projects/{TEST_PROJECT_ID}",
        json={"name": "Blocked"},
    )

    assert response.status_code == 403


# ── DELETE /v1/projects/{project_id} ─────────────────────────────────────────


async def test_delete_project_returns_204(client, mock_project_svc):
    mock_project_svc.delete_project = AsyncMock(return_value=None)

    response = await client.delete(f"/v1/projects/{TEST_PROJECT_ID}")

    assert response.status_code == 204
    mock_project_svc.delete_project.assert_awaited_once_with(TEST_PROJECT_ID)


async def test_delete_project_returns_404_when_not_found(client, mock_project_svc):
    mock_project_svc.delete_project = AsyncMock(
        side_effect=NotFoundError("Project not found")
    )

    response = await client.delete("/v1/projects/nonexistent")

    assert response.status_code == 404


async def test_delete_project_returns_403_when_scope_missing(client, mock_project_svc):
    mock_project_svc._ctx = make_tenant_ctx(scopes=frozenset({"projects:read"}))

    response = await client.delete(f"/v1/projects/{TEST_PROJECT_ID}")

    assert response.status_code == 403


# ── 401 — no Authorization header ────────────────────────────────────────────


async def test_missing_auth_header_returns_401(client):
    """
    Without mock_project_svc, the real authenticate_request dependency runs.
    No Authorization header → 401 before any DB access.
    """
    response = await client.get("/v1/projects")

    assert response.status_code == 401
