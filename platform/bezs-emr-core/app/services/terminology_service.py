from app.models.terminology.terminology import TerminologyAuditLog, TerminologyCodeSystem, TerminologyConcept, TerminologyValueSet
from app.repository.terminology_repository import TerminologyRepository
from app.schemas.terminology import (
    AddConceptMapRequest,
    AuditLogListResponse,
    AuditLogRecord,
    CodeSystemListResponse,
    CodeSystemResponse,
    ConceptMapListResponse,
    ConceptMapRecord,
    ConceptResponse,
    ConceptsForFieldResponse,
    CreateConceptRequest,
    LookupBatchRequest,
    LookupBatchResponse,
    LookupRequest,
    LookupResult,
    OrgConceptListResponse,
    OrgConceptResponse,
    PatchConceptRequest,
    SearchResponse,
    TranslateRequest,
    TranslateResponse,
    TranslationResult,
    ValidateRequest,
    ValidateResponse,
    ValueSetExpandResponse,
    ValueSetListResponse,
    ValueSetResponse,
)


def _cs_response(cs: TerminologyCodeSystem) -> CodeSystemResponse:
    return CodeSystemResponse(
        id=cs.id,
        canonical_url=cs.canonical_url,
        name=cs.name,
        title=cs.title,
        version=cs.version,
        publisher=cs.publisher,
        content_mode=cs.content_mode,
        active=cs.active,
    )


def _vs_response(vs: TerminologyValueSet) -> ValueSetResponse:
    return ValueSetResponse(
        id=vs.id,
        canonical_url=vs.canonical_url,
        name=vs.name,
        title=vs.title,
        description=vs.description,
        version=vs.version,
        binding_strength=vs.binding_strength,
        active=vs.active,
    )


def _concept_response(concept: TerminologyConcept, cs: TerminologyCodeSystem) -> ConceptResponse:
    return ConceptResponse(
        id=concept.id,
        code=concept.code,
        display=concept.display,
        definition=concept.definition,
        active=concept.active,
        system=cs.canonical_url,
        system_name=cs.name,
    )


def _org_concept_response(concept: TerminologyConcept, cs: TerminologyCodeSystem) -> OrgConceptResponse:
    return OrgConceptResponse(
        id=concept.id,
        code=concept.code,
        display=concept.display,
        definition=concept.definition,
        active=concept.active,
        system=cs.canonical_url,
        system_name=cs.name,
        user_id=concept.user_id,
        org_id=concept.org_id,
        created_at=concept.created_at,
    )


