"""
Failure Handling & Resilience Test Suite:
Verifies:
1. FHIR Unavailability: Coordinator Home degrades gracefully (family data available, clinical data marked temporarily unavailable) without failing the page.
2. Notification Provider Failure: Safely persists notification intent and schedules async background retry.
3. AI Generation Failure: Returns safe fallback message:
   'KinGuardian couldn't generate the insight right now. You can review the underlying health information.'
"""

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.resilience.failure_handling import (
    SAFE_AI_FALLBACK_MESSAGE,
    ResilientFHIRHandler,
    ResilientNotificationHandler,
    ResilientAIHandler
)
from app.domains.family.infrastructure.models import (
    Family,
    FamilyMembership,
    CareSubject,
    AppProfile
)
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_fhir_unavailable_home_degradation_without_failing(db_session: AsyncSession):
    """
    Verifies that when FHIR platform is unavailable:
    - Entire home page does NOT fail (HTTP 200 OK)
    - Family data, members, guardian moments, tasks are available
    - Clinical data is marked 'temporarily_unavailable' with warning 'clinical data temporarily unavailable'
    """
    profile = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id=f"iam_{uuid.uuid4().hex}",
        email="coord.resilient@example.com",
        display_name="Dr. Sunita"
    )
    family = Family(
        id=uuid.uuid4(),
        name="Sunita Resilient Circle",
        primary_coordinator_profile_id=profile.id
    )
    mem = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=profile.id,
        membership_role="coordinator",
        status="active"
    )
    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        fhir_patient_id="fhir-pat-sunita-01",
        profile_id=profile.id,
        relationship_to_coordinator="mother"
    )
    db_session.add_all([profile, family, mem, subject])
    await db_session.commit()

    token = create_access_token(
        data={"sub": profile.iam_subject_id, "user_id": str(profile.id), "email": profile.email}
    )
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/families/{family.id}/home?clinical_outage=true",
            headers=headers
        )

        assert resp.status_code == 200
        body = resp.json()

        # Family data is intact
        assert body["family_id"] == str(family.id)
        assert body["family_name"] == "Sunita Resilient Circle"
        assert len(body["subjects"]) >= 1

        # Clinical data degraded gracefully
        assert body["clinical_data_status"] == "temporarily_unavailable"
        assert body["clinical_warning"] == "clinical data temporarily unavailable"
        assert body["medications_today"] == []
        assert body["upcoming_appointments"] == []


def test_notification_provider_failure_persists_intent_for_retry():
    """
    Verifies that when a notification provider fails, the intent is safely
    persisted with 'pending_retry' status and retry scheduled.
    """
    family_id = uuid.uuid4()
    recipient_id = uuid.uuid4()

    intent = ResilientNotificationHandler.build_persisted_intent(
        family_id=family_id,
        recipient_id=recipient_id,
        title="Medication Reminder",
        body="Time to take Metformin 500mg",
        channel="push",
        error_reason="FCM Server Error 503 Service Unavailable"
    )

    assert intent["status"] == "pending_retry"
    assert intent["retry_scheduled"] is True
    assert intent["family_id"] == str(family_id)
    assert intent["recipient_id"] == str(recipient_id)
    assert "FCM Server Error 503" in intent["last_error"]


def test_ai_failure_returns_safe_fallback_message():
    """
    Verifies that when AI generation fails, the system returns the exact safe fallback:
    'KinGuardian couldn't generate the insight right now. You can review the underlying health information.'
    and confirms underlying health data remains accessible.
    """
    subject_id = uuid.uuid4()
    raw_context = {
        "recent_vitals": {"bp": "120/80", "pulse": 72},
        "recent_checkin": "feeling energetic"
    }

    fallback = ResilientAIHandler.get_safe_fallback_insight(
        subject_id=subject_id,
        raw_health_context=raw_context
    )

    assert fallback["summary"] == SAFE_AI_FALLBACK_MESSAGE
    assert "KinGuardian couldn't generate the insight right now" in fallback["summary"]
    assert "You can review the underlying health information" in fallback["summary"]
    assert fallback["is_fallback"] is True
    assert fallback["underlying_health_data_accessible"] is True
    assert fallback["raw_health_context"]["recent_vitals"]["bp"] == "120/80"
