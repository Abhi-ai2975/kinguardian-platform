import pytest
from fastapi import HTTPException
from app.domains.family.application.services import FamilyService
from app.domains.clinical.services import ClinicalService
from app.domains.events.services import EventService


@pytest.mark.asyncio
async def test_consent_authorization_flow(db_session):
    from app.domains.family.infrastructure.repositories import (
        SQLAlchemyAppProfileRepository,
        SQLAlchemyFamilyRepository,
        SQLAlchemyConsentRepository
    )
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    family_svc = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    clinical_svc = ClinicalService(db_session)

    # 1. Setup Parent & Coordinator
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_1",
        email="parent@kinguardian.com",
        display_name="Parent User",
        timezone="Asia/Kolkata"
    )
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_1",
        email="coordinator@kinguardian.com",
        display_name="Child Coordinator",
        timezone="America/New_York"
    )

    # Add to family group
    circle = await family_svc.create_care_circle(parent.id, "Family Circle", "parent")
    await family_svc.add_member_to_circle(parent.id, circle.id, coordinator.email, "coordinator")

    # Add parent as a Care Subject in the family group
    sub = await family_svc.add_care_subject(
        requester_id=parent.id,
        family_id=circle.id,
        fhir_patient_id="fhir-patient-parent-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Initial state: No consent granted -> Verify access is denied (HTTP 403)
    with pytest.raises(HTTPException) as exc_info:
        await clinical_svc.get_patient_vitals(parent_id=parent.id, requester_id=coordinator.id)
    assert exc_info.value.status_code == 403

    # 3. Grant consent
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=circle.id,
        subject_id=sub.id,
        grantee_email=coordinator.email,
        scope={"vitals": True},
        status="active"
    )

    # 4. Consent granted -> Verify access succeeds without raising 403
    vitals_resp = await clinical_svc.get_patient_vitals(parent_id=parent.id, requester_id=coordinator.id)
    assert vitals_resp.patient_id == str(parent.id)

    # 5. Revoke consent (either by status="revoked" or setting scope flag to false)
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=circle.id,
        subject_id=sub.id,
        grantee_email=coordinator.email,
        scope={"vitals": False},
        status="active"
    )

    # 6. Consent revoked -> Verify access is denied again
    with pytest.raises(HTTPException) as exc_info:
        await clinical_svc.get_patient_vitals(parent_id=parent.id, requester_id=coordinator.id)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_capability_enforcement_flow(db_session):
    from app.domains.family.infrastructure.repositories import (
        SQLAlchemyAppProfileRepository,
        SQLAlchemyFamilyRepository,
        SQLAlchemyConsentRepository
    )
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    family_svc = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    clinical_svc = ClinicalService(db_session)

    # 1. Setup Parent & Basic Family Member
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_2",
        email="parent2@kinguardian.com",
        display_name="Parent User 2",
        timezone="Asia/Kolkata"
    )
    member = await family_svc.get_or_create_profile(
        iam_subject_id="iam_member_2",
        email="member2@kinguardian.com",
        display_name="Basic Member",
        timezone="America/New_York"
    )

    # Add to family group
    circle = await family_svc.create_care_circle(parent.id, "Family Circle 2", "parent")
    # Add as "family_member" (lacks view_vitals capability!)
    await family_svc.add_member_to_circle(parent.id, circle.id, member.email, "family_member")

    # Add parent as a Care Subject
    sub = await family_svc.add_care_subject(
        requester_id=parent.id,
        family_id=circle.id,
        fhir_patient_id="fhir-patient-parent-2",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Parent grants consent
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=circle.id,
        subject_id=sub.id,
        grantee_email=member.email,
        scope={"vitals": True},
        status="active"
    )

    # 3. Request vitals -> Verify access is rejected because the requester lacks 'view_vitals' capability
    with pytest.raises(HTTPException) as exc_info:
        await clinical_svc.get_patient_vitals(parent_id=parent.id, requester_id=member.id)
    assert exc_info.value.status_code == 403
    assert "required" in exc_info.value.detail
    assert "view_vitals" in exc_info.value.detail


@pytest.mark.asyncio
async def test_mock_clinical_record_gateway():
    from app.domains.clinical.gateway import MockClinicalRecordGateway, ClinicalRecordGateway
    
    gateway: ClinicalRecordGateway = MockClinicalRecordGateway()
    
    # 1. get_patient (Family subject -> Patient)
    patient = await gateway.get_patient("pat-123")
    assert patient is not None
    assert patient["id"] == "pat-123"
    
    # 2. get_practitioner (Doctor -> Practitioner / PractitionerRole)
    practitioner = await gateway.get_practitioner("pract-456")
    assert practitioner is not None
    assert practitioner["id"] == "pract-456"
    assert practitioner["role"] == "Cardiologist"
    
    # 3. get_observations (Vital -> Observation)
    obs = await gateway.get_observations("pat-123", category="vital-signs")
    assert len(obs) == 1
    assert obs[0]["code"]["text"] == "Blood Pressure"
    
    # 4. get_conditions (Condition -> Condition)
    conds = await gateway.get_conditions("pat-123")
    assert len(conds) == 1
    assert conds[0]["clinical_status"] == "active"
    
    # 5. get_medications (Medication -> MedicationRequest)
    meds = await gateway.get_medications("pat-123")
    assert len(meds) == 1
    assert meds[0]["medication_name"] == "Amlodipine 5mg"
    
    # 6. get_appointments (Appointment -> Appointment)
    appts = await gateway.get_appointments("pat-123")
    assert len(appts) == 1
    assert appts[0]["description"] == "Routine Cardiology Review"
    
    # 7. get_encounters (Encounter -> Encounter)
    encs = await gateway.get_encounters("pat-123")
    assert len(encs) == 1
    assert encs[0]["status"] == "finished"
    
    # 8. get_diagnostic_reports (Lab result -> DiagnosticReport + Observation)
    reports = await gateway.get_diagnostic_reports("pat-123")
    assert len(reports) == 1
    assert reports[0]["status"] == "final"
    
    # 9. get_document_references (Document -> DocumentReference)
    docs = await gateway.get_document_references("pat-123")
    assert len(docs) == 1
    assert docs[0]["status"] == "current"
    
    # 10. get_service_requests (Lab/test request -> ServiceRequest)
    srv_reqs = await gateway.get_service_requests("pat-123")
    assert len(srv_reqs) == 1
    assert srv_reqs[0]["code"]["text"] == "Lipid Profile Panel"


