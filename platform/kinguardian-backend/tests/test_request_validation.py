import pytest
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError

from app.domains.family.schemas import (
    ProfileCreate,
    ProfilePatch,
    ProfileResponse,
    CareSubjectCreate,
    CareSubjectPatch,
    CareSubjectResponse,
    CareSubjectQuery,
    CareTaskCreate,
    CareTaskPatch,
    CareTaskResponse,
    CareTaskQuery,
    WellbeingCheckinCreate,
    WellbeingCheckinPatch,
    WellbeingCheckinResponse,
    WellbeingCheckinQuery,
    ConsentCreate,
    ConsentPatch,
    ConsentResponse,
    ConsentQuery,
    HealthDocumentCreate,
    HealthDocumentPatch,
    HealthDocumentResponse,
    HealthDocumentQuery,
    NotificationPatch,
    NotificationResponse,
    NotificationQuery,
    AuditTrailQuery
)


def test_create_schema_validation_and_rejection():
    """
    Verifies that Create schemas validate required fields and reject invalid data types.
    """
    # 1. Valid ProfileCreate
    profile = ProfileCreate(
        iam_subject_id="iam_valid_user",
        email="valid@kinguardian.com",
        display_name="Valid User",
        timezone="Asia/Kolkata",
        preferred_language="hi"
    )
    assert profile.iam_subject_id == "iam_valid_user"
    assert profile.email == "valid@kinguardian.com"

    # Invalid email format in ProfileCreate
    with pytest.raises(ValidationError):
        ProfileCreate(
            iam_subject_id="iam_invalid",
            email="not-an-email"
        )

    # 2. CareTaskCreate validation
    task = CareTaskCreate(
        subject_id=uuid.uuid4(),
        assigned_to_profile_id=uuid.uuid4(),
        title="Check blood sugar",
        category="medication",
        due_at=datetime.now(timezone.utc)
    )
    assert task.title == "Check blood sugar"
    assert task.priority == "medium"  # default value

    # Missing required due_at in CareTaskCreate
    with pytest.raises(ValidationError):
        CareTaskCreate(
            subject_id=uuid.uuid4(),
            assigned_to_profile_id=uuid.uuid4(),
            title="Missing due at",
            category="medication"
        )


def test_patch_schema_partial_updates():
    """
    Verifies that Patch schemas allow partial updates with optional fields.
    """
    # 1. ProfilePatch with only display_name
    patch = ProfilePatch(display_name="Updated Name")
    assert patch.display_name == "Updated Name"
    assert patch.phone is None
    assert patch.city is None

    # 2. CareTaskPatch partial updates
    task_patch = CareTaskPatch(status="completed", priority="high")
    assert task_patch.status == "completed"
    assert task_patch.priority == "high"
    assert task_patch.title is None

    # 3. WellbeingCheckinPatch
    checkin_patch = WellbeingCheckinPatch(notes="Feeling much better")
    assert checkin_patch.notes == "Feeling much better"
    assert checkin_patch.feeling is None


def test_query_schema_pagination_bounds():
    """
    Verifies that Query schemas enforce pagination constraints (limit <= 100, offset >= 0).
    """
    # Valid query
    query = CareTaskQuery(status="pending", limit=25, offset=0)
    assert query.limit == 25
    assert query.offset == 0

    # Query exceeding limit bounds (> 100)
    with pytest.raises(ValidationError):
        CareTaskQuery(limit=150)

    # Query with negative offset (< 0)
    with pytest.raises(ValidationError):
        CareTaskQuery(offset=-5)

    # Valid AuditTrailQuery
    audit_q = AuditTrailQuery(action="consent.granted", limit=50, offset=10)
    assert audit_q.action == "consent.granted"
    assert audit_q.limit == 50


def test_response_schema_dto_isolation():
    """
    Verifies that Response schemas cleanly map attributes without exposing raw ORM internals.
    """
    sample_id = uuid.uuid4()
    fam_id = uuid.uuid4()
    prof_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    resp = CareSubjectResponse(
        id=sample_id,
        family_id=fam_id,
        profile_id=prof_id,
        fhir_patient_id="fhir-sample-pat-99",
        relationship_to_coordinator="mother",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active",
        created_at=now,
        updated_at=now
    )

    data = resp.model_dump()
    assert data["id"] == sample_id
    assert data["fhir_patient_id"] == "fhir-sample-pat-99"
    assert data["status"] == "active"
    # Ensure no SQLAlchemy internal attributes (e.g. _sa_instance_state) exist
    assert "_sa_instance_state" not in data
