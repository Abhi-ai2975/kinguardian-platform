"""
app.auth.models — TenantContext: the resolved caller identity for each request.

TenantContext is the single object passed through the entire request lifecycle.
It is built by authenticate_request and injected into service code via FastAPI's
dependency system.

Usage:
    from app.auth.models import TenantContext
"""
from contextvars import ContextVar
from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True)
class TenantContext:
    """
    Immutable snapshot of the authenticated caller's identity and permissions.

    Built from the verified Bearer token (JWT or API key) for each request.
    `project_id` is optional because some operations (e.g. listing projects)
    are scoped to an org but not a specific project.

    Attributes:
        organization_id: Owning organisation — present on all tokens.
        project_id:      Active project — None for org-level tokens.
        actor_id:        User or API key ID from the IAM.
        scopes:          Frozenset of granted scopes (e.g. "files:upload").
        is_test_mode:    True for fn_test_ API keys; uses a sandbox environment.
        owner_user_id:   End-user ID embedded in an upload token server-side. When set,
                         FileService stamps every uploaded file with this value.
        owner_org_id:    End-user's org ID embedded in an upload token server-side.
    """

    organization_id: str
    project_id: str | None
    actor_id: str
    scopes: frozenset[str]
    is_test_mode: bool = False
    owner_user_id: str | None = None
    owner_org_id: str | None = None
    # Upload-token-only fields — None when the caller is an API key or JWT.
    # FileService reads these to enforce token-level constraints and apply
    # the server-controlled folder and metadata defaults at upload time.
    upload_token_folder_id: str | None = None
    upload_token_default_metadata: dict | None = None
    upload_token_default_tags: list[str] | None = None
    upload_token_allowed_mime_types: list[str] | None = None
    upload_token_max_size: int | None = None
    upload_token_max_files: int | None = None


# Per-request context variable — set by authenticate_request, read by services
_tenant_ctx: ContextVar[TenantContext | None] = ContextVar("tenant_ctx", default=None)


def set_tenant_context(ctx: TenantContext) -> None:
    """Store the resolved TenantContext in the current async task's ContextVar."""
    _tenant_ctx.set(ctx)


def get_tenant_context() -> TenantContext | None:
    """Return the TenantContext for the current async task, or None."""
    return _tenant_ctx.get()


def require_auth() -> TenantContext:
    """
    Return the TenantContext or raise 401 if not set.

    Raises:
        HTTPException 401: If called outside an authenticated request.
    """
    ctx = _tenant_ctx.get()
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_CREDENTIALS"},
        )
    return ctx


def require_project_context(ctx: TenantContext) -> str:
    """
    Assert that project_id is non-null and return it.

    Raises:
        HTTPException 400: If the token is org-level (no project_id).
    """
    if ctx.project_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "PROJECT_REQUIRED",
                "message": "This operation requires a project-scoped API key.",
            },
        )
    return ctx.project_id