@pytest.mark.asyncio
async def test_fhir_clinical_record_gateway_graceful_offline():
    from app.domains.clinical.gateway import FHIRClinicalRecordGateway
    
    gateway = FHIRClinicalRecordGateway(
        emr_gql_url="http://localhost:59999/api/v1",
        emr_core_url="http://localhost:59998/api/v1",
        timeout=0.1
    )
    
    patient = await gateway.get_patient("pat-offline")
    assert patient is None
    
    pract = await gateway.get_practitioner("pract-offline")
    assert pract is None
    
    obs = await gateway.get_observations("pat-offline")
    assert obs == []
    
    conds = await gateway.get_conditions("pat-offline")
    assert conds == []
    
    meds = await gateway.get_medications("pat-offline")
    assert meds == []
    
    appts = await gateway.get_appointments("pat-offline")
    assert appts == []
    
    encs = await gateway.get_encounters("pat-offline")
    assert encs == []
    
    reports = await gateway.get_diagnostic_reports("pat-offline")
    assert reports == []
    
    docs = await gateway.get_document_references("pat-offline")
    assert docs == []
    
    srvs = await gateway.get_service_requests("pat-offline")
    assert srvs == []



@pytest.mark.asyncio
async def test_clinical_service_with_injected_gateway(db_session):
    from app.domains.family.infrastructure.repositories import (
        SQLAlchemyAppProfileRepository,
        SQLAlchemyFamilyRepository,
        SQLAlchemyConsentRepository
    )
    from app.domains.clinical.gateway import MockClinicalRecordGateway
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    family_svc = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    mock_gateway = MockClinicalRecordGateway()
    clinical_svc = ClinicalService(db_session, gateway=mock_gateway)
    
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_gw",
        email="parent_gw@kinguardian.com",
        display_name="Parent User Gateway",
        timezone="Asia/Kolkata"
    )
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_gw",
        email="coord_gw@kinguardian.com",
        display_name="Coordinator User Gateway",
        timezone="America/New_York"
    )
    
    circle = await family_svc.create_care_circle(parent.id, "Gateway Circle", "parent")
    await family_svc.add_member_to_circle(parent.id, circle.id, coordinator.email, "coordinator")
    sub = await family_svc.add_care_subject(
        requester_id=parent.id,
        family_id=circle.id,
        fhir_patient_id="fhir-pat-gw-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # Grant consent for all scopes
    await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=circle.id,
        subject_id=sub.id,
        grantee_email=coordinator.email,
        scope={"vitals": True, "medications": True, "appointments": True},
        status="active"
    )
    
    # Test vitals via mock gateway
    vitals_resp = await clinical_svc.get_patient_vitals(parent_id=parent.id, requester_id=coordinator.id)
    assert vitals_resp.patient_id == str(parent.id)
    assert len(vitals_resp.vitals) == 1
    assert vitals_resp.vitals[0].code == "Blood Pressure"
    
    # Test medications via mock gateway
    meds = await clinical_svc.get_patient_medications(parent_id=parent.id, requester_id=coordinator.id)
    assert len(meds) == 1
    assert meds[0].name == "Amlodipine 5mg"
    
    # Test appointments via mock gateway
    appts = await clinical_svc.get_patient_appointments(parent_id=parent.id, requester_id=coordinator.id)
    assert len(appts) == 1
    assert appts[0].description == "Routine Cardiology Review"


@pytest.mark.asyncio
async def test_fhir_r4_headers_and_jwt_auth():
    from app.domains.clinical.gateway import FHIRClinicalRecordGateway, FHIR_R4_ACCEPT_HEADER, FHIR_R4_CONTENT_TYPE
    
    # 1. Gateway with default JWT token
    gw_with_token = FHIRClinicalRecordGateway(
        emr_gql_url="http://localhost:8005/api/v1",
        default_auth_token="jwt.mock.token.default"
    )
    headers = gw_with_token._get_headers()
    assert headers["Accept"] == FHIR_R4_ACCEPT_HEADER
    assert headers["Content-Type"] == FHIR_R4_CONTENT_TYPE
    assert headers["X-FHIR-Version"] == "4.0.1"
    assert headers["Authorization"] == "Bearer jwt.mock.token.default"
    
    # 2. Overriding JWT token per request
    override_headers = gw_with_token._get_headers(auth_token="jwt.mock.token.custom")
    assert override_headers["Authorization"] == "Bearer jwt.mock.token.custom"
    
    # 3. Gateway without JWT token
    gw_no_token = FHIRClinicalRecordGateway(emr_gql_url="http://localhost:8005/api/v1")
    anon_headers = gw_no_token._get_headers()
    assert "Authorization" not in anon_headers
    assert anon_headers["Accept"] == FHIR_R4_ACCEPT_HEADER
    assert anon_headers["Content-Type"] == FHIR_R4_CONTENT_TYPE


