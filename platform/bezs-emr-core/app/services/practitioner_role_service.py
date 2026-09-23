from typing import List, Optional, Tuple

from app.fhir.mappers.practitioner import to_fhir_practitioner
from app.fhir.mappers.practitioner_role import to_fhir_practitioner_role, to_plain_practitioner_role
from app.models.practitioner_role.practitioner_role import PractitionerRoleModel
from app.repository.practitioner_role_repository import PractitionerRoleRepository
from app.schemas.practitioner_role import PractitionerRoleCreateSchema, PractitionerRolePatchSchema


class PractitionerRoleService:
    def __init__(self, repository: PractitionerRoleRepository):
        self.repository = repository

    def _to_fhir(self, pr: PractitionerRoleModel) -> dict:
        return to_fhir_practitioner_role(pr)

    def _to_plain(self, pr: PractitionerRoleModel) -> dict:
        return to_plain_practitioner_role(pr)

    async def get_raw_by_practitioner_role_id(
        self, practitioner_role_id: int
    ) -> Optional[PractitionerRoleModel]:
        return await self.repository.get_by_practitioner_role_id(practitioner_role_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        practitioner_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            active=active, practitioner_id=practitioner_id,
            limit=limit, offset=offset,
        )

    async def list_practitioner_roles(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        practitioner_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id,
            active=active, practitioner_id=practitioner_id,
            limit=limit, offset=offset,
        )

    async def create_practitioner_role(
        self,
        payload: PractitionerRoleCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> PractitionerRoleModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_practitioner_role(
        self,
        practitioner_role_id: int,
        payload: PractitionerRolePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[PractitionerRoleModel]:
        return await self.repository.patch(practitioner_role_id, payload, updated_by)

    async def delete_practitioner_role(self, practitioner_role_id: int) -> None:
        await self.repository.delete(practitioner_role_id)

    async def list_for_booking(
        self,
        org_id: Optional[str] = None,
        active: Optional[bool] = True,
        specialty_code: Optional[str] = None,
        day_of_week: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerRoleModel], int, dict, dict]:
        return await self.repository.list_for_booking(
            org_id=org_id,
            active=active,
            specialty_code=specialty_code,
            day_of_week=day_of_week,
            limit=limit,
            offset=offset,
        )

    def _to_fhir_booking(self, pr: PractitionerRoleModel, loc_lookup: dict = None, hs_lookup: dict = None) -> dict:
        result = to_fhir_practitioner_role(pr)
        if pr.practitioner:
            contained = to_fhir_practitioner(pr.practitioner)
            contained["id"] = "pr"
            result["contained"] = [contained]
            result["practitioner"] = {"reference": "#pr"}
        return result

    def _to_plain_booking(self, pr: PractitionerRoleModel, loc_lookup: dict = None, hs_lookup: dict = None) -> dict:
        result = to_plain_practitioner_role(pr)

        if pr.practitioner:
            prac = pr.practitioner
            name = prac.names[0] if prac.names else None
            result["practitioner_detail"] = {
                "id": prac.practitioner_id,
                "gender": prac.gender.value if prac.gender else None,
                "birth_date": prac.birth_date.isoformat() if prac.birth_date else None,
                "name": {
                    "text": name.text,
                    "family": name.family,
                    "given": name.given.split(",") if name.given else [],
                    "prefix": name.prefix.split(",") if name.prefix else [],
                    "suffix": name.suffix.split(",") if name.suffix else [],
                } if name else None,
                "telecom": [
                    {
                        "system": t.system.value if t.system else None,
                        "value": t.value,
                        "use": t.use.value if t.use else None,
                        "rank": t.rank,
                    }
                    for t in (prac.telecoms or [])
                ],
                "languages": [
                    {
                        "code": c.language_code,
                        "display": c.language_display,
                        "preferred": c.preferred,
                    }
                    for c in (prac.communications or [])
                    if c.language_code
                ],
                "qualifications": [
                    {
                        "code": q.code_code,
                        "display": q.code_display,
                        "text": q.code_text,
                        "period_start": q.period_start.isoformat() if q.period_start else None,
                        "issuer": q.issuer_display,
                        "npi": next(
                            (qi.value for qi in (q.identifiers or []) if qi.type_code == "NPI"),
                            None,
                        ),
                    }
                    for q in (prac.qualifications or [])
                ],
                "photo_url": prac.photos[0].url if prac.photos else None,
            }
        else:
            result["practitioner_detail"] = None

        # Enrich location entries with Location model data
        if loc_lookup:
            enriched = []
            for entry in result.get("location") or []:
                lm = loc_lookup.get(entry.get("reference_id"))
                if lm:
                    phone = next(
                        (t.value for t in (lm.telecoms or []) if t.system and t.system.value == "phone"),
                        None,
                    )
                    entry = {
                        **entry,
                        "name": lm.name,
                        "address_text": lm.address_text,
                        "address_city": lm.address_city,
                        "address_state": lm.address_state,
                        "address_postal_code": lm.address_postal_code,
                        "address_country": lm.address_country,
                        "phone": phone,
                    }
                enriched.append(entry)
            result["location"] = enriched

        # Enrich healthcare_service entries with HealthcareService model data
        if hs_lookup:
            enriched = []
            for entry in result.get("healthcare_service") or []:
                hm = hs_lookup.get(entry.get("reference_id"))
                if hm:
                    category = hm.categories[0].coding_display if hm.categories else None
                    entry = {
                        **entry,
                        "name": hm.name,
                        "comment": hm.comment,
                        "appointment_required": hm.appointment_required,
                        "category": category,
                        "availability_exceptions": hm.availability_exceptions,
                    }
                enriched.append(entry)
            result["healthcare_service"] = enriched

        return result
