"""
tests.test_project_service — Unit tests for ProjectService business logic.

All repository and session interactions are replaced with AsyncMock so these
tests run without a real database. Storage resolver is patched for managed-mode
tests to avoid hitting real object storage.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.errors import ConflictError, NotFoundError
from app.repositories.project import ProjectRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.schemas.project import CreateProjectRequest, UpdateProjectRequest
from app.services.project import ProjectService
from tests.conftest import (
    TEST_ORG_ID,
    TEST_PROJECT_ID,
    make_tenant_ctx,
    make_mock_project,
    make_list_params,
)


@pytest.fixture
def mock_repo() -> AsyncMock:
    return AsyncMock(spec=ProjectRepository)


@pytest.fixture
def mock_storage_repo() -> AsyncMock:
    return AsyncMock(spec=StorageConfigRepository)


@pytest.fixture
def mock_config_repo() -> AsyncMock:
    return AsyncMock(spec=ProjectConfigRepository)


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
def svc(mock_session, mock_repo, mock_storage_repo, mock_config_repo) -> ProjectService:
    return ProjectService(
        session=mock_session,
        repo=mock_repo,
        storage_repo=mock_storage_repo,
        config_repo=mock_config_repo,
        ctx=make_tenant_ctx(),
    )


# ── create_project ─────────────────────────────────────────────────────────────


async def test_create_project_byob_happy_path(
    svc, mock_repo, mock_storage_repo, mock_config_repo, mock_session
):
    project = make_mock_project(storage_mode="byob")
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.return_value = project

    req = CreateProjectRequest(
        name="My Project",
        slug="my-project",
        storage_mode="byob",
        storage_provider="s3",
    )
    result = await svc.create_project(req)

    mock_repo.get_by_slug.assert_awaited_once_with("my-project", TEST_ORG_ID)
    mock_repo.create.assert_awaited_once()
    mock_storage_repo.create.assert_awaited_once()
    mock_config_repo.create.assert_awaited_once()
    mock_session.commit.assert_awaited_once()
    assert result.id == TEST_PROJECT_ID
    assert result.name == project.name
    assert result.organization_id == TEST_ORG_ID


async def test_create_project_slug_conflict_raises_and_skips_create(svc, mock_repo):
    mock_repo.get_by_slug.return_value = make_mock_project()  # slug already taken

    req = CreateProjectRequest(
        name="Duplicate",
        slug="my-project",
        storage_mode="byob",
        storage_provider="s3",
    )
    with pytest.raises(ConflictError):
        await svc.create_project(req)

    mock_repo.create.assert_not_awaited()


async def test_create_project_slug_auto_derived_from_name(
    svc, mock_repo, mock_storage_repo, mock_config_repo
):
    # Pydantic v2 field_validator(mode="before") only fires when the field receives
    # an explicit value. Passing slug=None explicitly (as a client sending "slug":null
    # in JSON would) triggers the validator, which derives the slug from name.
    req = CreateProjectRequest(
        name="Auto Named", slug=None, storage_mode="byob", storage_provider="s3"
    )
    assert req.slug == "auto-named"

    project = make_mock_project(name="Auto Named", slug="auto-named")
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.return_value = project

    await svc.create_project(req)
    mock_repo.get_by_slug.assert_awaited_once_with("auto-named", TEST_ORG_ID)


async def test_create_project_managed_provisions_bucket(
    svc, mock_repo, mock_storage_repo, mock_config_repo, mock_session
):
    """Managed storage calls storage_resolver to provision a bucket and probe it."""
    project = make_mock_project(storage_mode="managed")
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.return_value = project

    req = CreateProjectRequest(
        name="Managed",
        slug="managed",
        storage_mode="managed",
        storage_provider="minio",
    )

    mock_provider = MagicMock()
    mock_provider.upload = AsyncMock()
    mock_provider.delete_object = AsyncMock()

    with patch("app.services.project.storage_resolver") as mock_resolver:
        mock_resolver.provision_managed_bucket = AsyncMock(return_value="test-bucket")
        mock_resolver.build_managed_provider.return_value = mock_provider

        result = await svc.create_project(req)

    mock_resolver.provision_managed_bucket.assert_awaited_once()
    mock_provider.upload.assert_awaited_once()
    mock_provider.delete_object.assert_awaited_once()
    assert result.id == TEST_PROJECT_ID


async def test_create_project_managed_probe_failure_sets_verification_failed(
    svc, mock_repo, mock_storage_repo, mock_config_repo, mock_session
):
    """If the storage probe fails, storage_config is created with 'verification_failed' status."""
    project = make_mock_project(storage_mode="managed")
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.return_value = project

    req = CreateProjectRequest(
        name="Probe Fail",
        slug="probe-fail",
        storage_mode="managed",
        storage_provider="minio",
    )

    mock_provider = MagicMock()
    mock_provider.upload = AsyncMock(side_effect=Exception("bucket unreachable"))
    mock_provider.delete_object = AsyncMock()

    with patch("app.services.project.storage_resolver") as mock_resolver:
        mock_resolver.provision_managed_bucket = AsyncMock(return_value="test-bucket")
        mock_resolver.build_managed_provider.return_value = mock_provider

        result = await svc.create_project(req)

    # The service should not raise — probe failure is logged and stored_config gets
    # 'verification_failed', but the project creation still succeeds.
    assert result.id == TEST_PROJECT_ID

    # Check that storage_repo.create was called with verification_failed status
    call_kwargs = mock_storage_repo.create.call_args.kwargs
    assert call_kwargs["status"] == "verification_failed"


# ── get_project ────────────────────────────────────────────────────────────────


async def test_get_project_returns_response(svc, mock_repo):
    mock_repo.get.return_value = make_mock_project()
    result = await svc.get_project(TEST_PROJECT_ID)
    mock_repo.get.assert_awaited_once_with(TEST_PROJECT_ID, TEST_ORG_ID)
    assert result.id == TEST_PROJECT_ID
    assert result.organization_id == TEST_ORG_ID


async def test_get_project_not_found_propagates(svc, mock_repo):
    mock_repo.get.side_effect = NotFoundError("Project not found")
    with pytest.raises(NotFoundError):
        await svc.get_project("does_not_exist")


# ── list_projects ──────────────────────────────────────────────────────────────


async def test_list_projects_empty_returns_one_total_page(svc, mock_repo):
    mock_repo.list.return_value = ([], 0)
    result = await svc.list_projects(make_list_params())
    assert result.total == 0
    assert result.total_pages == 1
    assert result.items == []


async def test_list_projects_calculates_total_pages(svc, mock_repo):
    projects = [make_mock_project(id=f"proj_{i}") for i in range(10)]
    mock_repo.list.return_value = (projects, 42)
    result = await svc.list_projects(make_list_params(page=1, page_size=10))
    assert result.total == 42
    assert result.total_pages == 5  # ceil(42/10)
    assert len(result.items) == 10


async def test_list_projects_ceiling_rounds_up(svc, mock_repo):
    mock_repo.list.return_value = ([make_mock_project()], 7)
    result = await svc.list_projects(make_list_params(page=1, page_size=5))
    assert result.total_pages == 2  # ceil(7/5)


async def test_list_projects_page_number_reflected_in_response(svc, mock_repo):
    mock_repo.list.return_value = ([], 0)
    result = await svc.list_projects(make_list_params(page=3, page_size=20))
    assert result.page == 3
    assert result.page_size == 20


# ── update_project ─────────────────────────────────────────────────────────────


async def test_update_project_commits_and_returns_response(svc, mock_repo, mock_session):
    updated = make_mock_project(name="Renamed Project")
    mock_repo.update.return_value = updated

    req = UpdateProjectRequest(name="Renamed Project")
    result = await svc.update_project(TEST_PROJECT_ID, req)

    mock_repo.update.assert_awaited_once_with(
        TEST_PROJECT_ID,
        TEST_ORG_ID,
        name="Renamed Project",
        description=None,
        versioning_enabled=None,
        ocr_enabled=None,
    )
    mock_session.commit.assert_awaited_once()
    assert result.name == "Renamed Project"


async def test_update_project_not_found_propagates(svc, mock_repo):
    mock_repo.update.side_effect = NotFoundError("not found")
    with pytest.raises(NotFoundError):
        await svc.update_project("bad_id", UpdateProjectRequest(name="X"))


async def test_update_project_partial_fields_only_passes_non_none(svc, mock_repo, mock_session):
    """UpdateProjectRequest with only versioning_enabled set passes None for others."""
    mock_repo.update.return_value = make_mock_project(versioning_enabled=True)

    req = UpdateProjectRequest(versioning_enabled=True)
    await svc.update_project(TEST_PROJECT_ID, req)

    call_kwargs = mock_repo.update.call_args.kwargs
    assert call_kwargs["versioning_enabled"] is True
    assert call_kwargs["name"] is None  # not provided


# ── delete_project ─────────────────────────────────────────────────────────────


async def test_delete_project_calls_soft_delete_and_commits(svc, mock_repo, mock_session):
    mock_repo.soft_delete.return_value = make_mock_project()
    await svc.delete_project(TEST_PROJECT_ID)
    mock_repo.soft_delete.assert_awaited_once_with(TEST_PROJECT_ID, TEST_ORG_ID)
    mock_session.commit.assert_awaited_once()


async def test_delete_project_not_found_propagates(svc, mock_repo):
    mock_repo.soft_delete.side_effect = NotFoundError("not found")
    with pytest.raises(NotFoundError):
        await svc.delete_project("bad_id")
