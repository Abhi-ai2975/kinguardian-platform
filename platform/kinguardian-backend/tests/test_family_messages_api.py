"""
Family Messages & Conversations API Test Suite:
Verifies:
1. GET /families/{family_id}/conversations (cursor pagination)
2. GET /conversations/{id}/messages (cursor pagination)
3. POST /conversations/{id}/messages (posting messages, validation, access control)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_family_messages_and_conversations_api(db_session: AsyncSession):
    """
    Verifies full conversations and messaging workflow with cursor pagination.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Setup Profiles and Care Circle
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_chat_01",
        email="coord.chat@kinguardian.com",
        display_name="Ananya",
        timezone="America/Chicago"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_chat_01",
        email="parent.chat@kinguardian.com",
        display_name="Dev",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Dev Care Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.chat@kinguardian.com",
        role="parent"
    )

    # 2. Create 3 Conversations
    conv1 = await family_service.create_family_conversation(requester_id=coord.id, family_id=family.id)
    conv2 = await family_service.create_family_conversation(requester_id=coord.id, family_id=family.id)
    conv3 = await family_service.create_family_conversation(requester_id=coord.id, family_id=family.id)

    token_coord = create_access_token({"sub": "iam_coord_chat_01", "email": "coord.chat@kinguardian.com"})
    headers_coord = {"Authorization": f"Bearer {token_coord}"}

    token_parent = create_access_token({"sub": "iam_parent_chat_01", "email": "parent.chat@kinguardian.com"})
    headers_parent = {"Authorization": f"Bearer {token_parent}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. GET /families/{family_id}/conversations (Cursor Pagination)
        res_convs_p1 = await client.get(
            f"/api/v1/families/{family.id}/conversations?limit=2",
            headers=headers_coord
        )
        assert res_convs_p1.status_code == 200
        convs_p1 = res_convs_p1.json()
        assert len(convs_p1["items"]) == 2
        assert convs_p1["next_cursor"] is not None

        # Fetch page 2 using cursor
        cursor_conv = convs_p1["next_cursor"]
        res_convs_p2 = await client.get(
            f"/api/v1/families/{family.id}/conversations?cursor={cursor_conv}&limit=2",
            headers=headers_coord
        )
        assert res_convs_p2.status_code == 200
        convs_p2 = res_convs_p2.json()
        assert len(convs_p2["items"]) >= 1

        # B. POST /conversations/{id}/messages (Coordinator posts message)
        post_msg_payload = {
            "message_type": "text",
            "body": "Good morning Dad, did you take your morning blood pressure medication?"
        }
        res_post1 = await client.post(
            f"/api/v1/conversations/{conv1.id}/messages",
            json=post_msg_payload,
            headers=headers_coord
        )
        assert res_post1.status_code == 201
        msg1_data = res_post1.json()
        assert msg1_data["conversation_id"] == str(conv1.id)
        assert msg1_data["sender_profile_id"] == str(coord.id)
        assert msg1_data["body"] == post_msg_payload["body"]

        # C. POST /conversations/{id}/messages (Parent posts reply)
        reply_payload = {
            "message_type": "text",
            "body": "Yes beta, taken with breakfast. BP was 122/80.",
            "reply_to_message_id": msg1_data["id"]
        }
        res_post2 = await client.post(
            f"/api/v1/conversations/{conv1.id}/messages",
            json=reply_payload,
            headers=headers_parent
        )
        assert res_post2.status_code == 201
        msg2_data = res_post2.json()
        assert msg2_data["conversation_id"] == str(conv1.id)
        assert msg2_data["sender_profile_id"] == str(parent.id)
        assert msg2_data["reply_to_message_id"] == msg1_data["id"]

        # Seed additional messages
        for i in range(3):
            await client.post(
                f"/api/v1/conversations/{conv1.id}/messages",
                json={"message_type": "text", "body": f"Follow-up message {i}"},
                headers=headers_coord
            )

        # D. GET /conversations/{id}/messages (Cursor Pagination)
        res_msgs_p1 = await client.get(
            f"/api/v1/conversations/{conv1.id}/messages?limit=2",
            headers=headers_coord
        )
        assert res_msgs_p1.status_code == 200
        msgs_p1 = res_msgs_p1.json()
        assert len(msgs_p1["items"]) == 2
        assert msgs_p1["next_cursor"] is not None

        # Fetch page 2
        cursor_msg = msgs_p1["next_cursor"]
        res_msgs_p2 = await client.get(
            f"/api/v1/conversations/{conv1.id}/messages?cursor={cursor_msg}&limit=2",
            headers=headers_coord
        )
        assert res_msgs_p2.status_code == 200
        msgs_p2 = res_msgs_p2.json()
        assert len(msgs_p2["items"]) == 2

        # E. Authorization: Stranger is rejected (403)
        stranger_token = create_access_token({"sub": "iam_stranger_chat", "email": "stranger.chat@kinguardian.com"})
        headers_stranger = {"Authorization": f"Bearer {stranger_token}"}

        res_stranger_get = await client.get(
            f"/api/v1/conversations/{conv1.id}/messages",
            headers=headers_stranger
        )
        assert res_stranger_get.status_code == 403

        res_stranger_post = await client.post(
            f"/api/v1/conversations/{conv1.id}/messages",
            json={"message_type": "text", "body": "Intruder message"},
            headers=headers_stranger
        )
        assert res_stranger_post.status_code == 403

        # F. Non-existent conversation returns 404
        random_id = uuid.uuid4()
        res_404 = await client.get(
            f"/api/v1/conversations/{random_id}/messages",
            headers=headers_coord
        )
        assert res_404.status_code == 404
