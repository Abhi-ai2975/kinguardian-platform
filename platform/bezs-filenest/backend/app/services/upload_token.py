"""
app.services.upload_token — Business logic for upload token creation.

Creates short-lived bearer tokens that allow browser clients to call the
file upload endpoints without exposing the project's full API key.

Constraint reconciliation rules
--------------------------------
* At token creation:
  - If project config has a restriction (non-null) AND the token also specifies
    that same constraint, the token value must not exceed the project ceiling.
    Violating this raises a ValidationError immediately so the caller knows
    the token would never work before it is issued.
  - If project config has no restriction (null column), the token constraint
    becomes the sole enforcement gate at upload time.
* At upload time (FileService.init_upload):
  - Both the token constraint AND the project config constraint are checked
    independently. The stricter of the two wins.

The service runs inside the request DB transaction (the session context
manager in get_db commits on success). Expired tokens for the same project
are pruned opportunistically on each creation call.

Usage:
    from app.services.upload_token import UploadTokenService
"""
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.errors import ValidationError
from app.models.upload_token import UploadToken
from app.repositories.folder import FolderRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.upload_token import UploadTokenRepository
from app.schemas.upload_token import (
    CreateUploadTokenRequest,
    UploadTokenConstraints,
    UploadTokenResponse,
)


_DEFAULT_MAX_SIZE = 100 * 1024 * 1024   # 100 MB
_DEFAULT_MAX_FILES = 10
_DEFAULT_MIME_TYPES = ["*/*"]


def _parse_config_mime_types(csv: str) -> set[str]:
    """Split a comma-separated MIME type string from project_config into a normalised set."""
    return {t.strip().lower() for t in csv.split(",") if t.strip()}


def _token_mime_covered_by_config(token_pattern: str, config_set: set[str]) -> bool:
    """
    Return True when token_pattern is fully covered by the project config's allowlist.

    Coverage rules:
      - config has */*  → any token pattern is covered.
      - token is */*    → only covered if config also has */*.
      - token is type/* → covered only if config has type/* or */*.
      - token is exact  → covered if config has the exact type, type/*, or */*.
    """
    p = token_pattern.strip().lower()
    if "*/*" in config_set:
        return True
    if p == "*/*":
        return False   # token wants all types but project doesn't allow all
    if p.endswith("/*"):
        return p in config_set   # wildcard needs exact match at the category level
    # exact MIME — config may cover it via exact match or category wildcard
    major = p.split("/")[0] + "/*"
    return p in config_set or major in config_set


def _reject_token_mime_types(
    token_types: list[str],
    config_mime_csv: str,
) -> list[str]:
    """Return the subset of token_types that are not covered by the project config."""
    config_set = _parse_config_mime_types(config_mime_csv)
    return [t for t in token_types if not _token_mime_covered_by_config(t, config_set)]


class UploadTokenService:
    """Creates and validates browser upload tokens."""

    def __init__(
        self,
        session: AsyncSession,
        repo: UploadTokenRepository,
        ctx: TenantContext,
        folder_repo: FolderRepository | None = None,
        config_repo: ProjectConfigRepository | None = None,
    ) -> None:
        self._session = session
        self._repo = repo
        self._ctx = ctx
        self._folder_repo = folder_repo
        self._config_repo = config_repo

    async def create(self, project_id: str, req: CreateUploadTokenRequest) -> UploadTokenResponse:
        """
        Issue a new short-lived upload token for the given project.

        Validates token constraints against project config before issuing the token
        so that callers get an immediate error if the token would be incompatible
        with the project's restrictions (e.g. requesting a MIME type the project
        doesn't allow). Expired tokens for this project are pruned in the same
        transaction.

        Args:
            project_id: The project that this token grants access to.
            req:        Token constraints and TTL from the request body.

        Returns:
            UploadTokenResponse with the token string, expiry, and constraints.

        Raises:
            ValidationError: Token constraints conflict with project config.
        """
        # ── Validate token constraints against project config ────────────────
        if self._config_repo is not None:
            config = await self._config_repo.get_for_project(
                project_id, self._ctx.organization_id
            )

            if req.max_size is not None and config.max_file_size_bytes is not None:
                if req.max_size > config.max_file_size_bytes:
                    raise ValidationError(
                        f"Token max_size ({req.max_size:,} bytes) exceeds the project "
                        f"limit of {config.max_file_size_bytes:,} bytes",
                        detail={
                            "token_max_size": req.max_size,
                            "project_max_file_size_bytes": config.max_file_size_bytes,
                        },
                    )

            if req.max_files is not None and config.max_files_per_request is not None:
                if req.max_files > config.max_files_per_request:
                    raise ValidationError(
                        f"Token max_files ({req.max_files}) exceeds the project "
                        f"limit of {config.max_files_per_request} files per request",
                        detail={
                            "token_max_files": req.max_files,
                            "project_max_files_per_request": config.max_files_per_request,
                        },
                    )

            if req.allowed_mime_types and config.allowed_mime_types:
                rejected = _reject_token_mime_types(
                    req.allowed_mime_types, config.allowed_mime_types
                )
                if rejected:
                    raise ValidationError(
                        f"Token allowed_mime_types contains types not permitted by the "
                        f"project config: {', '.join(rejected)}",
                        detail={
                            "rejected_types": rejected,
                            "project_allowed_mime_types": config.allowed_mime_types,
                        },
                    )

        # ── Resolve folder_path → folder_id ─────────────────────────────────
        folder_id = req.folder_id
        if req.folder_path is not None:
            if self._folder_repo is None:
                raise ValidationError("folder_path resolution requires a folder repository")
            segments = req.folder_path.strip("/").split("/")
            current_parent_id: str | None = None
            current_path = ""
            for segment in segments:
                current_path = f"{current_path}/{segment}"
                existing = await self._folder_repo.get_by_path(
                    current_path, self._ctx.organization_id, project_id
                )
                if existing is not None:
                    current_parent_id = existing.id
                else:
                    created = await self._folder_repo.create(
                        organization_id=self._ctx.organization_id,
                        project_id=project_id,
                        name=segment,
                        path=current_path,
                        parent_folder_id=current_parent_id,
                    )
                    current_parent_id = created.id
            folder_id = current_parent_id

        expires_at = datetime.now(UTC) + timedelta(seconds=req.expires_in)

        max_size = req.max_size if req.max_size is not None else _DEFAULT_MAX_SIZE
        allowed_mime_types = req.allowed_mime_types if req.allowed_mime_types is not None else _DEFAULT_MIME_TYPES
        max_files = req.max_files if req.max_files is not None else _DEFAULT_MAX_FILES

        token_value = UploadToken.generate_token()

        await self._repo.create(
            organization_id=self._ctx.organization_id,
            project_id=project_id,
            token=token_value,
            max_size=max_size,
            allowed_mime_types=allowed_mime_types,
            max_files=max_files,
            folder_id=folder_id,
            default_metadata=req.metadata,
            default_tags=req.tags,
            expires_at=expires_at,
            owner_user_id=req.owner_user_id,
            owner_org_id=req.owner_org_id or None,
        )

        # Prune stale tokens opportunistically — failure is non-fatal
        try:
            await self._repo.delete_expired(self._ctx.organization_id, project_id)
        except Exception:
            pass

        return UploadTokenResponse(
            token=token_value,
            expires_at=expires_at,
            constraints=UploadTokenConstraints(
                max_size=max_size,
                allowed_mime_types=allowed_mime_types,
                max_files=max_files,
            ),
        )
