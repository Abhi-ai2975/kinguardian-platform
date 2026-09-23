import pytest
import uuid
from datetime import datetime, timezone

from app.core.timezones import TimezoneService, DualTimezoneView
from app.domains.family.infrastructure.models import AppProfile, CareSubject
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService


def test_cross_border_dual_timezone_conversions():
    """
    Verifies cross-border dual timezone conversion between Parent (Asia/Kolkata)
    and Coordinator (Europe/London).
    """
    # 2026-08-23 08:30:00 UTC
    utc_dt = datetime(2026, 8, 23, 8, 30, 0, tzinfo=timezone.utc)

    # 1. Parent in India (UTC +5:30 -> 14:00 IST)
    parent_local = TimezoneService.format_local(utc_dt, "Asia/Kolkata")
    assert "2026-08-23 14:00:00" in parent_local
    assert "IST" in parent_local or "+0530" in parent_local or "Asia/Kolkata" in parent_local

    # 2. Coordinator in London (British Summer Time UTC +1:00 -> 09:30 BST)
    coord_local = TimezoneService.format_local(utc_dt, "Europe/London")
    assert "2026-08-23 09:30:00" in coord_local

    # 3. Dual Timezone View
    dual_view = TimezoneService.build_dual_timezone_view(
        utc_dt=utc_dt,
        parent_tz_str="Asia/Kolkata",
        coordinator_tz_str="Europe/London"
    )
    assert isinstance(dual_view, DualTimezoneView)
    assert dual_view.parent_timezone == "Asia/Kolkata"
    assert dual_view.coordinator_timezone == "Europe/London"
    assert "14:00:00" in dual_view.parent_local_time
    assert "09:30:00" in dual_view.coordinator_local_time
    # India (+5.5) - London BST (+1.0) = 4.5 hours difference
    assert dual_view.time_difference_hours == 4.5


def test_unambiguous_utc_conversion_from_local():
    """
    Verifies that local time input with timezone context is converted to unambiguous UTC.
    Never stores local time without timezone context.
    """
    # Local 14:00 in Asia/Kolkata (IST = UTC+5:30)
    local_dt = datetime(2026, 8, 23, 14, 0, 0)
    utc_converted = TimezoneService.to_utc(local_dt, "Asia/Kolkata")

    assert utc_converted.hour == 8
    assert utc_converted.minute == 30
    assert utc_converted.tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_person_profile_and_care_subject_cross_border_attributes(db_session):
    """
    Verifies that every person has timezone, country_code, and city stored and retrieved cleanly.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Coordinator: London, GB, Europe/London
    coord_profile = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_london",
        email="coordinator@kinguardian.co.uk",
        display_name="Sarah Coordinator",
        timezone="Europe/London"
    )
    coord_db = await db_session.get(AppProfile, coord_profile.id)
    coord_db.city = "London"
    coord_db.country_code = "GB"
    await db_session.flush()

    assert coord_db.timezone == "Europe/London"
    assert coord_db.city == "London"
    assert coord_db.country_code == "GB"

    # 2. Parent: Hyderabad, IN, Asia/Kolkata
    parent_profile = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_hyderabad",
        email="parent@kinguardian.in",
        display_name="Ramesh Senior",
        timezone="Asia/Kolkata"
    )
    parent_db = await db_session.get(AppProfile, parent_profile.id)
    parent_db.city = "Hyderabad"
    parent_db.country_code = "IN"
    await db_session.flush()

    assert parent_db.timezone == "Asia/Kolkata"
    assert parent_db.city == "Hyderabad"
    assert parent_db.country_code == "IN"

    # 3. Create Care Circle and Care Subject with Cross-Border Timezone Metadata
    family = await family_svc.create_care_circle(coord_profile.id, "Ramesh Care Circle", "coordinator")

    subject = await family_svc.add_care_subject(
        requester_id=coord_profile.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh-01",
        profile_id=parent_profile.id,
        relationship_to_coordinator="father",
        city="Hyderabad",
        country_code="IN",
        timezone="Asia/Kolkata"
    )

    assert subject.timezone == "Asia/Kolkata"
    assert subject.city == "Hyderabad"
    assert subject.country_code == "IN"
