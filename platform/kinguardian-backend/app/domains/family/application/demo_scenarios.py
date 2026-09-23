"""
Demo & Seed Scenarios Engine:
Exercises actual service logic, domain events, and read models across 6 explicit care scenarios:
1. Normal day - No important alerts, medications on track, positive check-ins.
2. Medication missed - Dad's medication overdue, triggering adherence alert.
3. Guardian moment - Dad's activity trending lower, triggering proactive AI Guardian Moment.
4. New lab report - Mom uploads a new clinical lab report, triggering document extraction & review.
5. Upcoming appointment - Dad's cardiology appointment tomorrow with coordination & prep task.
6. Parent feeling unwell - Parent submits concerning check-in with high severity.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    FamilyRelationship,
    CareSubject,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    MonitoringPreference,
    AIInsight,
    AIInsightSource,
    Notification,
    AppointmentCoordination,
    HealthDocument,
    DocumentExtraction,
    AIAction,
    Consent
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.application.read_services import (
    CoordinatorHomeReadService,
    ParentHealthSummaryReadService,
    FamilyDashboardReadService
)


# Standard Scenario Seed UUIDs
SCENARIO_COORDINATOR_ID = uuid.UUID("d1111111-1111-4111-8111-111111111111")
SCENARIO_DAD_PROFILE_ID = uuid.UUID("d2222222-2222-4222-8222-222222222222")
SCENARIO_MOM_PROFILE_ID = uuid.UUID("d3333333-3333-4333-8333-333333333333")
SCENARIO_CAREGIVER_ID = uuid.UUID("d4444444-4444-4444-8444-444444444444")

SCENARIO_FAMILY_ID = uuid.UUID("dddddddd-dddd-4ddd-8ddd-dddddddddddd")
SCENARIO_DAD_SUBJECT_ID = uuid.UUID("dddddddd-1111-4ddd-8ddd-111111111111")
SCENARIO_MOM_SUBJECT_ID = uuid.UUID("dddddddd-2222-4ddd-8ddd-222222222222")


class DemoScenarioService:
    """
    Orchestrates and seeds end-to-end demo scenarios via real domain services.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = SQLAlchemyAppProfileRepository(session)
        self.family_repo = SQLAlchemyFamilyRepository(session)
        self.consent_repo = SQLAlchemyConsentRepository(session)
        self.event_logger = EventService(session)
        self.family_service = FamilyService(
            user_repo=self.user_repo,
            circle_repo=self.family_repo,
            consent_repo=self.consent_repo,
            event_logger=self.event_logger
        )

    async def setup_base_family_infrastructure(self) -> Dict[str, Any]:
        """
        Creates the core cross-border family:
        - Coordinator: Anjali (London, Europe/London)
        - Dad: Ramesh (Chennai, Asia/Kolkata)
        - Mom: Lakshmi (Chennai, Asia/Kolkata)
        - Caregiver: Priya (Bengaluru, Asia/Kolkata)
        """
        # Ensure profiles
        coord = await self.user_repo.get_by_id(SCENARIO_COORDINATOR_ID)
        if not coord:
            coord_model = AppProfile(
                id=SCENARIO_COORDINATOR_ID,
                iam_subject_id="iam_demo_anjali_london",
                display_name="Anjali Sharma",
                first_name="Anjali",
                last_name="Sharma",
                email="anjali.demo@kinguardian.com",
                city="London",
                country_code="GB",
                timezone="Europe/London",
                status="active"
            )
            self.session.add(coord_model)

        dad = await self.user_repo.get_by_id(SCENARIO_DAD_PROFILE_ID)
        if not dad:
            dad_model = AppProfile(
                id=SCENARIO_DAD_PROFILE_ID,
                iam_subject_id="iam_demo_ramesh_chennai",
                display_name="Ramesh Sharma",
                first_name="Ramesh",
                last_name="Sharma",
                email="ramesh.demo@kinguardian.com",
                city="Chennai",
                country_code="IN",
                timezone="Asia/Kolkata",
                status="active"
            )
            self.session.add(dad_model)

        mom = await self.user_repo.get_by_id(SCENARIO_MOM_PROFILE_ID)
        if not mom:
            mom_model = AppProfile(
                id=SCENARIO_MOM_PROFILE_ID,
                iam_subject_id="iam_demo_lakshmi_chennai",
                display_name="Lakshmi Sharma",
                first_name="Lakshmi",
                last_name="Sharma",
                email="lakshmi.demo@kinguardian.com",
                city="Chennai",
                country_code="IN",
                timezone="Asia/Kolkata",
                status="active"
            )
            self.session.add(mom_model)

        caregiver = await self.user_repo.get_by_id(SCENARIO_CAREGIVER_ID)
        if not caregiver:
            cg_model = AppProfile(
                id=SCENARIO_CAREGIVER_ID,
                iam_subject_id="iam_demo_priya_bengaluru",
                display_name="Priya Nair",
                first_name="Priya",
                last_name="Nair",
                email="priya.caregiver@kinguardian.com",
                city="Bengaluru",
                country_code="IN",
                timezone="Asia/Kolkata",
                status="active"
            )
            self.session.add(cg_model)

        await self.session.flush()

        # Family circle
        family = await self.family_repo.get_by_id(SCENARIO_FAMILY_ID)
        if not family:
            family_model = Family(
                id=SCENARIO_FAMILY_ID,
                name="Sharma Family Demo",
                primary_coordinator_profile_id=SCENARIO_COORDINATOR_ID
            )

            self.session.add(family_model)
            await self.session.flush()

            # Memberships
            m_coord = FamilyMembership(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_COORDINATOR_ID,
                membership_role="primary_coordinator",
                status="active"
            )
            m_dad = FamilyMembership(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_DAD_PROFILE_ID,
                membership_role="parent",
                status="active"
            )
            m_mom = FamilyMembership(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_MOM_PROFILE_ID,
                membership_role="parent",
                status="active"
            )
            m_cg = FamilyMembership(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_CAREGIVER_ID,
                membership_role="caregiver",
                status="active"
            )
            self.session.add_all([m_coord, m_dad, m_mom, m_cg])

        # Care Subjects
        dad_sub = await self.session.get(CareSubject, SCENARIO_DAD_SUBJECT_ID)
        if not dad_sub:
            dad_sub = CareSubject(
                id=SCENARIO_DAD_SUBJECT_ID,
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_DAD_PROFILE_ID,
                fhir_patient_id="fhir-pat-demo-dad-01",
                relationship_to_coordinator="father",
                city="Chennai",
                country_code="IN",
                timezone="Asia/Kolkata",
                status="active"
            )
            self.session.add(dad_sub)

        mom_sub = await self.session.get(CareSubject, SCENARIO_MOM_SUBJECT_ID)
        if not mom_sub:
            mom_sub = CareSubject(
                id=SCENARIO_MOM_SUBJECT_ID,
                family_id=SCENARIO_FAMILY_ID,
                profile_id=SCENARIO_MOM_PROFILE_ID,
                fhir_patient_id="fhir-pat-demo-mom-02",
                relationship_to_coordinator="mother",
                city="Chennai",
                country_code="IN",
                timezone="Asia/Kolkata",
                status="active"
            )
            self.session.add(mom_sub)

        # Consents & Care Relationships
        c1 = await self.session.execute(
            select(Consent).where(
                Consent.family_id == SCENARIO_FAMILY_ID,
                Consent.subject_id == SCENARIO_DAD_SUBJECT_ID,
                Consent.grantor_profile_id == SCENARIO_DAD_PROFILE_ID,
                Consent.grantee_profile_id == SCENARIO_COORDINATOR_ID
            )
        )
        if not c1.scalar_one_or_none():
            self.session.add(Consent(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                subject_id=SCENARIO_DAD_SUBJECT_ID,
                grantor_profile_id=SCENARIO_DAD_PROFILE_ID,
                grantee_profile_id=SCENARIO_COORDINATOR_ID,
                consent_type="clinical_read",
                scope={"vitals": True, "medications": True, "documents": True},
                status="active"
            ))

        c2 = await self.session.execute(
            select(Consent).where(
                Consent.family_id == SCENARIO_FAMILY_ID,
                Consent.subject_id == SCENARIO_MOM_SUBJECT_ID,
                Consent.grantor_profile_id == SCENARIO_MOM_PROFILE_ID,
                Consent.grantee_profile_id == SCENARIO_COORDINATOR_ID
            )
        )
        if not c2.scalar_one_or_none():
            self.session.add(Consent(
                id=uuid.uuid4(),
                family_id=SCENARIO_FAMILY_ID,
                subject_id=SCENARIO_MOM_SUBJECT_ID,
                grantor_profile_id=SCENARIO_MOM_PROFILE_ID,
                grantee_profile_id=SCENARIO_COORDINATOR_ID,
                consent_type="clinical_read",
                scope={"vitals": True, "medications": True, "documents": True},
                status="active"
            ))

        await self.session.commit()
        return {
            "family_id": SCENARIO_FAMILY_ID,
            "coordinator_id": SCENARIO_COORDINATOR_ID,
            "dad_subject_id": SCENARIO_DAD_SUBJECT_ID,
            "mom_subject_id": SCENARIO_MOM_SUBJECT_ID
        }

    async def seed_scenario_normal_day(self) -> Dict[str, Any]:
        """
        Scenario 1: Normal Day
        - No important alerts.
        - Dad & Mom have taken all morning medications.
        - Both submitted cheerful/stable check-ins ("good", "great").
        - Zero high-severity attention items on Coordinator Home.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)

        # 1. Successful check-ins
        dad_checkin = WellbeingCheckin(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            submitted_by_profile_id=SCENARIO_DAD_PROFILE_ID,
            feeling="great",
            severity="low",
            notes="Morning walk went well. Feeling refreshed and had a healthy breakfast.",
            submitted_at=now_utc - timedelta(hours=2)
        )
        mom_checkin = WellbeingCheckin(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_MOM_SUBJECT_ID,
            submitted_by_profile_id=SCENARIO_MOM_PROFILE_ID,
            feeling="good",
            severity="low",
            notes="Blood pressure normal today. Did 20 mins of yoga.",
            submitted_at=now_utc - timedelta(hours=3)
        )
        self.session.add_all([dad_checkin, mom_checkin])

        # 2. Fully adhered medication events
        dad_med = MedicationAdherenceEvent(
            id=uuid.uuid4(),
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            fhir_medication_request_id="med-req-amlodipine-5mg",
            scheduled_at=now_utc - timedelta(hours=3),
            confirmed_at=now_utc - timedelta(hours=2, minutes=55),
            status="taken",
            confirmed_by_profile_id=SCENARIO_DAD_PROFILE_ID,
            source="patient_app"
        )
        mom_med = MedicationAdherenceEvent(
            id=uuid.uuid4(),
            subject_id=SCENARIO_MOM_SUBJECT_ID,
            fhir_medication_request_id="med-req-metformin-500mg",
            scheduled_at=now_utc - timedelta(hours=3),
            confirmed_at=now_utc - timedelta(hours=2, minutes=50),
            status="taken",
            confirmed_by_profile_id=SCENARIO_MOM_PROFILE_ID,
            source="patient_app"
        )
        self.session.add_all([dad_med, mom_med])
        await self.session.commit()

        # Exercise read service logic
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        return {
            "scenario": "normal_day",
            "status": "success",
            "attention_items_count": len(home_dto.attention_items),
            "parent_statuses": [p.display_name for p in home_dto.parent_statuses],
            "is_calm": len(home_dto.attention_items) == 0
        }

    async def seed_scenario_medication_missed(self) -> Dict[str, Any]:
        """
        Scenario 2: Medication Missed
        - Dad's blood pressure medication is 3 hours overdue.
        - Generates a missed adherence event.
        - Generates an overdue CareTask assigned to caregiver Priya.
        - Coordinator Home shows Dad's missed dose in Attention Items.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)

        # 1. Overdue medication adherence event
        overdue_med = MedicationAdherenceEvent(
            id=uuid.uuid4(),
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            fhir_medication_request_id="med-req-telmisartan-40mg",
            scheduled_at=now_utc - timedelta(hours=3, minutes=30),
            confirmed_at=None,
            status="missed",
            source="adherence_tracker"
        )
        self.session.add(overdue_med)

        # 2. Overdue care task for caregiver to verify
        followup_task = CareTask(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            created_by_profile_id=SCENARIO_COORDINATOR_ID,
            assigned_to_profile_id=SCENARIO_CAREGIVER_ID,
            title="Verify Dad's Morning Blood Pressure Dose (Telmisartan)",
            description="Morning 08:00 AM dose was not logged as confirmed. Please call or verify with Ramesh.",
            category="medication",
            priority="high",
            status="pending",
            due_at=now_utc - timedelta(hours=2)
        )
        self.session.add(followup_task)

        # 3. Notification record
        notif = Notification(
            id=uuid.uuid4(),
            recipient_profile_id=SCENARIO_COORDINATOR_ID,
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            type="medication_overdue",
            priority="high",
            title="Medication Missed: Telmisartan 40mg",
            body="Ramesh hasn't confirmed his morning blood pressure medication (3 hours overdue).",
            action_type="view_medication",
            action_payload_json={"subject_id": str(SCENARIO_DAD_SUBJECT_ID)}
        )
        self.session.add(notif)
        await self.session.commit()


        # Read service verification
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        return {
            "scenario": "medication_missed",
            "status": "success",
            "overdue_task_title": followup_task.title,
            "attention_items": [item.title for item in home_dto.attention_items],
            "has_medication_alert": any("medication" in item.title.lower() or "telmisartan" in item.title.lower() for item in home_dto.attention_items)
        }

    async def seed_scenario_guardian_moment(self) -> Dict[str, Any]:
        """
        Scenario 3: Guardian Moment
        - Dad's wearable step count / mobility dropped significantly (from 6,000 steps/day down to 1,800 steps/day over 3 consecutive days).
        - Generates an AIInsight (Guardian Moment) with baseline comparison and suggested proactive action.
        - AIAction created proposing a gentle check-in call task.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)

        # 1. AI Guardian Moment Insight
        insight_id = uuid.uuid4()
        guardian_insight = AIInsight(
            id=insight_id,
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            type="guardian_moment",
            severity="attention",
            title="Dad's Activity Trending Lower: 68% Drop in Daily Mobility",
            summary="Ramesh averaged only 1,850 steps over the last 3 days compared to his normal 4-week baseline of 6,200 steps/day.",
            observation="Mobility decline: 1,850 steps vs 6,200 baseline",
            recommendation="Schedule a light morning check-in call with Ramesh to ask how his joints are feeling.",
            timeframe_start=now_utc - timedelta(days=7),
            timeframe_end=now_utc,
            baseline_comparison="Baseline: 6,200 steps/day. Recent 3-day average: 1,850 steps/day (-68%).",
            actionability="Schedule a light morning check-in call with Ramesh to ask how his joints are feeling.",
            status="active",
            generated_by="kin_guardian_agent"
        )
        self.session.add(guardian_insight)

        # 2. Insight Source Reference
        source = AIInsightSource(
            id=uuid.uuid4(),
            insight_id=insight_id,
            source_type="wearable_observation_series",
            source_id="loinc_8867_4_step_count_window_7d",
            metadata_json={
                "metric": "step_count",
                "loinc": "8867-4",
                "baseline_mean": 6200,
                "current_mean": 1850,
                "p_value": 0.002
            }
        )
        self.session.add(source)


        # 3. Proactive AI Action
        action = AIAction(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            profile_id=SCENARIO_COORDINATOR_ID,
            agent_session_id="agent_sess_guardian_mobility_001",
            action_type="create_care_task",
            status="pending_approval",
            input_json={
                "task_title": "Call Dad about mobility & knee comfort",
                "priority": "medium",
                "assigned_to": str(SCENARIO_COORDINATOR_ID)
            },
            output_json={
                "recommendation": "Coordinate an afternoon video call to verify pain levels."
            },
            requires_approval=True
        )
        self.session.add(action)
        await self.session.commit()

        # Read service verification
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        return {
            "scenario": "guardian_moment",
            "status": "success",
            "guardian_moments_count": len(home_dto.guardian_moments),
            "guardian_moment_title": home_dto.guardian_moments[0].title if home_dto.guardian_moments else None,
            "baseline_comparison": guardian_insight.baseline_comparison
        }

    async def seed_scenario_new_lab_report(self) -> Dict[str, Any]:
        """
        Scenario 4: New Lab Report Upload
        - Mom (Lakshmi) uploads a Comprehensive Metabolic Panel & Lipid Report.
        - Creates HealthDocument and DocumentExtraction record (HbA1c 6.4%, Total Cholesterol 210 mg/dL).
        - Generates an AttentionItem on Coordinator Home requiring extraction review.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)

        # 1. Health Document
        doc_id = uuid.uuid4()
        health_doc = HealthDocument(
            id=doc_id,
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_MOM_SUBJECT_ID,
            filenest_file_id=f"fn_lab_lakshmi_{uuid.uuid4().hex[:8]}",
            document_type="lab_report",
            status="active",
            source_profile_id=SCENARIO_MOM_PROFILE_ID,
            ai_processing_status="completed",
            extraction_status="completed"
        )
        self.session.add(health_doc)

        # 2. Document Extraction with extracted clinical biomarkers
        extraction = DocumentExtraction(
            id=uuid.uuid4(),
            document_id=doc_id,
            extraction_type="structured_lab_panel",
            raw_output={
                "lab_name": "Dr. Lal PathLabs Chennai",
                "test_date": (now_utc - timedelta(days=1)).strftime("%Y-%m-%d"),
                "results": [
                    {"test": "HbA1c", "value": 6.4, "unit": "%", "range": "< 5.7"},
                    {"test": "Fasting Glucose", "value": 112, "unit": "mg/dL", "range": "70-99"},
                    {"test": "Total Cholesterol", "value": 210, "unit": "mg/dL", "range": "< 200"},
                    {"test": "Serum Creatinine", "value": 0.85, "unit": "mg/dL", "range": "0.6-1.2"}
                ]
            },
            normalized_output={
                "hba1c": {"value": 6.4, "unit": "%", "status": "pre_diabetic_range"},
                "fasting_blood_sugar": {"value": 112, "unit": "mg/dL", "status": "elevated"},
                "cholesterol_total": {"value": 210, "unit": "mg/dL", "status": "borderline_high"}
            },
            confidence=0.96,
            review_status="pending_review"
        )
        self.session.add(extraction)
        await self.session.commit()

        # Read service verification
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        return {
            "scenario": "new_lab_report",
            "status": "success",
            "document_id": str(doc_id),
            "document_type": health_doc.document_type,
            "extraction_review_status": extraction.review_status,
            "attention_items_count": len(home_dto.attention_items),
            "has_extraction_review_item": any(item.action_type == "review_extraction" for item in home_dto.attention_items)
        }

    async def seed_scenario_upcoming_appointment(self) -> Dict[str, Any]:
        """
        Scenario 5: Upcoming Appointment
        - Dad has a cardiology consultation scheduled tomorrow morning at 10:30 AM IST.
        - Appointment coordination record with Dr. Arvind Rao at Apollo Spectra Chennai.
        - CareTask created for transport coordination assigned to Priya.
        - Coordinator Home shows appointment in Upcoming Appointments section.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)
        tomorrow_10am = now_utc + timedelta(days=1, hours=2)

        # 1. Appointment Coordination Record
        appt = AppointmentCoordination(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            fhir_appointment_id="fhir-appt-cardio-dad-tomorrow",
            assigned_caregiver_profile_id=SCENARIO_CAREGIVER_ID,
            preparation_status="pending",
            summary_status="pending",
            reminder_status="sent"
        )
        self.session.add(appt)

        # 2. Care Task for appointment prep
        appt_task = CareTask(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            created_by_profile_id=SCENARIO_COORDINATOR_ID,
            assigned_to_profile_id=SCENARIO_CAREGIVER_ID,
            title="Prepare Dad's Records & Accompany to Dr. Arvind Rao (Cardiology)",
            description="Ensure physical file with recent ECG reports and prescription pouch are ready.",
            category="appointment",
            priority="high",
            status="pending",
            due_at=tomorrow_10am - timedelta(hours=1)
        )
        self.session.add(appt_task)
        await self.session.commit()

        # Read service verification
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        return {
            "scenario": "upcoming_appointment",
            "status": "success",
            "fhir_appointment_id": appt.fhir_appointment_id,
            "preparation_status": appt.preparation_status,
            "upcoming_appointments_count": len(home_dto.upcoming_appointments),
            "appointment_prep_task": appt_task.title
        }

    async def seed_scenario_parent_feeling_unwell(self) -> Dict[str, Any]:
        """
        Scenario 6: Parent Feeling Unwell
        - Dad submits a concerning check-in ("unwell", severity="high", notes="Dizziness and chest tightness").
        - Generates high-priority notification to Anjali and Priya.
        - Generates AttentionItem on Coordinator Home requiring prompt review.
        """
        await self.setup_base_family_infrastructure()
        now_utc = datetime.now(timezone.utc)

        # 1. Concerning Wellbeing Check-in
        checkin = WellbeingCheckin(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            submitted_by_profile_id=SCENARIO_DAD_PROFILE_ID,
            feeling="unwell",
            severity="high",
            notes="Woke up feeling dizzy and lightheaded with mild chest tightness. Resting on sofa.",
            submitted_at=now_utc - timedelta(minutes=25)
        )
        self.session.add(checkin)

        # 2. Urgent Attention Notification to Coordinator
        notif_coord = Notification(
            id=uuid.uuid4(),
            recipient_profile_id=SCENARIO_COORDINATOR_ID,
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            type="urgent_wellbeing_alert",
            priority="urgent",
            title="Alert: Dad Reported Feeling Unwell (High Severity)",
            body="Ramesh reported dizziness and chest tightness 25 mins ago. Please check in or notify caregiver.",
            action_type="view_checkin",
            action_payload_json={"checkin_id": str(checkin.id)}
        )
        self.session.add(notif_coord)


        # 3. Urgent Care Task for In-Person Check
        urgent_task = CareTask(
            id=uuid.uuid4(),
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID,
            created_by_profile_id=SCENARIO_COORDINATOR_ID,
            assigned_to_profile_id=SCENARIO_CAREGIVER_ID,
            title="Urgent: In-Person Vital Check for Ramesh (Dizziness Reported)",
            description="Check blood pressure, pulse, and oxygen saturation immediately. Notify cardiologist if BP > 160/100.",
            category="check_in",
            priority="urgent",
            status="pending",
            due_at=now_utc + timedelta(minutes=30)
        )
        self.session.add(urgent_task)
        await self.session.commit()

        # Read service verification
        read_service = CoordinatorHomeReadService(self.session)
        home_dto = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)

        # Also verify Parent Health Summary
        summary_read_svc = ParentHealthSummaryReadService(self.session)
        parent_summary = await summary_read_svc.get_parent_health_summary(
            requester_id=SCENARIO_COORDINATOR_ID,
            family_id=SCENARIO_FAMILY_ID,
            subject_id=SCENARIO_DAD_SUBJECT_ID
        )


        return {
            "scenario": "parent_feeling_unwell",
            "status": "success",
            "feeling": checkin.feeling,
            "severity": checkin.severity,
            "notes": checkin.notes,
            "attention_items_count": len(home_dto.attention_items),
            "latest_checkin_feeling": parent_summary.checkins[0].feeling if parent_summary.checkins else None


        }

    async def seed_all_scenarios(self) -> Dict[str, Any]:
        """
        Executes and seeds all 6 scenarios into the database session.
        """
        r1 = await self.seed_scenario_normal_day()
        r2 = await self.seed_scenario_medication_missed()
        r3 = await self.seed_scenario_guardian_moment()
        r4 = await self.seed_scenario_new_lab_report()
        r5 = await self.seed_scenario_upcoming_appointment()
        r6 = await self.seed_scenario_parent_feeling_unwell()

        return {
            "normal_day": r1,
            "medication_missed": r2,
            "guardian_moment": r3,
            "new_lab_report": r4,
            "upcoming_appointment": r5,
            "parent_feeling_unwell": r6
        }
