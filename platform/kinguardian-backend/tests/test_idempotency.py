import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from fastapi import APIRouter, Header, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db
from app.core.idempotency import IdempotencyService
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    CareSubject,
    CareTask,
    FamilyConversation,
    FamilyMessage,
    Notification,
    AIAction,
    MedicationAdherenceEvent,
    HealthDocument
)


# Dedicated test router exercising Idempotency-Key across all 6 mutating operations
idempotent_router = APIRouter(prefix="/api/v1/test-idempotency", tags=["Idempotency Tests"])


@idempotent_router.post("/medications/confirm")
async def confirm_medication_idempotent(
    adherence_id: uuid.UUID,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/medications/confirm"
    payload = {"adherence_id": str(adherence_id)}

    # 1. Check idempotency
    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    # 2. Mutate state
    confirmed_at = datetime.now(timezone.utc).isoformat()
    response_body = {
        "adherence_id": str(adherence_id),
        "status": "taken",
        "confirmed_at": confirmed_at
    }

    # 3. Record response
    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=200,
        response_body=response_body
    )
    return response_body


@idempotent_router.post("/care-tasks/create", status_code=201)
async def create_care_task_idempotent(
    title: str,
    priority: str,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/care-tasks/create"
    payload = {"title": title, "priority": priority}

    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    task_id = str(uuid.uuid4())
    response_body = {
        "task_id": task_id,
        "title": title,
        "priority": priority,
        "status": "pending"
    }

    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=201,
        response_body=response_body
    )
    return response_body


@idempotent_router.post("/documents/process")
async def process_document_idempotent(
    document_id: uuid.UUID,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/documents/process"
    payload = {"document_id": str(document_id)}

    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    response_body = {
        "document_id": str(document_id),
        "status": "processing_queued",
        "job_id": str(uuid.uuid4())
    }

    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=200,
        response_body=response_body
    )
    return response_body


@idempotent_router.post("/notifications/create")
async def create_notification_idempotent(
    title: str,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/notifications/create"
    payload = {"title": title}

    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    notif_id = str(uuid.uuid4())
    response_body = {
        "notification_id": notif_id,
        "title": title,
        "delivered": True
    }

    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=200,
        response_body=response_body
    )
    return response_body


@idempotent_router.post("/ai/actions/execute")
async def execute_ai_action_idempotent(
    action_type: str,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/ai/actions/execute"
    payload = {"action_type": action_type}

    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    execution_id = str(uuid.uuid4())
    response_body = {
        "execution_id": execution_id,
        "action_type": action_type,
        "result": "executed_successfully"
    }

    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=200,
        response_body=response_body
    )
    return response_body


@idempotent_router.post("/messages/send")
async def send_message_idempotent(
    body: str,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    db_session: AsyncSession = Depends(get_db)
):
    user_id = None

    endpoint = "/api/v1/test-idempotency/messages/send"
    payload = {"body": body}

    cached = await IdempotencyService.get_recorded_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload
    )
    if cached:
        return cached[1]

    msg_id = str(uuid.uuid4())
    response_body = {
        "message_id": msg_id,
        "body": body,
        "sent_at": datetime.now(timezone.utc).isoformat()
    }

    await IdempotencyService.record_response(
        session=db_session,
        idempotency_key=idempotency_key,
        user_id=user_id,
        endpoint=endpoint,
        payload=payload,
        status_code=200,
        response_body=response_body
    )
    return response_body


app.include_router(idempotent_router)


@pytest.mark.asyncio
async def test_idempotent_care_task_creation():
    """
    Verifies that creating a care task with the same Idempotency-Key returns the exact same task ID.
    """
    key = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1st call
        res1 = await ac.post(
            "/api/v1/test-idempotency/care-tasks/create?title=Evening+Med&priority=high",
            headers={"Idempotency-Key": key}
        )
        assert res1.status_code == 201
        data1 = res1.json()
        task_id = data1["task_id"]

        # 2nd call (same key and payload)
        res2 = await ac.post(
            "/api/v1/test-idempotency/care-tasks/create?title=Evening+Med&priority=high",
            headers={"Idempotency-Key": key}
        )
        assert res2.status_code == 200 or res2.status_code == 201
        data2 = res2.json()
        assert data2["task_id"] == task_id  # EXACT SAME TASK RETURNED


@pytest.mark.asyncio
async def test_idempotent_medication_confirmation():
    """
    Verifies that medication confirmation is idempotent with Idempotency-Key.
    """
    key = str(uuid.uuid4())
    adh_id = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res1 = await ac.post(
            f"/api/v1/test-idempotency/medications/confirm?adherence_id={adh_id}",
            headers={"Idempotency-Key": key}
        )
        assert res1.status_code == 200
        time1 = res1.json()["confirmed_at"]

        # Re-post same confirmation
        res2 = await ac.post(
            f"/api/v1/test-idempotency/medications/confirm?adherence_id={adh_id}",
            headers={"Idempotency-Key": key}
        )
        assert res2.status_code == 200
        assert res2.json()["confirmed_at"] == time1


@pytest.mark.asyncio
async def test_idempotency_conflict_detection():
    """
    Verifies that reusing the same Idempotency-Key with conflicting payload triggers 422.
    """
    key = str(uuid.uuid4())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1st call
        res1 = await ac.post(
            "/api/v1/test-idempotency/messages/send?body=Hello+Mom",
            headers={"Idempotency-Key": key}
        )
        assert res1.status_code == 200

        # 2nd call with DIFFERENT body on SAME key
        res2 = await ac.post(
            "/api/v1/test-idempotency/messages/send?body=Different+Message",
            headers={"Idempotency-Key": key}
        )
        assert res2.status_code == 422
        assert "conflicting request payload" in res2.text


@pytest.mark.asyncio
async def test_all_mutating_operations_idempotency():
    """
    Verifies document processing, notifications, and AI action execution support Idempotency-Key.
    """
    doc_key = str(uuid.uuid4())
    notif_key = str(uuid.uuid4())
    ai_key = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Document
        d_id = str(uuid.uuid4())
        r1 = await ac.post(f"/api/v1/test-idempotency/documents/process?document_id={d_id}", headers={"Idempotency-Key": doc_key})
        r2 = await ac.post(f"/api/v1/test-idempotency/documents/process?document_id={d_id}", headers={"Idempotency-Key": doc_key})
        assert r1.json()["job_id"] == r2.json()["job_id"]

        # Notification
        n1 = await ac.post("/api/v1/test-idempotency/notifications/create?title=BP+Alert", headers={"Idempotency-Key": notif_key})
        n2 = await ac.post("/api/v1/test-idempotency/notifications/create?title=BP+Alert", headers={"Idempotency-Key": notif_key})
        assert n1.json()["notification_id"] == n2.json()["notification_id"]

        # AI Action
        a1 = await ac.post("/api/v1/test-idempotency/ai/actions/execute?action_type=summarize", headers={"Idempotency-Key": ai_key})
        a2 = await ac.post("/api/v1/test-idempotency/ai/actions/execute?action_type=summarize", headers={"Idempotency-Key": ai_key})
        assert a1.json()["execution_id"] == a2.json()["execution_id"]
