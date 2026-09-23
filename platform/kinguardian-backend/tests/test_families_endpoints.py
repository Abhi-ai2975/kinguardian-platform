import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


@pytest.mark.asyncio
async def test_family_crud_endpoints(db_session):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    
    # 1. Setup Coordinator Profile
    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_crud",
        email="coord_crud@kinguardian.com",
        display_name="Coordinator CRUD",
        timezone="America/New_York"
    )
    
    # Override get_current_user and get_db dependencies for testing
    from app.core.security import get_current_user
    from app.core.database import get_db
    from app.domains.family.infrastructure.models import AppProfile
    
    app_profile = await db_session.get(AppProfile, coord.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile
    app.dependency_overrides[get_db] = lambda: db_session

    
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. POST /api/v1/families
            create_payload = {"name": "The Sharma Family", "role": "coordinator"}
            create_resp = await client.post("/api/v1/families", json=create_payload)
            assert create_resp.status_code == 201
            family_data = create_resp.json()
            family_id = family_data["id"]
            assert family_data["name"] == "The Sharma Family"
            assert family_data["primary_coordinator_profile_id"] == str(coord.id)
            assert len(family_data["members"]) == 1
            assert family_data["members"][0]["profile_id"] == str(coord.id)
            
            # 2. GET /api/v1/families
            list_resp = await client.get("/api/v1/families")
            assert list_resp.status_code == 200
            families_list = list_resp.json()
            assert len(families_list) >= 1
            assert any(f["id"] == family_id for f in families_list)
            
            # 3. GET /api/v1/families/{id}
            get_resp = await client.get(f"/api/v1/families/{family_id}")
            assert get_resp.status_code == 200
            single_family = get_resp.json()
            assert single_family["id"] == family_id
            assert single_family["name"] == "The Sharma Family"
            
            # 4. PATCH /api/v1/families/{id}
            patch_payload = {"name": "The Sharma Family Global"}
            patch_resp = await client.patch(f"/api/v1/families/{family_id}", json=patch_payload)
            assert patch_resp.status_code == 200
            updated_family = patch_resp.json()
            assert updated_family["name"] == "The Sharma Family Global"
            
            # 5. Non-member access is rejected (403)
            stranger = await family_svc.get_or_create_profile(
                iam_subject_id="iam_stranger_crud",
                email="stranger_crud@kinguardian.com",
                display_name="Stranger CRUD",
                timezone="UTC"
            )
            stranger_profile = await db_session.get(AppProfile, stranger.id)
            app.dependency_overrides[get_current_user] = lambda: stranger_profile
            
            forbidden_get = await client.get(f"/api/v1/families/{family_id}")
            assert forbidden_get.status_code == 403
            
            forbidden_patch = await client.patch(f"/api/v1/families/{family_id}", json={"name": "Hacked"})
            assert forbidden_patch.status_code == 403

            # --- Member Management Tests ---
            # Switch back to coordinator
            app.dependency_overrides[get_current_user] = lambda: app_profile

            # 6. POST /api/v1/families/{id}/members
            member_add_payload = {"email": "sister@kinguardian.com", "role": "caregiver"}
            member_add_resp = await client.post(f"/api/v1/families/{family_id}/members", json=member_add_payload)
            assert member_add_resp.status_code == 201
            member_data = member_add_resp.json()
            member_id = member_data["id"]
            assert member_data["membership_role"] == "caregiver"
            assert member_data["status"] == "active"

            # 7. GET /api/v1/families/{id}/members
            members_list_resp = await client.get(f"/api/v1/families/{family_id}/members")
            assert members_list_resp.status_code == 200
            members_list = members_list_resp.json()
            assert len(members_list) == 2
            assert any(m["id"] == member_id for m in members_list)

            # 8. PATCH /api/v1/families/{id}/members/{member_id}
            member_patch_payload = {"role": "family_member", "status": "active"}
            patch_member_resp = await client.patch(f"/api/v1/families/{family_id}/members/{member_id}", json=member_patch_payload)
            assert patch_member_resp.status_code == 200
            updated_member = patch_member_resp.json()
            assert updated_member["membership_role"] == "family_member"

            # 9. DELETE /api/v1/families/{id}/members/{member_id}
            del_member_resp = await client.delete(f"/api/v1/families/{family_id}/members/{member_id}")
            assert del_member_resp.status_code == 204

            # Verify member is removed
            members_after_del = await client.get(f"/api/v1/families/{family_id}/members")
            assert members_after_del.status_code == 200
            assert len(members_after_del.json()) == 1

            # --- Care Relationships Tests ---
            # Create a care subject
            subject = await family_svc.add_care_subject(
                requester_id=coord.id,
                family_id=uuid.UUID(family_id),
                fhir_patient_id="fhir-pat-rel-test",
                profile_id=coord.id,
                relationship_to_coordinator="father"
            )

            # 10. POST /api/v1/families/{id}/care-relationships
            care_rel_payload = {
                "subject_id": str(subject.id),
                "profile_id": str(coord.id),
                "relationship_type": "primary_caregiver",
                "access_level": "full"
            }
            create_rel_resp = await client.post(f"/api/v1/families/{family_id}/care-relationships", json=care_rel_payload)
            assert create_rel_resp.status_code == 201
            rel_data = create_rel_resp.json()
            rel_id = rel_data["id"]
            assert rel_data["relationship_type"] == "primary_caregiver"
            assert rel_data["access_level"] == "full"

            # 11. GET /api/v1/families/{id}/care-relationships
            list_rel_resp = await client.get(f"/api/v1/families/{family_id}/care-relationships")
            assert list_rel_resp.status_code == 200
            rel_list = list_rel_resp.json()
            assert len(rel_list) == 1
            assert rel_list[0]["id"] == rel_id

            # 12. PATCH /api/v1/families/{id}/care-relationships/{id}
            patch_rel_payload = {"access_level": "standard"}
            patch_rel_resp = await client.patch(f"/api/v1/families/{family_id}/care-relationships/{rel_id}", json=patch_rel_payload)
            assert patch_rel_resp.status_code == 200
            assert patch_rel_resp.json()["access_level"] == "standard"

            # 13. DELETE /api/v1/families/{id}/care-relationships/{id}
            del_rel_resp = await client.delete(f"/api/v1/families/{family_id}/care-relationships/{rel_id}")
            assert del_rel_resp.status_code == 204

            # Verify relationship is removed
            rel_after_del = await client.get(f"/api/v1/families/{family_id}/care-relationships")
            assert rel_after_del.status_code == 200
            assert len(rel_after_del.json()) == 0

            # --- Consent Endpoints Tests ---
            # 14. POST /api/v1/families/{id}/consents
            consent_payload = {
                "subject_id": str(subject.id),
                "grantee_id": str(member_data["profile_id"]),
                "scope": {"vitals": True, "medications": True, "health_summary": True},
                "status": "active"
            }
            create_consent_resp = await client.post(f"/api/v1/families/{family_id}/consents", json=consent_payload)

            assert create_consent_resp.status_code == 201
            consent_data = create_consent_resp.json()
            consent_id = consent_data["id"]
            assert consent_data["status"] == "active"
            assert consent_data["scope"]["vitals"] is True

            # 15. GET /api/v1/families/{id}/consents
            list_consents_resp = await client.get(f"/api/v1/families/{family_id}/consents")
            assert list_consents_resp.status_code == 200
            consents_list = list_consents_resp.json()
            assert len(consents_list) >= 1
            assert any(c["id"] == consent_id for c in consents_list)

            # 16. POST /api/v1/families/{id}/consents/{id}/revoke
            revoke_consent_resp = await client.post(f"/api/v1/families/{family_id}/consents/{consent_id}/revoke")
            assert revoke_consent_resp.status_code == 200
            revoked_data = revoke_consent_resp.json()
            assert revoked_data["status"] == "revoked"
            assert revoked_data["revoked_at"] is not None

            # --- HOME Endpoints Tests ---
            # 17. GET /api/v1/families/{family_id}/home (Coordinator Home)
            coord_home_resp = await client.get(f"/api/v1/families/{family_id}/home")
            assert coord_home_resp.status_code == 200
            coord_home = coord_home_resp.json()
            assert coord_home["coordinator_profile_id"] == str(coord.id)
            assert "parent_statuses" in coord_home
            assert "attention_items" in coord_home
            assert "guardian_moments" in coord_home
            assert "today_medications" in coord_home
            assert "upcoming_appointments" in coord_home
            assert "pending_care_tasks" in coord_home
            assert "recent_updates" in coord_home

            # 18. GET /api/v1/subjects/{subject_id}/home (Parent Home)
            parent_home_resp = await client.get(f"/api/v1/subjects/{subject.id}/home")
            assert parent_home_resp.status_code == 200
            parent_home = parent_home_resp.json()
            assert "checkin_status" in parent_home
            assert "today_medications" in parent_home
            assert "reminders" in parent_home
            assert "family_messages" in parent_home
            assert "pending_actions" in parent_home

            # --- CHECK-IN Endpoints Tests ---
            # 19. POST /api/v1/subjects/{subject_id}/check-ins
            checkin_payload = {
                "feeling": "good",
                "notes": "Feeling energetic and went for a morning walk.",
                "severity": "low"
            }
            create_ci_resp = await client.post(f"/api/v1/subjects/{subject.id}/check-ins", json=checkin_payload)
            assert create_ci_resp.status_code == 201
            ci_data = create_ci_resp.json()
            ci_id = ci_data["id"]
            assert ci_data["feeling"] == "good"
            assert ci_data["notes"] == "Feeling energetic and went for a morning walk."

            # 20. GET /api/v1/subjects/{subject_id}/check-ins
            list_ci_resp = await client.get(f"/api/v1/subjects/{subject.id}/check-ins")
            assert list_ci_resp.status_code == 200
            ci_list = list_ci_resp.json()
            assert len(ci_list) >= 1
            assert any(c["id"] == ci_id for c in ci_list)

            # 21. GET /api/v1/subjects/{subject_id}/check-ins/latest
            latest_ci_resp = await client.get(f"/api/v1/subjects/{subject.id}/check-ins/latest")
            assert latest_ci_resp.status_code == 200
            latest_ci = latest_ci_resp.json()
            assert latest_ci["id"] == ci_id
            assert latest_ci["feeling"] == "good"

            # --- MEDICATION Endpoints Tests ---
            # 22. GET /api/v1/subjects/{subject_id}/medications
            meds_resp = await client.get(f"/api/v1/subjects/{subject.id}/medications")
            assert meds_resp.status_code == 200
            assert isinstance(meds_resp.json(), list)

            # 23. POST /api/v1/subjects/{subject_id}/medications/{medication_id}/take
            med_id = "med-rx-metformin-500"
            take_resp = await client.post(f"/api/v1/subjects/{subject.id}/medications/{med_id}/take")
            assert take_resp.status_code == 200
            take_data = take_resp.json()
            assert take_data["fhir_medication_request_id"] == med_id
            assert take_data["status"] == "taken"
            assert take_data["confirmed_at"] is not None

            # 24. GET /api/v1/subjects/{subject_id}/medication-adherence
            adh_resp = await client.get(f"/api/v1/subjects/{subject.id}/medication-adherence")
            assert adh_resp.status_code == 200
            adh_list = adh_resp.json()
            assert len(adh_list) >= 1
            assert any(a["fhir_medication_request_id"] == med_id for a in adh_list)

            # 25. POST /api/v1/subjects/{subject_id}/medications/{medication_id}/remind
            remind_resp = await client.post(f"/api/v1/subjects/{subject.id}/medications/{med_id}/remind")
            assert remind_resp.status_code == 200
            remind_data = remind_resp.json()
            assert remind_data["status"] == "reminder_sent"
            assert remind_data["medication_id"] == med_id
            assert remind_data["subject_id"] == str(subject.id)

            # --- APPOINTMENTS Endpoints Tests ---
            # 26. GET /api/v1/subjects/{subject_id}/appointments
            appts_resp = await client.get(f"/api/v1/subjects/{subject.id}/appointments")
            assert appts_resp.status_code == 200
            appts_list = appts_resp.json()
            assert isinstance(appts_list, list)

            # 27. POST /api/v1/appointments/{id}/prepare
            appt_id = "appt-cardio-checkup-442"
            prep_resp = await client.post(f"/api/v1/appointments/{appt_id}/prepare")
            assert prep_resp.status_code == 200
            prep_data = prep_resp.json()
            assert prep_data["preparation_status"] == "ready"
            assert prep_data["fhir_appointment_id"] == appt_id

            # 28. GET /api/v1/appointments/{id}
            get_appt_resp = await client.get(f"/api/v1/appointments/{appt_id}")
            assert get_appt_resp.status_code == 200
            get_appt_data = get_appt_resp.json()
            assert get_appt_data["fhir_appointment_id"] == appt_id
            assert get_appt_data["preparation_status"] == "ready"

            # 29. POST /api/v1/appointments/{id}/share-summary
            share_resp = await client.post(f"/api/v1/appointments/{appt_id}/share-summary")
            assert share_resp.status_code == 200
            share_data = share_resp.json()
            assert share_data["summary_status"] == "shared"
            assert share_data["fhir_appointment_id"] == appt_id

            # --- CARE TASKS Endpoints Tests ---
            # 30. POST /api/v1/families/{family_id}/care/tasks
            task_payload = {
                "subject_id": str(subject.id),
                "assigned_to_profile_id": str(coord.id),
                "title": "Pick up cardiology medication prescription",
                "description": "Collect Metformin from Apollo Pharmacy",
                "category": "medication",
                "priority": "high",
                "due_at": "2026-08-25T18:00:00"
            }
            create_task_resp = await client.post(f"/api/v1/families/{family_id}/care/tasks", json=task_payload)
            assert create_task_resp.status_code == 201
            task_data = create_task_resp.json()
            task_id = task_data["id"]
            assert task_data["title"] == "Pick up cardiology medication prescription"
            assert task_data["priority"] == "high"
            assert task_data["status"] == "pending"

            # 31. GET /api/v1/families/{family_id}/care/tasks
            list_tasks_resp = await client.get(f"/api/v1/families/{family_id}/care/tasks")
            assert list_tasks_resp.status_code == 200
            tasks_list = list_tasks_resp.json()
            assert len(tasks_list) >= 1
            assert any(t["id"] == task_id for t in tasks_list)

            # 32. PATCH /api/v1/care/tasks/{id}
            patch_task_payload = {
                "title": "Pick up cardiology medication & monitor vitals",
                "priority": "urgent"
            }
            patch_task_resp = await client.patch(f"/api/v1/care/tasks/{task_id}", json=patch_task_payload)
            assert patch_task_resp.status_code == 200
            patched_task = patch_task_resp.json()
            assert patched_task["title"] == "Pick up cardiology medication & monitor vitals"
            assert patched_task["priority"] == "urgent"

            # 33. POST /api/v1/care/tasks/{id}/assign
            assign_task_payload = {
                "assigned_to_profile_id": str(coord.id)
            }
            assign_task_resp = await client.post(f"/api/v1/care/tasks/{task_id}/assign", json=assign_task_payload)
            assert assign_task_resp.status_code == 200
            assigned_task = assign_task_resp.json()
            assert assigned_task["assigned_to_profile_id"] == str(coord.id)


            # 34. POST /api/v1/care/tasks/{id}/complete
            complete_task_resp = await client.post(f"/api/v1/care/tasks/{task_id}/complete")
            assert complete_task_resp.status_code == 200
            completed_task = complete_task_resp.json()
            assert completed_task["status"] == "completed"
            assert completed_task["completed_at"] is not None

            # --- INSIGHTS Endpoints Tests ---
            # Create a test AI insight
            insight = await family_svc.add_ai_insight(
                requester_id=coord.id,
                family_id=uuid.UUID(family_id),
                subject_id=subject.id,
                type="medication_adherence_trend",

                severity="medium",
                title="Morning Medication Consistency",
                summary="Missed morning Metformin dosage twice this week.",
                observation="Adherence rate dropped to 71% over the past 7 days.",
                timeframe_start=datetime.now() - timedelta(days=7),
                timeframe_end=datetime.now(),
                recommendation="Set an automated reminder for 8:30 AM."
            )

            # 35. GET /api/v1/subjects/{subject_id}/insights
            list_insights_resp = await client.get(f"/api/v1/subjects/{subject.id}/insights")
            assert list_insights_resp.status_code == 200
            insights_list = list_insights_resp.json()
            assert len(insights_list) >= 1
            assert any(i["id"] == str(insight.id) for i in insights_list)

            # 36. GET /api/v1/insights/{id}
            get_insight_resp = await client.get(f"/api/v1/insights/{insight.id}")
            assert get_insight_resp.status_code == 200
            insight_data = get_insight_resp.json()
            assert insight_data["id"] == str(insight.id)
            assert insight_data["title"] == "Morning Medication Consistency"

            # 37. POST /api/v1/subjects/{subject_id}/insights/{id}/act
            act_payload = {
                "action_type": "create_care_task",
                "custom_notes": "Setup reminder alarm on parent's phone"
            }
            act_resp = await client.post(f"/api/v1/subjects/{subject.id}/insights/{insight.id}/act", json=act_payload)
            assert act_resp.status_code == 200
            act_data = act_resp.json()
            assert act_data["status"] == "action_executed"
            assert act_data["insight_id"] == str(insight.id)
            assert act_data["task_id"] is not None

            # 38. POST /api/v1/subjects/{subject_id}/insights/{id}/dismiss
            dismiss_payload = {
                "reason": "Acknowledged and resolved"
            }
            dismiss_resp = await client.post(f"/api/v1/subjects/{subject.id}/insights/{insight.id}/dismiss", json=dismiss_payload)
            assert dismiss_resp.status_code == 200
            dismissed_data = dismiss_resp.json()
            assert dismissed_data["id"] == str(insight.id)
            assert dismissed_data["status"] == "dismissed"

            # --- DOCUMENTS & FILENEST INTEGRATION Endpoints Tests ---
            # 39. POST /api/v1/subjects/{subject_id}/documents (Create KinGuardian metadata + FileNest upload target)
            doc_init_payload = {
                "document_type": "prescription",
                "filename": "cardio_prescription_2026.pdf",
                "mime_type": "application/pdf",
                "file_size_bytes": 1048576
            }
            init_doc_resp = await client.post(f"/api/v1/subjects/{subject.id}/documents", json=doc_init_payload)
            assert init_doc_resp.status_code == 201
            doc_init_data = init_doc_resp.json()
            doc_id = doc_init_data["document_id"]
            filenest_file_id = doc_init_data["filenest_file_id"]
            assert doc_init_data["status"] == "pending_upload"
            assert "upload_url" in doc_init_data
            assert filenest_file_id in doc_init_data["upload_url"]

            # 40. GET /api/v1/subjects/{subject_id}/documents
            list_docs_resp = await client.get(f"/api/v1/subjects/{subject.id}/documents")
            assert list_docs_resp.status_code == 200
            docs_list = list_docs_resp.json()
            assert len(docs_list) >= 1
            assert any(d["id"] == doc_id for d in docs_list)

            # 41. POST /api/v1/documents/webhook (FileNest processing -> KinGuardian workflow -> AI extraction)
            webhook_payload = {
                "event": "filenest.processing.completed",
                "file_id": filenest_file_id,
                "status": "ready",
                "mime_type": "application/pdf",
                "classification": "prescription",
                "extracted_text": "Patient Rx: Metformin 500mg BID, Atorvastatin 20mg QD",
                "metadata": {"pages": 1, "ocr_engine": "filenest-vision-v2"}
            }
            webhook_resp = await client.post("/api/v1/documents/webhook", json=webhook_payload)
            assert webhook_resp.status_code == 200
            webhook_result = webhook_resp.json()
            assert webhook_result["status"] == "processed"
            assert webhook_result["document_id"] == doc_id
            assert "extraction_id" in webhook_result

            # 42. GET /api/v1/documents/{id}
            get_doc_resp = await client.get(f"/api/v1/documents/{doc_id}")
            assert get_doc_resp.status_code == 200
            get_doc_data = get_doc_resp.json()
            assert get_doc_data["id"] == doc_id
            assert get_doc_data["status"] == "active"
            assert get_doc_data["ai_processing_status"] == "completed"
            assert get_doc_data["extraction_status"] == "completed"

            # 43. GET /api/v1/documents/{id}/extractions
            get_ext_resp = await client.get(f"/api/v1/documents/{doc_id}/extractions")
            assert get_ext_resp.status_code == 200
            extractions_list = get_ext_resp.json()
            assert len(extractions_list) >= 1
            assert extractions_list[0]["extraction_type"] == "prescription"
            assert "medications" in extractions_list[0]["normalized_output"]

            # --- AI FACADE Endpoints Tests ---
            # 44. POST /api/v1/ai/conversations
            start_conv_payload = {
                "family_id": str(family_id),
                "subject_id": str(subject.id),
                "conversation_type": "consultation",
                "context_scope": {"clinical_focus": "cardiovascular_management"}
            }
            conv_resp = await client.post("/api/v1/ai/conversations", json=start_conv_payload)
            assert conv_resp.status_code == 201
            conv_data = conv_resp.json()
            ai_conv_id = conv_data["id"]
            assert conv_data["conversation_type"] == "consultation"
            assert conv_data["family_id"] == str(family_id)

            # 45. GET /api/v1/ai/conversations/{id}
            get_conv_resp = await client.get(f"/api/v1/ai/conversations/{ai_conv_id}")
            assert get_conv_resp.status_code == 200
            get_conv_data = get_conv_resp.json()
            assert get_conv_data["id"] == ai_conv_id

            # 46. POST /api/v1/ai/conversations/{id}/messages
            msg_payload = {
                "content": "Can you summarize the patient's recent adherence and upcoming cardiology visits?"
            }
            msg_resp = await client.post(f"/api/v1/ai/conversations/{ai_conv_id}/messages", json=msg_payload)
            assert msg_resp.status_code == 200
            msg_data = msg_resp.json()
            assert msg_data["conversation_id"] == ai_conv_id
            assert msg_data["sender_role"] == "assistant"
            assert len(msg_data["content"]) > 10

            # 47. GET /api/v1/ai/conversations/{id}/messages
            list_msgs_resp = await client.get(f"/api/v1/ai/conversations/{ai_conv_id}/messages")
            assert list_msgs_resp.status_code == 200
            msgs_list = list_msgs_resp.json()
            assert len(msgs_list) >= 2  # user + assistant
            assert msgs_list[0]["sender_role"] == "user"
            assert msgs_list[1]["sender_role"] == "assistant"

            # 48. POST /api/v1/ai/insights/generate
            gen_insight_payload = {
                "family_id": str(family_id),
                "subject_id": str(subject.id),
                "insight_type": "medication_adherence_trend",
                "timeframe_days": 7
            }
            gen_insight_resp = await client.post("/api/v1/ai/insights/generate", json=gen_insight_payload)
            assert gen_insight_resp.status_code == 201
            gen_insight_data = gen_insight_resp.json()
            assert gen_insight_data["type"] == "medication_adherence_trend"
            assert gen_insight_data["generated_by"] == "kinguardian_ai_facade"
            assert gen_insight_data["confidence"] is not None

            # 49. POST /api/v1/ai/appointments/{id}/prepare
            ai_prep_payload = {
                "custom_focus_areas": ["Blood Pressure Trends", "Metformin tolerability"],
                "notes": "Discussing recent dizziness symptoms"
            }
            ai_prep_resp = await client.post(f"/api/v1/ai/appointments/{appt_id}/prepare", json=ai_prep_payload)
            assert ai_prep_resp.status_code == 200
            ai_prep_data = ai_prep_resp.json()
            assert ai_prep_data["appointment_id"] == appt_id
            assert ai_prep_data["preparation_status"] == "ready"
            assert len(ai_prep_data["questions_for_doctor"]) >= 3
            
    finally:
        app.dependency_overrides.clear()











