from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.terminology.terminology import (
    TerminologyAuditLog,
    TerminologyCodeSystem,
    TerminologyConcept,
    TerminologyConceptMap,
    TerminologyFieldBinding,
    TerminologyValueSet,
    TerminologyValueSetConcept,
)


class TerminologyRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def list_code_systems(self) -> list[TerminologyCodeSystem]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(TerminologyCodeSystem)
                .where(TerminologyCodeSystem.active == True)
                .order_by(TerminologyCodeSystem.name)
            )
            return list(result.scalars().all())

    async def list_value_sets(
        self, q: str | None, limit: int, offset: int
    ) -> tuple[int, list[TerminologyValueSet]]:
        async with self.session_factory() as session:
            stmt = select(TerminologyValueSet).where(TerminologyValueSet.active == True)
            if q:
                pattern = f"%{q}%"
                stmt = stmt.where(
                    TerminologyValueSet.name.ilike(pattern)
                    | TerminologyValueSet.title.ilike(pattern)
                    | TerminologyValueSet.canonical_url.ilike(pattern)
                )
            count = await session.scalar(
                select(func.count()).select_from(stmt.subquery())
            )
            rows = await session.execute(
                stmt.order_by(TerminologyValueSet.name).limit(limit).offset(offset)
            )
            return count or 0, list(rows.scalars().all())

    async def get_value_set(self, value_set_id: int) -> TerminologyValueSet | None:
        async with self.session_factory() as session:
            return await session.get(TerminologyValueSet, value_set_id)

    async def expand_value_set(
        self, value_set_id: int, q: str | None, limit: int, offset: int
    ) -> tuple[int, list[tuple]]:
        async with self.session_factory() as session:
            base = (
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(
                    TerminologyValueSetConcept,
                    TerminologyValueSetConcept.concept_id == TerminologyConcept.id,
                )
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(TerminologyValueSetConcept.value_set_id == value_set_id)
                .where(TerminologyValueSetConcept.active == True)
            )
            count_stmt = (
                select(func.count())
                .select_from(TerminologyConcept)
                .join(
                    TerminologyValueSetConcept,
                    TerminologyValueSetConcept.concept_id == TerminologyConcept.id,
                )
                .where(TerminologyValueSetConcept.value_set_id == value_set_id)
                .where(TerminologyValueSetConcept.active == True)
            )
            if q:
                trgm_where = text(
                    "terminology_concept.display ILIKE :pat"
                ).bindparams(pat=f"%{q}%")
                base = base.where(trgm_where)
                count_stmt = count_stmt.where(trgm_where)

            count = await session.scalar(count_stmt)
            rows = await session.execute(
                base.order_by(TerminologyConcept.display).limit(limit).offset(offset)
            )
            return count or 0, list(rows.all())

    async def search_concepts(
        self, q: str, system: str | None, limit: int, offset: int
    ) -> tuple[int, list[tuple]]:
        async with self.session_factory() as session:
            trgm_where = text(
                "terminology_concept.display ILIKE :pat"
            ).bindparams(pat=f"%{q}%")
            trgm_rank = text(
                "similarity(terminology_concept.display, :q) DESC"
            ).bindparams(q=q)
            base = (
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(trgm_where)
                .where(TerminologyConcept.active == True)
            )
            count_stmt = (
                select(func.count())
                .select_from(TerminologyConcept)
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(trgm_where)
                .where(TerminologyConcept.active == True)
            )
            if system:
                base = base.where(TerminologyCodeSystem.canonical_url == system)
                count_stmt = count_stmt.where(
                    TerminologyCodeSystem.canonical_url == system
                )
            count = await session.scalar(count_stmt)
            rows = await session.execute(
                base.order_by(trgm_rank).limit(limit).offset(offset)
            )
            return count or 0, list(rows.all())

    async def get_field_binding(
        self, resource_type: str, field_name: str
    ) -> TerminologyFieldBinding | None:
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyFieldBinding)
                .where(TerminologyFieldBinding.resource_type == resource_type)
                .where(TerminologyFieldBinding.field_name == field_name)
                .where(TerminologyFieldBinding.active == True)
            )
            return row.scalar_one_or_none()

    async def lookup_concept_in_value_set(
        self, value_set_id: int, system: str, code: str
    ) -> tuple[TerminologyCodeSystem | None, TerminologyConcept | None, bool]:
        """Returns (code_system, concept, in_value_set). concept may be found even if not in value set."""
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(TerminologyCodeSystem.canonical_url == system)
                .where(TerminologyConcept.code == code)
            )
            result = row.first()
            if result is None:
                return None, None, False
            concept, cs = result[0], result[1]
            in_vs = await session.scalar(
                select(func.count())
                .select_from(TerminologyValueSetConcept)
                .where(TerminologyValueSetConcept.value_set_id == value_set_id)
                .where(TerminologyValueSetConcept.concept_id == concept.id)
            )
            return cs, concept, bool(in_vs)

    async def get_code_system_by_url(self, url: str) -> TerminologyCodeSystem | None:
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyCodeSystem).where(TerminologyCodeSystem.canonical_url == url)
            )
            return row.scalar_one_or_none()

    async def create_org_concept(
        self,
        code_system_id: int,
        code: str,
        display: str,
        definition: str | None,
        org_id: str,
        user_id: str | None = None,
    ) -> TerminologyConcept:
        async with self.session_factory() as session:
            concept = TerminologyConcept(
                code_system_id=code_system_id,
                code=code,
                display=display,
                definition=definition,
                org_id=org_id,
                user_id=user_id,
            )
            session.add(concept)
            await session.flush()
            await session.execute(
                text(
                    "UPDATE terminology_concept SET search_vector = to_tsvector('english', :txt) WHERE id = :id"
                ),
                {"txt": f"{display} {definition or ''}".strip(), "id": concept.id},
            )
            session.add(TerminologyAuditLog(
                action="org_concept.created",
                concept_id=concept.id,
                performed_by=user_id,
                new_value={"code": code, "display": display, "definition": definition, "org_id": org_id},
            ))
            await session.commit()
            await session.refresh(concept)
            return concept

    async def get_org_concept(
        self, concept_id: int, org_id: str
    ) -> tuple[TerminologyConcept, TerminologyCodeSystem] | None:
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(TerminologyCodeSystem, TerminologyConcept.code_system_id == TerminologyCodeSystem.id)
                .where(TerminologyConcept.id == concept_id)
                .where(TerminologyConcept.org_id == org_id)
            )
            return row.first()

    async def patch_org_concept(
        self,
        concept_id: int,
        org_id: str,
        display: str | None,
        definition: str | None,
    ) -> tuple[TerminologyConcept, TerminologyCodeSystem] | None:
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(TerminologyCodeSystem, TerminologyConcept.code_system_id == TerminologyCodeSystem.id)
                .where(TerminologyConcept.id == concept_id)
                .where(TerminologyConcept.org_id == org_id)
            )
            result = row.first()
            if result is None:
                return None
            concept, cs = result[0], result[1]
            old = {"display": concept.display, "definition": concept.definition}
            if display is not None:
                concept.display = display
            if definition is not None:
                concept.definition = definition
            await session.flush()
            search_text = f"{concept.display} {concept.definition or ''}".strip()
            await session.execute(
                text(
                    "UPDATE terminology_concept SET search_vector = to_tsvector('english', :txt) WHERE id = :id"
                ),
                {"txt": search_text, "id": concept.id},
            )
            session.add(TerminologyAuditLog(
                action="org_concept.updated",
                concept_id=concept.id,
                performed_by=concept.user_id,
                old_value=old,
                new_value={"display": concept.display, "definition": concept.definition},
            ))
            await session.commit()
            await session.refresh(concept)
            return concept, cs

    async def delete_org_concept(self, concept_id: int, org_id: str) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(TerminologyConcept)
                .where(TerminologyConcept.id == concept_id)
                .where(TerminologyConcept.org_id == org_id)
            )
            concept = result.scalar_one_or_none()
            if concept is None:
                return False
            session.add(TerminologyAuditLog(
                action="org_concept.deleted",
                performed_by=concept.user_id,
                old_value={
                    "code": concept.code,
                    "display": concept.display,
                    "definition": concept.definition,
                    "org_id": concept.org_id,
                },
            ))
            await session.delete(concept)
            await session.commit()
            return True

    async def list_org_concepts(
        self,
        org_id: str,
        code_system_url: str | None,
        q: str | None,
        limit: int,
        offset: int,
    ) -> tuple[int, list[tuple]]:
        async with self.session_factory() as session:
            base = (
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(TerminologyCodeSystem, TerminologyConcept.code_system_id == TerminologyCodeSystem.id)
                .where(TerminologyConcept.org_id == org_id)
            )
            count_stmt = (
                select(func.count())
                .select_from(TerminologyConcept)
                .where(TerminologyConcept.org_id == org_id)
            )
            if code_system_url:
                base = base.where(TerminologyCodeSystem.canonical_url == code_system_url)
                count_stmt = (
                    select(func.count())
                    .select_from(TerminologyConcept)
                    .join(TerminologyCodeSystem, TerminologyConcept.code_system_id == TerminologyCodeSystem.id)
                    .where(TerminologyConcept.org_id == org_id)
                    .where(TerminologyCodeSystem.canonical_url == code_system_url)
                )
            if q:
                trgm_where = text(
                    "terminology_concept.display ILIKE :pat"
                ).bindparams(pat=f"%{q}%")
                base = base.where(trgm_where)
                count_stmt = count_stmt.where(trgm_where)
            count = await session.scalar(count_stmt)
            rows = await session.execute(
                base.order_by(TerminologyConcept.code).limit(limit).offset(offset)
            )
            return count or 0, list(rows.all())

    async def list_audit_log(
        self,
        action: str | None,
        performed_by: str | None,
        concept_id: int | None,
        limit: int,
        offset: int,
    ) -> tuple[int, list[TerminologyAuditLog]]:
        async with self.session_factory() as session:
            stmt = select(TerminologyAuditLog)
            count_stmt = select(func.count()).select_from(TerminologyAuditLog)
            if action:
                stmt = stmt.where(TerminologyAuditLog.action == action)
                count_stmt = count_stmt.where(TerminologyAuditLog.action == action)
            if performed_by:
                stmt = stmt.where(TerminologyAuditLog.performed_by == performed_by)
                count_stmt = count_stmt.where(TerminologyAuditLog.performed_by == performed_by)
            if concept_id is not None:
                stmt = stmt.where(TerminologyAuditLog.concept_id == concept_id)
                count_stmt = count_stmt.where(TerminologyAuditLog.concept_id == concept_id)
            count = await session.scalar(count_stmt)
            rows = await session.execute(
                stmt.order_by(TerminologyAuditLog.created_at.desc()).limit(limit).offset(offset)
            )
            return count or 0, list(rows.scalars().all())

    async def get_translations(
        self, source_concept_id: int, target_system: str | None
    ) -> list[tuple[TerminologyConceptMap, TerminologyConcept, TerminologyCodeSystem]]:
        async with self.session_factory() as session:
            stmt = (
                select(TerminologyConceptMap, TerminologyConcept, TerminologyCodeSystem)
                .join(
                    TerminologyConcept,
                    TerminologyConceptMap.target_concept_id == TerminologyConcept.id,
                )
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(TerminologyConceptMap.source_concept_id == source_concept_id)
            )
            if target_system:
                stmt = stmt.where(TerminologyCodeSystem.canonical_url == target_system)
            rows = await session.execute(stmt.order_by(TerminologyConceptMap.confidence.desc()))
            return list(rows.all())

    async def list_concept_maps(
        self, source_system: str | None, target_system: str | None, limit: int, offset: int
    ) -> tuple[int, list[tuple]]:
        from sqlalchemy.orm import aliased
        SrcConceptAlias = aliased(TerminologyConcept, name="src_concept")
        TgtConceptAlias = aliased(TerminologyConcept, name="tgt_concept")
        SrcCSAlias = aliased(TerminologyCodeSystem, name="src_cs")
        TgtCSAlias = aliased(TerminologyCodeSystem, name="tgt_cs")

        async with self.session_factory() as session:
            stmt = (
                select(TerminologyConceptMap, SrcConceptAlias, SrcCSAlias, TgtConceptAlias, TgtCSAlias)
                .join(SrcConceptAlias, TerminologyConceptMap.source_concept_id == SrcConceptAlias.id)
                .join(SrcCSAlias, SrcConceptAlias.code_system_id == SrcCSAlias.id)
                .join(TgtConceptAlias, TerminologyConceptMap.target_concept_id == TgtConceptAlias.id)
                .join(TgtCSAlias, TgtConceptAlias.code_system_id == TgtCSAlias.id)
            )
            if source_system:
                stmt = stmt.where(SrcCSAlias.canonical_url == source_system)
            if target_system:
                stmt = stmt.where(TgtCSAlias.canonical_url == target_system)

            count_stmt = select(func.count()).select_from(TerminologyConceptMap)
            count = await session.scalar(count_stmt)
            rows = await session.execute(
                stmt.order_by(TerminologyConceptMap.confidence.desc()).limit(limit).offset(offset)
            )
            return count or 0, list(rows.all())

    async def add_concept_map(
        self,
        source_concept_id: int,
        target_concept_id: int,
        mapping_type: str | None,
        confidence: float | None,
    ) -> bool:
        """Returns True if inserted, False if already exists."""
        async with self.session_factory() as session:
            exists = await session.scalar(
                select(func.count())
                .select_from(TerminologyConceptMap)
                .where(TerminologyConceptMap.source_concept_id == source_concept_id)
                .where(TerminologyConceptMap.target_concept_id == target_concept_id)
                .where(TerminologyConceptMap.mapping_type == mapping_type)
            )
            if exists:
                return False
            session.add(
                TerminologyConceptMap(
                    source_concept_id=source_concept_id,
                    target_concept_id=target_concept_id,
                    mapping_type=mapping_type,
                    confidence=confidence,
                )
            )
            await session.commit()
            return True

    async def lookup_concept(
        self, system: str, code: str
    ) -> tuple[TerminologyCodeSystem | None, TerminologyConcept | None]:
        async with self.session_factory() as session:
            row = await session.execute(
                select(TerminologyConcept, TerminologyCodeSystem)
                .join(
                    TerminologyCodeSystem,
                    TerminologyConcept.code_system_id == TerminologyCodeSystem.id,
                )
                .where(TerminologyCodeSystem.canonical_url == system)
                .where(TerminologyConcept.code == code)
            )
            result = row.first()
            if result:
                concept, cs = result[0], result[1]
                return cs, concept
            return None, None
