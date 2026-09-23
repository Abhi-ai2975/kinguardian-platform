"""
app.repositories.project — Database access layer for projects.

Every query includes organization_id to prevent cross-tenant leaks.
No business logic here — conditionals belong in services.

Usage:
    from app.repositories.project import ProjectRepository
"""
from datetime import UTC, datetime
import math

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import ConflictError, NotFoundError
from app.models.project import Project
from app.schemas.project import ProjectListParams


class ProjectRepository:
    """Async repository for Project CRUD. All queries are scoped to organization_id."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> Project:
        """
        Insert a new Project row and flush to get the DB-assigned id.

        Raises:
            ConflictError: If a concurrent request created a project with the
                same slug between the service-level check and this flush.
        """
        record = Project(**kwargs)
        self._session.add(record)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            raise ConflictError("A project with this slug already exists in your organisation.")
        return record

    async def get(self, project_id: str, organization_id: str) -> Project:
        """
        Fetch a single active project by ID within the caller's organisation.

        Raises:
            NotFoundError: If no matching record exists or it is soft-deleted.
        """
        result = await self._session.execute(
            select(Project).where(
                Project.id == project_id,
                Project.organization_id == organization_id,
                Project.deleted_at.is_(None),
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError(f"Project {project_id} not found")
        return record

    async def get_by_slug(self, slug: str, organization_id: str) -> Project | None:
        """
        Fetch an active (non-deleted) project by slug within the caller's organisation.

        Only active rows hold a slug reservation — soft-deleted projects release
        their slug so it can be reused. Returns None if no active row matches.
        """
        result = await self._session.execute(
            select(Project).where(
                Project.slug == slug,
                Project.organization_id == organization_id,
                Project.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self, organization_id: str, params: ProjectListParams
    ) -> tuple[list[Project], int]:
        """
        Return a page of active projects with total count for server-side pagination.

        Applies search (ILIKE on name/slug), exact filters for provider/mode,
        configurable sort column + direction, and LIMIT/OFFSET paging.

        Returns:
            Tuple of (page rows, total matching rows).
        """
        base_where = [
            Project.organization_id == organization_id,
            Project.is_active.is_(True),
            Project.deleted_at.is_(None),
        ]

        if params.search:
            pattern = f"%{params.search}%"
            base_where.append(
                Project.name.ilike(pattern) | Project.slug.ilike(pattern)
            )
        if params.storage_provider:
            base_where.append(Project.storage_provider == params.storage_provider)
        if params.storage_mode:
            base_where.append(Project.storage_mode == params.storage_mode)

        # COUNT over the filtered set
        count_result = await self._session.execute(
            select(func.count()).select_from(Project).where(*base_where)
        )
        total = count_result.scalar_one()

        # Resolve sort column — whitelisted in ProjectListParams so safe to use directly
        sort_col = getattr(Project, params.sort_by)
        order = sort_col.asc() if params.sort_dir == "asc" else sort_col.desc()

        rows_result = await self._session.execute(
            select(Project)
            .where(*base_where)
            .order_by(order)
            .offset(params.offset)
            .limit(params.page_size)
        )
        return list(rows_result.scalars().all()), total

    async def update(self, project_id: str, organization_id: str, **fields) -> Project:
        """
        Apply a partial update to a project. Only non-None values are applied.

        Args:
            fields: Keyword arguments matching Project column names.

        Raises:
            NotFoundError: If the project does not exist.
        """
        record = await self.get(project_id, organization_id)
        for key, value in fields.items():
            if value is not None:
                setattr(record, key, value)
        record.updated_at = datetime.now(UTC)
        return record

    async def soft_delete(self, project_id: str, organization_id: str) -> Project:
        """
        Soft-delete a project by setting deleted_at and flipping is_active to False.

        Raises:
            NotFoundError: If the project does not exist or is already deleted.
        """
        record = await self.get(project_id, organization_id)
        record.deleted_at = datetime.now(UTC)
        record.is_active = False
        record.updated_at = datetime.now(UTC)
        return record