class TerminologyService:
    def __init__(self, repository: TerminologyRepository):
        self.repository = repository

    async def list_code_systems(self) -> CodeSystemListResponse:
        rows = await self.repository.list_code_systems()
        return CodeSystemListResponse(
            total=len(rows),
            data=[_cs_response(cs) for cs in rows],
        )

    async def list_value_sets(
        self, q: str | None, limit: int, offset: int
    ) -> ValueSetListResponse:
        count, rows = await self.repository.list_value_sets(q, limit, offset)
        return ValueSetListResponse(
            total=count, limit=limit, offset=offset,
            data=[_vs_response(vs) for vs in rows],
        )

    async def expand_value_set(
        self, value_set_id: int, q: str | None, limit: int, offset: int
    ) -> ValueSetExpandResponse | None:
        vs = await self.repository.get_value_set(value_set_id)
        if vs is None:
            return None
        count, rows = await self.repository.expand_value_set(value_set_id, q, limit, offset)
        return ValueSetExpandResponse(
            value_set=_vs_response(vs),
            total=count,
            limit=limit,
            offset=offset,
            concepts=[_concept_response(concept, cs) for concept, cs in rows],
        )

    async def search_concepts(
        self, q: str, system: str | None, limit: int, offset: int
    ) -> SearchResponse:
        count, rows = await self.repository.search_concepts(q, system, limit, offset)
        return SearchResponse(
            total=count, limit=limit, offset=offset,
            data=[_concept_response(concept, cs) for concept, cs in rows],
        )

    async def lookup(self, req: LookupRequest) -> LookupResult:
        cs, concept = await self.repository.lookup_concept(req.system, req.code)
        if concept is None:
            return LookupResult(found=False)
        return LookupResult(
            found=True,
            concept=_concept_response(concept, cs),
            code_system=_cs_response(cs),
        )

    async def lookup_batch(self, req: LookupBatchRequest) -> LookupBatchResponse:
        results = [await self.lookup(item) for item in req.items]
        return LookupBatchResponse(results=results)

    async def get_concepts_for_field(
        self, resource: str, field: str, q: str | None, limit: int, offset: int
    ) -> ConceptsForFieldResponse:
        binding = await self.repository.get_field_binding(resource, field)
        if binding is None:
            return ConceptsForFieldResponse(
                resource=resource, field=field, total=0, limit=limit, offset=offset, concepts=[]
            )
        vs = await self.repository.get_value_set(binding.value_set_id)
        count, rows = await self.repository.expand_value_set(binding.value_set_id, q, limit, offset)
        return ConceptsForFieldResponse(
            resource=resource,
            field=field,
            value_set=_vs_response(vs) if vs else None,
            binding_strength=binding.binding_strength,
            multiple_allowed=binding.multiple_allowed,
            total=count,
            limit=limit,
            offset=offset,
            concepts=[_concept_response(concept, cs) for concept, cs in rows],
        )

    async def translate(self, req: TranslateRequest) -> TranslateResponse:
        src_cs, src_concept = await self.repository.lookup_concept(req.system, req.code)
        if src_concept is None:
            return TranslateResponse(
                source_system=req.system,
                source_code=req.code,
                target_system=req.target_system,
                translations=[],
                found=False,
            )
        rows = await self.repository.get_translations(src_concept.id, req.target_system)
        translations = [
            TranslationResult(
                concept=_concept_response(tgt_concept, tgt_cs),
                mapping_type=cm.mapping_type,
                confidence=cm.confidence,
            )
            for cm, tgt_concept, tgt_cs in rows
        ]
        return TranslateResponse(
            source_concept=_concept_response(src_concept, src_cs),
            source_system=req.system,
            source_code=req.code,
            target_system=req.target_system,
            translations=translations,
            found=True,
        )

    async def list_concept_maps(
        self, source_system: str | None, target_system: str | None, limit: int, offset: int
    ) -> ConceptMapListResponse:
        count, rows = await self.repository.list_concept_maps(source_system, target_system, limit, offset)
        data = [
            ConceptMapRecord(
                id=cm.id,
                source_concept=_concept_response(src_concept, src_cs),
                target_concept=_concept_response(tgt_concept, tgt_cs),
                mapping_type=cm.mapping_type,
                confidence=cm.confidence,
            )
            for cm, src_concept, src_cs, tgt_concept, tgt_cs in rows
        ]
        return ConceptMapListResponse(total=count, limit=limit, offset=offset, data=data)

    async def add_concept_map(self, req: AddConceptMapRequest) -> dict:
        src_cs, src_concept = await self.repository.lookup_concept(req.source_system, req.source_code)
        if src_concept is None:
            return {"inserted": False, "error": f"Source concept not found: {req.source_system}|{req.source_code}"}
        tgt_cs, tgt_concept = await self.repository.lookup_concept(req.target_system, req.target_code)
        if tgt_concept is None:
            return {"inserted": False, "error": f"Target concept not found: {req.target_system}|{req.target_code}"}
        inserted = await self.repository.add_concept_map(
            src_concept.id, tgt_concept.id, req.mapping_type, req.confidence
        )
        return {
            "inserted": inserted,
            "source": _concept_response(src_concept, src_cs).model_dump(),
            "target": _concept_response(tgt_concept, tgt_cs).model_dump(),
            "mapping_type": req.mapping_type,
            "confidence": req.confidence,
        }

    async def create_concept(
        self, req: CreateConceptRequest, org_id: str, user_id: str | None
    ) -> OrgConceptResponse | None:
        cs = await self.repository.get_code_system_by_url(req.code_system_url)
        if cs is None:
            return None
        concept = await self.repository.create_org_concept(
            code_system_id=cs.id,
            code=req.code,
            display=req.display,
            definition=req.definition,
            org_id=org_id,
            user_id=user_id,
        )
        return _org_concept_response(concept, cs)

    async def get_org_concept(self, concept_id: int, org_id: str) -> OrgConceptResponse | None:
        result = await self.repository.get_org_concept(concept_id, org_id)
        if result is None:
            return None
        concept, cs = result[0], result[1]
        return _org_concept_response(concept, cs)

    async def patch_concept(
        self, concept_id: int, req: PatchConceptRequest, org_id: str
    ) -> OrgConceptResponse | None:
        result = await self.repository.patch_org_concept(
            concept_id, org_id, req.display, req.definition
        )
        if result is None:
            return None
        concept, cs = result[0], result[1]
        return _org_concept_response(concept, cs)

    async def delete_concept(self, concept_id: int, org_id: str) -> bool:
        return await self.repository.delete_org_concept(concept_id, org_id)

    async def list_org_concepts(
        self,
        org_id: str,
        code_system_url: str | None,
        q: str | None,
        limit: int,
        offset: int,
    ) -> OrgConceptListResponse:
        count, rows = await self.repository.list_org_concepts(
            org_id, code_system_url, q, limit, offset
        )
        return OrgConceptListResponse(
            total=count,
            limit=limit,
            offset=offset,
            data=[_org_concept_response(concept, cs) for concept, cs in rows],
        )

    async def list_audit_log(
        self,
        action: str | None,
        performed_by: str | None,
        concept_id: int | None,
        limit: int,
        offset: int,
    ) -> AuditLogListResponse:
        count, rows = await self.repository.list_audit_log(
            action, performed_by, concept_id, limit, offset
        )
        data = [
            AuditLogRecord(
                id=entry.id,
                action=entry.action,
                concept_id=entry.concept_id,
                value_set_id=entry.value_set_id,
                performed_by=entry.performed_by,
                old_value=entry.old_value,
                new_value=entry.new_value,
                created_at=entry.created_at,
            )
            for entry in rows
        ]
        return AuditLogListResponse(total=count, limit=limit, offset=offset, data=data)

    async def validate(self, req: ValidateRequest) -> ValidateResponse:
        binding = await self.repository.get_field_binding(req.resource, req.field)
        if binding is None:
            cs, concept = await self.repository.lookup_concept(req.system, req.code)
            return ValidateResponse(
                valid=True,
                in_value_set=False,
                concept=_concept_response(concept, cs) if concept else None,
                message=f"No value set bound to {req.resource}.{req.field} — code accepted as-is.",
            )
        vs = await self.repository.get_value_set(binding.value_set_id)
        cs, concept, in_vs = await self.repository.lookup_concept_in_value_set(
            binding.value_set_id, req.system, req.code
        )
        strength = binding.binding_strength
        if in_vs:
            valid = True
            message = f"Code '{req.code}' is valid for {req.resource}.{req.field}."
        elif strength == "required":
            valid = False
            message = (
                f"Code '{req.code}' is NOT in the required value set for {req.resource}.{req.field}. "
                f"Value set: {vs.canonical_url if vs else 'unknown'}."
            )
        else:
            valid = True
            message = (
                f"Code '{req.code}' is not in the {strength} value set for {req.resource}.{req.field}, "
                "but is allowed as an extension."
            )
        return ValidateResponse(
            valid=valid,
            in_value_set=in_vs,
            binding_strength=strength,
            concept=_concept_response(concept, cs) if concept else None,
            value_set=_vs_response(vs) if vs else None,
            message=message,
        )
