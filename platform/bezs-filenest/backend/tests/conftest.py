"""
tests.conftest — Shared fixtures for the FileNest backend test suite.

Provides a client fixture that wraps the FastAPI app without triggering
lifespan (no NATS, no workers, no storage connections). The get_db
dependency is overridden to avoid a real PostgreSQL connection.
"""
from datetime import datetime, UTC
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from app.auth.models import TenantContext
from app.main import app

TEST_ORG_ID = "org_test_abc123"
TEST_PROJECT_ID = "proj_test_abc123"
TEST_USER_ID = "user_test_abc123"

ALL_SCOPES = frozenset({
    "projects:read",
    "projects:update",
    "files:read",
    "files:upload",
    "files:download",
    "files:delete",
    "files:update_metadata",
    "api_keys:create",
    "api_keys:revoke",
    "audit:read",
    "compliance:manage",
})


def make_tenant_ctx(**overrides) -> TenantContext:
    """Return a TenantContext with test defaults, overriding any field."""
    defaults: dict = dict(
        organization_id=TEST_ORG_ID,
        project_id=TEST_PROJECT_ID,
        actor_id=TEST_USER_ID,
        scopes=ALL_SCOPES,
    )
    return TenantContext(**{**defaults, **overrides})


def make_mock_project(**kwargs) -> MagicMock:
    """Return a MagicMock shaped like a Project ORM row."""
    now = datetime.now(UTC)
    project = MagicMock()
    attrs: dict = dict(
        id=TEST_PROJECT_ID,
        organization_id=TEST_ORG_ID,
        name="Test Project",
        slug="test-project",
        description=None,
        storage_mode="byob",
        storage_provider="s3",
        versioning_enabled=False,
        ocr_enabled=False,
        is_active=True,
        created_at=now,
        updated_at=now,
        deleted_at=None,
    )
    attrs.update(kwargs)
    for k, v in attrs.items():
        setattr(project, k, v)
    return project


def make_list_params(**kwargs) -> SimpleNamespace:
    """Return a SimpleNamespace that satisfies ProjectListParams duck-typing."""
    defaults: dict = dict(
        page=1, page_size=20,
        sort_by="created_at", sort_dir="desc",
        search=None, storage_provider=None, storage_mode=None,
    )
    defaults.update(kwargs)
    ns = SimpleNamespace(**defaults)
    ns.offset = (ns.page - 1) * ns.page_size
    return ns


def make_project_schema(**kwargs):
    """Return a ProjectResponse Pydantic instance with test defaults."""
    from app.schemas.project import ProjectResponse
    now = datetime.now(UTC)
    defaults: dict = dict(
        id=TEST_PROJECT_ID,
        organization_id=TEST_ORG_ID,
        name="Test Project",
        slug="test-project",
        description=None,
        storage_mode="managed",
        storage_provider="s3",
        versioning_enabled=False,
        ocr_enabled=False,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    defaults.update(kwargs)
    return ProjectResponse(**defaults)


@pytest.fixture
def tenant_ctx() -> TenantContext:
    return make_tenant_ctx()


@pytest.fixture
async def client():
    """
    httpx.AsyncClient bound to the FastAPI app via ASGITransport.

    ASGITransport sends only 'http' scope events — startup/shutdown workers,
    NATS, and storage connections are never initialised.

    get_db is overridden with an AsyncMock session to avoid PostgreSQL.
    """
    from app.core.database import get_db

    mock_session = AsyncMock()

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def mock_project_svc(tenant_ctx: TenantContext) -> MagicMock:
    """
    Mock ProjectService injected as a FastAPI dependency override.

    _ctx defaults to the full-scope tenant_ctx so require_scope() passes.
    Override _ctx in individual tests to simulate 403 scenarios.
    """
    from app.di.dependencies.project import get_project_service

    svc = MagicMock()
    svc._ctx = tenant_ctx
    app.dependency_overrides[get_project_service] = lambda: svc
    yield svc
    app.dependency_overrides.pop(get_project_service, None)
