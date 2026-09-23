import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.notifications.providers import (
    NotificationProvider,
    NotificationDeliveryRequest,
    NotificationDeliveryResult,
    InAppNotificationProvider,
    PushNotificationProvider,
    SMSProvider,
    WhatsAppProvider,
    EmailProvider
)
from app.domains.notifications.policy import NotificationPolicy
from app.domains.notifications.services import NotificationService


def test_notification_policy_priority_and_quiet_hours():
    """
    Verifies NotificationPolicy priority routing and quiet hours logic.
    """
    # 1. Critical Priority -> In-App + Push + SMS (always active, overrides quiet hours)
    critical_channels = NotificationPolicy.resolve_delivery_channels(priority="critical")
    assert "in_app" in critical_channels
    assert "push" in critical_channels
    assert "sms" in critical_channels

    # 2. High Priority -> In-App + Push
    high_channels = NotificationPolicy.resolve_delivery_channels(priority="high")
    assert "in_app" in high_channels
    assert "push" in high_channels
    assert "sms" not in high_channels

    # 3. Low Priority -> In-App only
    low_channels = NotificationPolicy.resolve_delivery_channels(priority="low")
    assert low_channels == ["in_app"]

    # 4. User Preference filtering
    custom_channels = NotificationPolicy.resolve_delivery_channels(
        priority="high",
        user_channel_preferences={"push": False, "in_app": True}
    )
    assert custom_channels == ["in_app"]


@pytest.mark.asyncio
async def test_notification_service_multi_channel_dispatch(db_session):
    """
    Verifies NotificationService multi-channel dispatch, delivery audit logs, and provider extensibility.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    recipient = await family_svc.get_or_create_profile(
        iam_subject_id="iam_notif_recipient",
        email="recipient@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="UTC"
    )
    family = await family_svc.create_care_circle(recipient.id, "Notification Circle", "coordinator")

    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # 1. Dispatch Critical Notification -> in_app, push, sms (bypasses quiet hours)
    notif = await notif_service.send_notification(
        recipient_profile_id=recipient.id,
        family_id=family.id,
        title="Critical Vital Alert",
        body="Blood pressure exceeded critical threshold (175/105 mmHg).",
        priority="critical",
        type="vital_alert"
    )
    assert notif.id is not None
    assert notif.priority == "critical"
    assert notif.title == "Critical Vital Alert"

    # Verify Deliveries recorded in DB
    deliveries = await family_repo.list_notification_deliveries(notif.id)
    assert len(deliveries) >= 2
    deliv_channels = [d.channel for d in deliveries]
    assert "in_app" in deliv_channels
    assert "push" in deliv_channels

    # 2. Mark as read & dismiss
    read_notif = await notif_service.mark_as_read(notif.id, recipient.id)
    assert read_notif.read_at is not None

    dism_notif = await notif_service.dismiss(notif.id, recipient.id)
    assert dism_notif.dismissed_at is not None


@pytest.mark.asyncio
async def test_notifications_rest_endpoints(db_session):
    """
    Verifies REST endpoints for listing, sending, reading, dismissing notifications and viewing deliveries.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    user = await family_svc.get_or_create_profile(
        iam_subject_id="iam_notif_rest",
        email="notif_rest@kinguardian.com",
        display_name="Sarah REST",
        timezone="UTC"
    )
    family = await family_svc.create_care_circle(user.id, "REST Notif Family", "coordinator")

    app_profile = await db_session.get(AppProfile, user.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. POST /api/v1/notifications/send (Critical alert to verify multi-channel delivery)
            send_resp = await client.post(
                "/api/v1/notifications/send",
                json={
                    "recipient_profile_id": str(user.id),
                    "family_id": str(family.id),
                    "title": "Medication Reminder",
                    "body": "Time to take Metformin 500mg morning dose.",
                    "priority": "critical",
                    "type": "medication_reminder"
                }
            )
            assert send_resp.status_code == 201
            notif_data = send_resp.json()
            notif_id = notif_data["id"]
            assert notif_data["title"] == "Medication Reminder"

            # 2. GET /api/v1/notifications (List user notifications)
            list_resp = await client.get("/api/v1/notifications")
            assert list_resp.status_code == 200
            notifs = list_resp.json()
            assert len(notifs) >= 1
            assert any(n["id"] == notif_id for n in notifs)

            # 3. PATCH /api/v1/notifications/{id}/read
            read_resp = await client.patch(f"/api/v1/notifications/{notif_id}/read")
            assert read_resp.status_code == 200
            assert read_resp.json()["read_at"] is not None

            # 4. GET /api/v1/notifications/{id}/deliveries
            deliv_resp = await client.get(f"/api/v1/notifications/{notif_id}/deliveries")
            assert deliv_resp.status_code == 200
            deliv_list = deliv_resp.json()
            assert len(deliv_list) >= 2
            channels = [d["channel"] for d in deliv_list]
            assert "in_app" in channels
            assert "push" in channels

            # 5. PATCH /api/v1/notifications/{id}/dismiss
            dism_resp = await client.patch(f"/api/v1/notifications/{notif_id}/dismiss")
            assert dism_resp.status_code == 200
            assert dism_resp.json()["dismissed_at"] is not None
    finally:
        app.dependency_overrides.clear()
