import uuid
import pytest
from datetime import datetime, timedelta
from app.domains.agent.context_builder import AIContextBuilder, ALL_POSSIBLE_DIMENSIONS
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.domain.exceptions import FamilyAccessError


@pytest.mark.asyncio
async def test_ai_context_builder_consent_and_authorization(db_session):
    """
    Tests AIContextBuilder to ensure only strictly authorized dimensions
    are assembled and unauthorized dimensions are suppressed.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Create Profiles: Coordinator, Parent, and Stranger
    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_ctx",
        email="coord_ctx@kinguardian.com",
        display_name="Sarah Jenkins",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_ctx",
        email="parent_ctx@kinguardian.com",
        display_name="Robert Jenkins",
        timezone="Asia/Kolkata"
    )
    stranger = await family_svc.get_or_create_profile(
        iam_subject_id="iam_stranger_ctx",
        email="stranger_ctx@kinguardian.com",
        display_name="Eve Hacker",
        timezone="UTC"
    )

    # 2. Setup Care Circle
    family = await family_svc.create_care_circle(coord.id, "Jenkins Family", "coordinator")
    await family_svc.add_member_to_circle(coord.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ctx-101",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 3. Add seed data across various dimensions
    # Adherence event
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-1",
        scheduled_at=datetime.now(),
        status="taken",
        source="parent"
    )

    # Check-in
    await family_svc.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Feeling energetic today"
    )

    # Care task
    await family_svc.add_care_task(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coord.id,
        title="Check blood pressure in the morning",
        description="Daily monitoring",
        category="medication",
        priority="high",
        due_at=datetime.now() + timedelta(days=1)
    )

    # AI Insight
    await family_svc.generate_subject_ai_insights(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        insight_type="medication_adherence_trend"
    )
    # Appointment Coordination
    await family_svc.add_appointment_coordination(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="fhir-appt-ctx-1"
    )


    builder = AIContextBuilder(db_session)

    # --- Scenario A: Non-member stranger gets 403 / FamilyAccessError ---
    with pytest.raises(FamilyAccessError):
        await builder.build_context(
            requester_id=stranger.id,
            family_id=family.id,
            subject_id=subject.id
        )

    # --- Scenario B: Caregiver with NO clinical consent ---
    # Should get family_profile, parent_summary, care_tasks, check_ins, previous_ai_insights
    # But vitals, medications, adherence, appointments, labs, documents MUST BE SUPPRESSED!
    payload_no_consent = await builder.build_context(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id
    )

    assert "family_profile" in payload_no_consent.authorized_dimensions
    assert "parent_summary" in payload_no_consent.authorized_dimensions
    assert "care_tasks" in payload_no_consent.authorized_dimensions
    assert "check_ins" in payload_no_consent.authorized_dimensions
    assert "previous_ai_insights" in payload_no_consent.authorized_dimensions

    # Clinical dimensions suppressed
    assert "recent_observations" in payload_no_consent.suppressed_dimensions
    assert "medications" in payload_no_consent.suppressed_dimensions
    assert "adherence" in payload_no_consent.suppressed_dimensions
    assert "appointments" in payload_no_consent.suppressed_dimensions
    assert "labs" in payload_no_consent.suppressed_dimensions
    assert "documents" in payload_no_consent.suppressed_dimensions

    assert payload_no_consent.recent_observations is None
    assert payload_no_consent.medications is None
    assert payload_no_consent.adherence is None
    assert payload_no_consent.care_tasks is not None

    # --- Scenario C: Caregiver GRANTED Partial Consent (e.g. medications & adherence only) ---
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coord.id,
        scope={"medications": True, "adherence": True, "vitals": False, "appointments": False}
    )



    payload_partial_consent = await builder.build_context(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id
    )

    assert "medications" in payload_partial_consent.authorized_dimensions
    assert "adherence" in payload_partial_consent.authorized_dimensions
    assert "recent_observations" in payload_partial_consent.suppressed_dimensions
    assert "appointments" in payload_partial_consent.suppressed_dimensions
    assert payload_partial_consent.adherence is not None
    assert payload_partial_consent.adherence["taken_count"] == 1

    # --- Scenario D: Care Subject Self-Access (Parent accessing own context) ---
    # Has full access to all dimensions without external consent
    payload_self = await builder.build_context(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert len(payload_self.authorized_dimensions) == len(ALL_POSSIBLE_DIMENSIONS)
    assert len(payload_self.suppressed_dimensions) == 0

    # --- Scenario E: Prompt Context Serialization ---
    prompt_text = payload_partial_consent.to_prompt_context()
    assert "# CLINICAL CARE CONTEXT" in prompt_text
    assert "## Medication Adherence Summary" in prompt_text
    assert "## Care Tasks & Follow-ups" in prompt_text
    assert "Recent Clinical Observations" not in prompt_text


@pytest.mark.asyncio
async def test_ai_context_scoping_multi_subject_and_components(db_session):
    """
    Validates the 5 mandatory scoping components on every AI request:
    1. Actor (Identity & Role)
    2. Family (Care Circle Boundary)
    3. Subject(s) (One or more Care Subjects)
    4. Permission Scope (Calculated per subject)
    5. Conversation Context (Session, History, Intent)

    Verifies the hard invariant: The AI must NOT retrieve unauthorized family member data.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Setup Actor and Family
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_scope",
        email="coord_scope@kinguardian.com",
        display_name="Emma Watson",
        timezone="America/Los_Angeles"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Watson Family Circle", "coordinator")

    # 2. Setup TWO Care Subjects: Father (with full consent) and Mother (with NO consent)
    father = await family_svc.get_or_create_profile(
        iam_subject_id="iam_father_scope",
        email="father_scope@kinguardian.com",
        display_name="John Watson",
        timezone="Asia/Kolkata"
    )
    mother = await family_svc.get_or_create_profile(
        iam_subject_id="iam_mother_scope",
        email="mother_scope@kinguardian.com",
        display_name="Mary Watson",
        timezone="Asia/Kolkata"
    )
    await family_svc.add_member_to_circle(coordinator.id, family.id, father.email, "parent")
    await family_svc.add_member_to_circle(coordinator.id, family.id, mother.email, "parent")

    subj_father = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-father",
        profile_id=father.id,
        relationship_to_coordinator="father"
    )
    subj_mother = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-mother",
        profile_id=mother.id,
        relationship_to_coordinator="mother"
    )

    # 3. Father GRANTS consent to Emma for medications and vitals
    await family_svc.create_consent(
        requester_id=father.id,
        family_id=family.id,
        subject_id=subj_father.id,
        grantee_id=coordinator.id,
        scope={"medications": True, "vitals": True, "adherence": True}
    )
    # Mother DOES NOT grant clinical consent to Emma

    # Seed Father Adherence & Checkin
    await family_svc.record_adherence_event(
        requester_id=father.id,
        family_id=family.id,
        subject_id=subj_father.id,
        fhir_medication_request_id="rx-father-1",
        scheduled_at=datetime.now(),
        status="taken",
        source="parent"
    )
    await family_svc.submit_subject_checkin(
        requester_id=father.id,
        subject_id=subj_father.id,
        feeling="good",
        notes="Father feeling great"
    )

    # Seed Mother Checkin
    await family_svc.submit_subject_checkin(
        requester_id=mother.id,
        subject_id=subj_mother.id,
        feeling="not_well",
        notes="Mother feeling feverish"
    )

    # 4. Setup Conversation Session
    conv = await family_svc.start_ai_conversation(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subj_father.id,
        conversation_type="medication_review"
    )
    await family_svc.send_ai_conversation_message(
        requester_id=coordinator.id,
        conversation_id=conv.id,
        content="How is my father doing with his daily medications?"
    )

    builder = AIContextBuilder(db_session)

    # 5. Build Scoped Context for both subjects in the family
    scoped_payload = await builder.build_scoped_context(
        requester_id=coordinator.id,
        family_id=family.id,
        conversation_id=conv.id
    )

    # --- Verify Component 1: Actor Context ---
    assert scoped_payload.actor.profile_id == coordinator.id
    assert scoped_payload.actor.display_name == "Emma Watson"
    assert scoped_payload.actor.role == "coordinator"
    assert scoped_payload.actor.timezone == "America/Los_Angeles"

    # --- Verify Component 2: Family Context ---
    assert scoped_payload.family.family_id == family.id
    assert scoped_payload.family.name == "Watson Family Circle"
    assert scoped_payload.family.member_count == 3

    # --- Verify Component 3: Conversation Context ---
    assert scoped_payload.conversation_context.conversation_id == conv.id
    assert scoped_payload.conversation_context.conversation_type == "medication_review"
    assert len(scoped_payload.conversation_context.recent_messages) >= 2

    # --- Verify Component 4: Permission Scopes & Subject Contexts ---
    assert len(scoped_payload.subjects) == 2
    father_ctx = next(s for s in scoped_payload.subjects if s.subject_id == subj_father.id)
    mother_ctx = next(s for s in scoped_payload.subjects if s.subject_id == subj_mother.id)

    # Father: Authorized for medications, adherence, vitals
    assert "medications" in father_ctx.authorized_dimensions
    assert "adherence" in father_ctx.authorized_dimensions
    assert father_ctx.adherence is not None
    assert father_ctx.adherence["taken_count"] == 1

    # Mother: UNAUTHORIZED for clinical dimensions -> STRICTLY SUPPRESSED!
    assert "medications" in mother_ctx.suppressed_dimensions
    assert "adherence" in mother_ctx.suppressed_dimensions
    assert "recent_observations" in mother_ctx.suppressed_dimensions
    assert mother_ctx.medications is None
    assert mother_ctx.adherence is None
    assert mother_ctx.recent_observations is None

    # --- Verify Component 5: Prompt Markdown Formatting ---
    prompt_str = scoped_payload.to_prompt_context()
    assert "## 1. Actor Context" in prompt_str
    assert "Emma Watson (Role: coordinator)" in prompt_str
    assert "## 2. Family Circle Context" in prompt_str
    assert "Watson Family Circle" in prompt_str
    assert "## 3. Conversation Context" in prompt_str
    assert "Session ID" in prompt_str
    assert "### Subject: John Watson" in prompt_str
    assert "### Subject: Mary Watson" in prompt_str
    assert "Adherence Metrics" in prompt_str  # From father

