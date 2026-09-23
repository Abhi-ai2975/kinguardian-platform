"""
tests.test_auth — Unit tests for require_scope and TenantContext.

Tests run without HTTP — they call app.auth code directly.
"""
import pytest
from fastapi import HTTPException

from app.auth.dependencies import require_scope
from app.auth.models import TenantContext
from tests.conftest import make_tenant_ctx


# ── require_scope ──────────────────────────────────────────────────────────────


def test_require_scope_single_scope_passes():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read", "projects:read"}))
    require_scope(ctx, "files:read")  # must not raise


def test_require_scope_single_scope_missing_raises_403():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read"}))
    with pytest.raises(HTTPException) as exc_info:
        require_scope(ctx, "projects:update")
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "FORBIDDEN"
    assert exc_info.value.detail["required_scope"] == "projects:update"


def test_require_scope_list_all_present_passes():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read", "files:upload"}))
    require_scope(ctx, ["files:read", "files:upload"])  # must not raise


def test_require_scope_list_one_missing_raises_403():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read"}))
    with pytest.raises(HTTPException) as exc_info:
        require_scope(ctx, ["files:read", "files:upload"])
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["required_scope"] == "files:upload"


def test_require_scope_first_missing_identified_in_detail():
    """When multiple scopes are missing, the first one in the list is reported."""
    ctx = make_tenant_ctx(scopes=frozenset())
    with pytest.raises(HTTPException) as exc_info:
        require_scope(ctx, ["files:read", "files:upload"])
    assert exc_info.value.detail["required_scope"] == "files:read"


def test_require_scope_empty_scope_set_raises_403():
    ctx = make_tenant_ctx(scopes=frozenset())
    with pytest.raises(HTTPException) as exc_info:
        require_scope(ctx, "projects:read")
    assert exc_info.value.status_code == 403


def test_require_scope_string_and_single_item_list_are_equivalent():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read"}))
    require_scope(ctx, "files:read")
    require_scope(ctx, ["files:read"])  # both must pass


# ── TenantContext ──────────────────────────────────────────────────────────────


def test_tenant_context_is_immutable():
    ctx = make_tenant_ctx()
    with pytest.raises((AttributeError, TypeError)):
        ctx.organization_id = "mutated"  # type: ignore[misc]


def test_tenant_context_optional_fields_default_to_none():
    ctx = TenantContext(
        organization_id="org1",
        project_id=None,
        actor_id="user1",
        scopes=frozenset(),
    )
    assert ctx.is_test_mode is False
    assert ctx.owner_user_id is None
    assert ctx.owner_org_id is None
    assert ctx.project_id is None


def test_tenant_context_test_mode_flag():
    ctx = make_tenant_ctx(is_test_mode=True)
    assert ctx.is_test_mode is True


def test_tenant_context_scopes_are_frozenset():
    ctx = make_tenant_ctx(scopes=frozenset({"files:read", "files:upload"}))
    assert isinstance(ctx.scopes, frozenset)
    assert "files:read" in ctx.scopes
    assert "files:upload" in ctx.scopes
    assert "projects:read" not in ctx.scopes


def test_tenant_context_org_and_project_ids_preserved():
    ctx = TenantContext(
        organization_id="org_xyz",
        project_id="proj_xyz",
        actor_id="actor_xyz",
        scopes=frozenset({"projects:read"}),
    )
    assert ctx.organization_id == "org_xyz"
    assert ctx.project_id == "proj_xyz"
    assert ctx.actor_id == "actor_xyz"
