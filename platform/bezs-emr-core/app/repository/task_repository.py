from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.task.enums import (
    TaskInsuranceReferenceType,
    TaskLocationReferenceType,
    TaskOwnerReferenceType,
    TaskPartOfReferenceType,
    TaskPriority,
    TaskRequesterReferenceType,
    TaskRelevantHistoryReferenceType,
    TaskRestrictionRecipientReferenceType,
    TaskStatus,
    TaskIntent,
)
from app.models.enums import EncounterReferenceType
from app.models.task.task import (
    TaskBasedOn,
    TaskIdentifier,
    TaskInput,
    TaskInsurance,
    TaskModel,
    TaskNote,
    TaskOutput,
    TaskPartOf,
    TaskPerformerType,
    TaskRelevantHistory,
    TaskRestrictionRecipient,
)
from app.schemas.task.input import TaskCreateSchema, TaskPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(TaskModel.identifiers),
        selectinload(TaskModel.based_on),
        selectinload(TaskModel.part_of),
        selectinload(TaskModel.performer_types),
        selectinload(TaskModel.insurance),
        selectinload(TaskModel.notes),
        selectinload(TaskModel.relevant_history),
        selectinload(TaskModel.restriction_recipients),
        selectinload(TaskModel.inputs),
        selectinload(TaskModel.outputs),
    )


def _parse_ref_closed(ref: str, enum_cls, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )
    try:
        ref_type = enum_cls(parts[0])
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for {field}. Allowed: {allowed}.",
        )
    return ref_type, ref_id


def _parse_ref_open(ref: str, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )
    return parts[0], ref_id


def _parse_ref_closed_optional(ref: Optional[str], enum_cls, field: str):
    if not ref:
        return None, None
    return _parse_ref_closed(ref, enum_cls, field)


def _parse_ref_open_optional(ref: Optional[str], field: str):
    if not ref:
        return None, None
    return _parse_ref_open(ref, field)


def _cast_status(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return TaskStatus(v).value
    except ValueError:
        allowed = [e.value for e in TaskStatus]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{v}'. Allowed: {allowed}.",
        )


def _cast_intent(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return TaskIntent(v).value
    except ValueError:
        allowed = [e.value for e in TaskIntent]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid intent '{v}'. Allowed: {allowed}.",
        )


def _cast_priority(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return TaskPriority(v).value
    except ValueError:
        allowed = [e.value for e in TaskPriority]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid priority '{v}'. Allowed: {allowed}.",
        )


class TaskRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_task_id(self, task_id: int) -> Optional[TaskModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(TaskModel).where(TaskModel.task_id == task_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id):
        if user_id:
            stmt = stmt.where(TaskModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(TaskModel.org_id == org_id)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[TaskModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(TaskModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(TaskModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(TaskModel.task_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[TaskModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(TaskModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(TaskModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(TaskModel.task_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _build_children(self, session, task, org_id, payload):
        for item in (payload.identifiers or []):
            session.add(TaskIdentifier(
                task=task, org_id=org_id,
                use=item.use,
                type_system=item.type_system,
                type_code=item.type_code,
                type_display=item.type_display,
                type_text=item.type_text,
                system=item.system,
                value=item.value,
                period_start=item.period_start,
                period_end=item.period_end,
                assigner=item.assigner,
            ))

        for item in (payload.based_on or []):
            ref_type, ref_id = _parse_ref_open(item.reference, "based_on.reference")
            session.add(TaskBasedOn(
                task=task, org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=item.reference_display,
            ))

        for item in (payload.part_of or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, TaskPartOfReferenceType, "part_of.reference")
            session.add(TaskPartOf(
                task=task, org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=item.reference_display,
            ))

        for item in (payload.performer_types or []):
            session.add(TaskPerformerType(
                task=task, org_id=org_id,
                coding_system=item.coding_system,
                coding_code=item.coding_code,
                coding_display=item.coding_display,
                text=item.text,
            ))

        for item in (payload.insurance or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, TaskInsuranceReferenceType, "insurance.reference")
            session.add(TaskInsurance(
                task=task, org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=item.reference_display,
            ))

        for item in (payload.notes or []):
            auth_ref_type, auth_ref_id = _parse_ref_open_optional(item.author_reference, "note.author_reference")
            session.add(TaskNote(
                task=task, org_id=org_id,
                text=item.text,
                time=item.time,
                author_string=item.author_string,
                author_reference_type=auth_ref_type,
                author_reference_id=auth_ref_id,
                author_reference_display=item.author_reference_display,
            ))

        for item in (payload.relevant_history or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, TaskRelevantHistoryReferenceType, "relevant_history.reference")
            session.add(TaskRelevantHistory(
                task=task, org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=item.reference_display,
            ))

        for item in (payload.restriction_recipients or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, TaskRestrictionRecipientReferenceType, "restriction_recipient.reference")
            session.add(TaskRestrictionRecipient(
                task=task, org_id=org_id,
                reference_type=ref_type,
                reference_id=ref_id,
                reference_display=item.reference_display,
            ))

        for item in (payload.inputs or []):
            val_ref_type, val_ref_id = _parse_ref_open_optional(item.value_reference, "input.value_reference")
            session.add(TaskInput(
                task=task, org_id=org_id,
                type_system=item.type_system,
                type_code=item.type_code,
                type_display=item.type_display,
                type_text=item.type_text,
                value_boolean=item.value_boolean,
                value_code=item.value_code,
                value_date=item.value_date,
                value_date_time=item.value_date_time,
                value_decimal=item.value_decimal,
                value_integer=item.value_integer,
                value_string=item.value_string,
                value_uri=item.value_uri,
                value_reference_type=val_ref_type,
                value_reference_id=val_ref_id,
                value_reference_display=item.value_reference_display,
            ))

        for item in (payload.outputs or []):
            val_ref_type, val_ref_id = _parse_ref_open_optional(item.value_reference, "output.value_reference")
            session.add(TaskOutput(
                task=task, org_id=org_id,
                type_system=item.type_system,
                type_code=item.type_code,
                type_display=item.type_display,
                type_text=item.type_text,
                value_boolean=item.value_boolean,
                value_code=item.value_code,
                value_date=item.value_date,
                value_date_time=item.value_date_time,
                value_decimal=item.value_decimal,
                value_integer=item.value_integer,
                value_string=item.value_string,
                value_uri=item.value_uri,
                value_reference_type=val_ref_type,
                value_reference_id=val_ref_id,
                value_reference_display=item.value_reference_display,
            ))

    async def create(
        self,
        payload: TaskCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> TaskModel:
        async with self.session_factory() as session:
            focus_type, focus_id = _parse_ref_open_optional(payload.focus, "focus")
            for_ref = payload.model_dump(by_alias=True).get("for") or payload.model_dump().get("for_reference")
            for_type, for_id = _parse_ref_open_optional(for_ref, "for")
            encounter_type, encounter_id = _parse_ref_closed_optional(
                payload.encounter, EncounterReferenceType, "encounter"
            )
            requester_type, requester_id = _parse_ref_closed_optional(
                payload.requester, TaskRequesterReferenceType, "requester"
            )
            owner_type, owner_id = _parse_ref_closed_optional(
                payload.owner, TaskOwnerReferenceType, "owner"
            )
            location_type, location_id = _parse_ref_closed_optional(
                payload.location, TaskLocationReferenceType, "location"
            )
            reason_ref_type, reason_ref_id = _parse_ref_open_optional(
                payload.reason_reference, "reason_reference"
            )

            task = TaskModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=_cast_status(payload.status),
                intent=_cast_intent(payload.intent),
                priority=_cast_priority(payload.priority),
                description=payload.description,
                instantiates_canonical=payload.instantiates_canonical,
                instantiates_uri=payload.instantiates_uri,
                authored_on=payload.authored_on,
                last_modified=payload.last_modified,
                group_identifier_use=payload.group_identifier_use,
                group_identifier_system=payload.group_identifier_system,
                group_identifier_value=payload.group_identifier_value,
                group_identifier_type_system=payload.group_identifier_type_system,
                group_identifier_type_code=payload.group_identifier_type_code,
                group_identifier_type_display=payload.group_identifier_type_display,
                group_identifier_type_text=payload.group_identifier_type_text,
                status_reason_system=payload.status_reason_system,
                status_reason_code=payload.status_reason_code,
                status_reason_display=payload.status_reason_display,
                status_reason_text=payload.status_reason_text,
                business_status_system=payload.business_status_system,
                business_status_code=payload.business_status_code,
                business_status_display=payload.business_status_display,
                business_status_text=payload.business_status_text,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                focus_type=focus_type,
                focus_id=focus_id,
                focus_display=payload.focus_display,
                for_type=for_type,
                for_id=for_id,
                for_display=payload.for_display,
                encounter_type=encounter_type,
                encounter_id=encounter_id,
                encounter_display=payload.encounter_display,
                execution_period_start=payload.execution_period_start,
                execution_period_end=payload.execution_period_end,
                requester_type=requester_type,
                requester_id=requester_id,
                requester_display=payload.requester_display,
                owner_type=owner_type,
                owner_id=owner_id,
                owner_display=payload.owner_display,
                location_type=location_type,
                location_id=location_id,
                location_display=payload.location_display,
                reason_code_system=payload.reason_code_system,
                reason_code_code=payload.reason_code_code,
                reason_code_display=payload.reason_code_display,
                reason_code_text=payload.reason_code_text,
                reason_reference_type=reason_ref_type,
                reason_reference_id=reason_ref_id,
                reason_reference_display=payload.reason_reference_display,
                restriction_repetitions=payload.restriction_repetitions,
                restriction_period_start=payload.restriction_period_start,
                restriction_period_end=payload.restriction_period_end,
            )
            session.add(task)
            self._build_children(session, task, org_id, payload)

            try:
                await session.commit()
                await session.refresh(task)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_task_id(task.task_id)

    async def patch(
        self,
        task_id: int,
        payload: TaskPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[TaskModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(select(TaskModel).where(TaskModel.task_id == task_id))
            result = await session.execute(stmt)
            task = result.scalars().first()
            if not task:
                return None

            updates = payload.model_dump(exclude_unset=True, by_alias=True)

            scalar_fields = {
                "description", "instantiates_canonical", "instantiates_uri",
                "authored_on", "last_modified",
                "group_identifier_use", "group_identifier_system", "group_identifier_value",
                "group_identifier_type_system", "group_identifier_type_code",
                "group_identifier_type_display", "group_identifier_type_text",
                "status_reason_system", "status_reason_code", "status_reason_display", "status_reason_text",
                "business_status_system", "business_status_code", "business_status_display", "business_status_text",
                "code_system", "code_code", "code_display", "code_text",
                "focus_display", "for_display", "encounter_display",
                "execution_period_start", "execution_period_end",
                "requester_display", "owner_display", "location_display",
                "reason_code_system", "reason_code_code", "reason_code_display", "reason_code_text",
                "reason_reference_display",
                "restriction_repetitions", "restriction_period_start", "restriction_period_end",
            }

            # Normalize "for" alias back to internal name
            if "for" in updates:
                updates["for_reference"] = updates.pop("for")

            for field, value in updates.items():
                if field in scalar_fields:
                    setattr(task, field, value)
                elif field == "status" and value is not None:
                    task.status = _cast_status(value)
                elif field == "intent" and value is not None:
                    task.intent = _cast_intent(value)
                elif field == "priority":
                    task.priority = _cast_priority(value)
                elif field == "focus" and value is not None:
                    t, i = _parse_ref_open(value, "focus")
                    task.focus_type = t
                    task.focus_id = i
                elif field == "for_reference" and value is not None:
                    t, i = _parse_ref_open(value, "for")
                    task.for_type = t
                    task.for_id = i
                elif field == "encounter" and value is not None:
                    t, i = _parse_ref_closed(value, EncounterReferenceType, "encounter")
                    task.encounter_type = t
                    task.encounter_id = i
                elif field == "requester" and value is not None:
                    t, i = _parse_ref_closed(value, TaskRequesterReferenceType, "requester")
                    task.requester_type = t
                    task.requester_id = i
                elif field == "owner" and value is not None:
                    t, i = _parse_ref_closed(value, TaskOwnerReferenceType, "owner")
                    task.owner_type = t
                    task.owner_id = i
                elif field == "location" and value is not None:
                    t, i = _parse_ref_closed(value, TaskLocationReferenceType, "location")
                    task.location_type = t
                    task.location_id = i
                elif field == "reason_reference" and value is not None:
                    t, i = _parse_ref_open(value, "reason_reference")
                    task.reason_reference_type = t
                    task.reason_reference_id = i
                elif field == "identifiers" and value is not None:
                    for existing in list(task.identifiers):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        session.add(TaskIdentifier(
                            task=task, org_id=task.org_id,
                            use=item.get("use"),
                            type_system=item.get("type_system"),
                            type_code=item.get("type_code"),
                            type_display=item.get("type_display"),
                            type_text=item.get("type_text"),
                            system=item.get("system"),
                            value=item.get("value"),
                            period_start=item.get("period_start"),
                            period_end=item.get("period_end"),
                            assigner=item.get("assigner"),
                        ))
                elif field == "based_on" and value is not None:
                    for existing in list(task.based_on):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        t, i = _parse_ref_open(item["reference"], "based_on.reference")
                        session.add(TaskBasedOn(
                            task=task, org_id=task.org_id,
                            reference_type=t, reference_id=i,
                            reference_display=item.get("reference_display"),
                        ))
                elif field == "part_of" and value is not None:
                    for existing in list(task.part_of):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        t, i = _parse_ref_closed(item["reference"], TaskPartOfReferenceType, "part_of.reference")
                        session.add(TaskPartOf(
                            task=task, org_id=task.org_id,
                            reference_type=t, reference_id=i,
                            reference_display=item.get("reference_display"),
                        ))
                elif field == "performer_types" and value is not None:
                    for existing in list(task.performer_types):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        session.add(TaskPerformerType(
                            task=task, org_id=task.org_id,
                            coding_system=item.get("coding_system"),
                            coding_code=item.get("coding_code"),
                            coding_display=item.get("coding_display"),
                            text=item.get("text"),
                        ))
                elif field == "insurance" and value is not None:
                    for existing in list(task.insurance):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        t, i = _parse_ref_closed(item["reference"], TaskInsuranceReferenceType, "insurance.reference")
                        session.add(TaskInsurance(
                            task=task, org_id=task.org_id,
                            reference_type=t, reference_id=i,
                            reference_display=item.get("reference_display"),
                        ))
                elif field == "notes" and value is not None:
                    for existing in list(task.notes):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        auth_ref_type, auth_ref_id = _parse_ref_open_optional(
                            item.get("author_reference"), "note.author_reference"
                        )
                        session.add(TaskNote(
                            task=task, org_id=task.org_id,
                            text=item["text"],
                            time=item.get("time"),
                            author_string=item.get("author_string"),
                            author_reference_type=auth_ref_type,
                            author_reference_id=auth_ref_id,
                            author_reference_display=item.get("author_reference_display"),
                        ))
                elif field == "relevant_history" and value is not None:
                    for existing in list(task.relevant_history):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        t, i = _parse_ref_closed(item["reference"], TaskRelevantHistoryReferenceType, "relevant_history.reference")
                        session.add(TaskRelevantHistory(
                            task=task, org_id=task.org_id,
                            reference_type=t, reference_id=i,
                            reference_display=item.get("reference_display"),
                        ))
                elif field == "restriction_recipients" and value is not None:
                    for existing in list(task.restriction_recipients):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        t, i = _parse_ref_closed(item["reference"], TaskRestrictionRecipientReferenceType, "restriction_recipient.reference")
                        session.add(TaskRestrictionRecipient(
                            task=task, org_id=task.org_id,
                            reference_type=t, reference_id=i,
                            reference_display=item.get("reference_display"),
                        ))
                elif field == "inputs" and value is not None:
                    for existing in list(task.inputs):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        val_ref_type, val_ref_id = _parse_ref_open_optional(
                            item.get("value_reference"), "input.value_reference"
                        )
                        session.add(TaskInput(
                            task=task, org_id=task.org_id,
                            type_system=item.get("type_system"),
                            type_code=item.get("type_code"),
                            type_display=item.get("type_display"),
                            type_text=item.get("type_text"),
                            value_boolean=item.get("value_boolean"),
                            value_code=item.get("value_code"),
                            value_date=item.get("value_date"),
                            value_date_time=item.get("value_date_time"),
                            value_decimal=item.get("value_decimal"),
                            value_integer=item.get("value_integer"),
                            value_string=item.get("value_string"),
                            value_uri=item.get("value_uri"),
                            value_reference_type=val_ref_type,
                            value_reference_id=val_ref_id,
                            value_reference_display=item.get("value_reference_display"),
                        ))
                elif field == "outputs" and value is not None:
                    for existing in list(task.outputs):
                        await session.delete(existing)
                    await session.flush()
                    for item in value:
                        val_ref_type, val_ref_id = _parse_ref_open_optional(
                            item.get("value_reference"), "output.value_reference"
                        )
                        session.add(TaskOutput(
                            task=task, org_id=task.org_id,
                            type_system=item.get("type_system"),
                            type_code=item.get("type_code"),
                            type_display=item.get("type_display"),
                            type_text=item.get("type_text"),
                            value_boolean=item.get("value_boolean"),
                            value_code=item.get("value_code"),
                            value_date=item.get("value_date"),
                            value_date_time=item.get("value_date_time"),
                            value_decimal=item.get("value_decimal"),
                            value_integer=item.get("value_integer"),
                            value_string=item.get("value_string"),
                            value_uri=item.get("value_uri"),
                            value_reference_type=val_ref_type,
                            value_reference_id=val_ref_id,
                            value_reference_display=item.get("value_reference_display"),
                        ))

            task.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(task)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_task_id(task_id)

    async def delete(self, task_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(TaskModel).where(TaskModel.task_id == task_id)
            result = await session.execute(stmt)
            task = result.scalars().first()
            if not task:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Task not found",
                )
            try:
                await session.delete(task)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
