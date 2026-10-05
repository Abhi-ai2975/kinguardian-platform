"""
Automated End-to-End Verification Test for E2E-003 (Priority P1):
Title: Mom uploads lab report - Document Lifecycle
Scenario Flow: Mom uploads -> FileNest processing -> AI extraction -> Coordinator review -> Approved data used in appointment preparation.
Key Invariants:
1. Document lifecycle is complete (pending -> ready -> approved).
2. Only reviewed data is mapped into clinical workflow (appointment preparation).
3. Tables verified: document_references, insights, audit_log.
4. Integrations verified: FileNest + Agent + FHIR.
"""

import sys
sys.path.insert(0, ".")

import asyncio
import json
import uuid
from datetime import datetime, timezone
import httpx
import pytest
from sqlalchemy import select, text
from app.db import SessionLocal
from app.main import app
from app.models import (
    Appointment,
    AuditLog,
    CareSubject,
    Consent,
    DocumentReference,
    Family,
    Insight,
    Membership,
    Profile
)
from app.security import create_access_token


@pytest.mark.asyncio
async def test_e2e_003_mom_uploads_lab_report_lifecycle():
    print("\n=================================================================")
    print("STARTING TEST E2E-003: Mom Uploads Lab Report - Document Lifecycle")
    print("=================================================================\n")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # -------------------------------------------------------------
        # STEP 0: Setup Family Context (Mom, Dad/Subject, Coordinator)
        # -------------------------------------------------------------
        print(">>> Step 0: Setting up Family Context (Mom, Dad, Coordinator)")
        tag = uuid.uuid4().hex[:6]
        async with SessionLocal() as session:
            family = Family(name=f"Sharma Family {tag}", home_timezone="Asia/Kolkata")
            session.add(family)
            await session.flush()

            # Mom Profile
            mom_profile = Profile(
                identity_subject=f"mom_{tag}",
                email=f"mom_{tag}@example.com",
                display_name="Sunita Sharma (Mom)",
                role="parent",
                timezone="Asia/Kolkata"
            )
            session.add(mom_profile)

            # Coordinator Profile
            coord_profile = Profile(
                identity_subject=f"coord_{tag}",
                email=f"coord_{tag}@example.com",
                display_name="Priya Patel (Care Coordinator)",
                role="coordinator",
                timezone="Asia/Kolkata"
            )
            session.add(coord_profile)
            await session.flush()

            # Memberships
            session.add(Membership(family_id=family.id, profile_id=mom_profile.id, role="parent", status="active"))
            session.add(Membership(family_id=family.id, profile_id=coord_profile.id, role="coordinator", status="active"))

            # Care Subject (Dad - Ramesh Sharma)
            dad_subject = CareSubject(
                family_id=family.id,
                profile_id=mom_profile.id,
                preferred_timezone="Asia/Kolkata",
                external_patient_ref=f"Parent-Dad-Ramesh-{tag}"
            )
            session.add(dad_subject)
            await session.flush()

            # Consent for coordinator to access health summary and clinical data
            consent = Consent(
                subject_id=dad_subject.id,
                granted_to_profile_id=coord_profile.id,
                status="active",
                scopes=["health.summary", "clinical", "medications", "care.tasks", "appointments"]
            )
            session.add(consent)

            # Appointment tomorrow for Dad
            tomorrow = datetime.now(timezone.utc)
            appointment = Appointment(
                family_id=family.id,
                subject_id=dad_subject.id,
                created_by=coord_profile.id,
                doctor_name="Dr. Arvind Sharma",
                specialty="Cardiology",
                date=tomorrow,
                time="16:00",
                location="Apollo Hospitals, Greams Road",
                status="scheduled",
                notes="Cardiology 6-month checkup and routine blood panel review."
            )
            session.add(appointment)
            await session.commit()

            family_id = family.id
            mom_id = mom_profile.id
            coord_id = coord_profile.id
            dad_id = dad_subject.id
            appointment_id = appointment.id

        # Auth tokens
        mom_token = create_access_token({
            "sub": f"mom_{tag}",
            "email": f"mom_{tag}@example.com",
            "name": "Sunita Sharma (Mom)",
            "role": "parent",
            "permissions": ["documents:write", "documents:read"]
        })
        coord_token = create_access_token({
            "sub": f"coord_{tag}",
            "email": f"coord_{tag}@example.com",
            "name": "Priya Patel (Care Coordinator)",
            "role": "coordinator",
            "permissions": ["documents:write", "documents:read", "appointments:read"]
        })
        mom_headers = {"Authorization": f"Bearer {mom_token}"}
        coord_headers = {"Authorization": f"Bearer {coord_token}"}

        # -------------------------------------------------------------
        # STEP 1: Mom uploads lab report (FileNest)
        # -------------------------------------------------------------
        print("\n>>> Step 1: Mom uploads lab report to FileNest")
        filenest_file = f"apollo_lab_report_hba1c_{tag}.pdf"
        upload_payload = {
            "family_id": str(family_id),
            "subject_id": str(dad_id),
            "filenest_file_id": filenest_file,
            "classification": "lab_report"
        }
        res_upload = await client.post("/api/v1/documents/lab-report", json=upload_payload, headers=mom_headers)
        assert res_upload.status_code == 201, f"Document upload failed: {res_upload.text}"
        doc_data = res_upload.json()
        doc_id = doc_data["id"]
        print(f"  [+] Document Reference created: id={doc_id}, file={doc_data['filenest_file_id']}")
        print(f"  [+] Initial Status: {doc_data['status']}, Classification: {doc_data['classification']}")
        assert doc_data["status"] == "pending"
        assert doc_data["classification"] == "lab_report"

        # Check database for document_references and audit_log
        async with SessionLocal() as session:
            db_doc = await session.get(DocumentReference, uuid.UUID(doc_id))
            assert db_doc is not None
            assert db_doc.classification == "lab_report"
            assert db_doc.status == "pending"
            assert db_doc.uploaded_by == mom_id

            upload_audit = (await session.execute(
                select(AuditLog).where(
                    AuditLog.resource_id == str(doc_id),
                    AuditLog.action == "document_upload"
                )
            )).scalars().first()
            assert upload_audit is not None, "AuditLog entry for document_upload not found"
            print(f"  [+] AuditLog verified for upload: action={upload_audit.action}, actor_id={upload_audit.actor_id}")

        # -------------------------------------------------------------
        # STEP 2: FileNest processing initiated & completed
        # -------------------------------------------------------------
        print("\n>>> Step 2: FileNest processing initiated")
        res_process = await client.post(f"/api/v1/documents/{doc_id}/process", headers=coord_headers)
        assert res_process.status_code == 200, f"Process failed: {res_process.text}"
        proc_data = res_process.json()
        print(f"  [+] Processing state: {proc_data.get('processing_state')}, filenest_status: {proc_data.get('filenest_status')}")
        assert proc_data["status"] == "ready"

        # -------------------------------------------------------------
        # STEP 3: AI extraction completes (Separation of unreviewed candidate facts)
        # -------------------------------------------------------------
        print("\n>>> Step 3: AI extraction executes on lab report")
        res_extract = await client.post(f"/api/v1/documents/{doc_id}/extract", headers=coord_headers)
        assert res_extract.status_code == 200, f"Extraction failed: {res_extract.text}"
        ext_data = res_extract.json()
        print(f"  [+] Extraction complete: {ext_data.get('extraction_complete')}")
        print(f"  [+] Requires human review: {ext_data.get('requires_human_review')}")
        print(f"  [+] Auto confirmed: {ext_data.get('auto_confirmed')}")
        print(f"  [+] Candidate values: {ext_data.get('candidate_values')}")
        assert ext_data["extraction_complete"] is True
        assert ext_data["requires_human_review"] is True
        assert ext_data["auto_confirmed"] is False
        assert len(ext_data["candidate_values"]) > 0

        # Verify AI extraction audit log
        async with SessionLocal() as session:
            extract_audit = (await session.execute(
                select(AuditLog).where(
                    AuditLog.resource_id == str(doc_id),
                    AuditLog.action == "document_ai_extraction"
                )
            )).scalars().first()
            assert extract_audit is not None, "AuditLog entry for document_ai_extraction not found"
            print(f"  [+] AI extraction audit verified: {extract_audit.action}")

        # -------------------------------------------------------------
        # STEP 3B: Verify Clinical Isolation Invariant
        # (Unreviewed lab data MUST NOT be mapped into appointment prep yet)
        # -------------------------------------------------------------
        print("\n>>> Step 3B: Verifying Clinical Workflow Isolation (Before Coordinator Review)")
        res_prep_pre = await client.get(
            f"/api/v1/appointments/{appointment_id}/preparation?subject_id={dad_id}",
            headers=coord_headers
        )
        assert res_prep_pre.status_code == 200
        prep_pre_data = res_prep_pre.json()
        print(f"  [+] Pre-review appointment prep reviewed_data_mapped: {prep_pre_data.get('reviewed_data_mapped')}")
        print(f"  [+] Pre-review unreviewed_data_excluded: {prep_pre_data.get('unreviewed_data_excluded')}")
        assert prep_pre_data["reviewed_data_mapped"] is False, "Unreviewed data was incorrectly mapped into clinical workflow!"
        assert prep_pre_data["unreviewed_data_excluded"] is True
        assert "Approved Lab" not in prep_pre_data["clinical_summary"]
        print("  [+] Clinical isolation verified: Unreviewed lab report correctly excluded from clinical summary.")

        # -------------------------------------------------------------
        # STEP 4: Coordinator reviews and approves document
        # -------------------------------------------------------------
        print("\n>>> Step 4: Coordinator reviews and approves the lab report")
        res_approve = await client.post(f"/api/v1/documents/{doc_id}/approve", headers=coord_headers)
        assert res_approve.status_code == 200, f"Approve failed: {res_approve.text}"
        appr_data = res_approve.json()
        print(f"  [+] Approved status: {appr_data.get('status')}")
        assert appr_data["status"] == "approved"

        async with SessionLocal() as session:
            # Check database for approval in document_references
            db_doc_ref = await session.get(DocumentReference, uuid.UUID(doc_id))
            assert db_doc_ref.status == "approved"

            # Check audit_log for document_approve and clinical_write
            appr_audits = (await session.execute(
                select(AuditLog).where(
                    AuditLog.resource_id == str(doc_id),
                    AuditLog.action.in_(["document_approve", "clinical_write"])
                )
            )).scalars().all()
            assert len(appr_audits) >= 2, "Expected document_approve and clinical_write audit entries"
            print(f"  [+] Verified {len(appr_audits)} approval/clinical audit entries in audit_log")

            # Check insights table for reviewed clinical insight
            lab_insight = (await session.execute(
                select(Insight).where(
                    Insight.family_id == family_id,
                    Insight.deduplication_key == f"lab_doc_{doc_id}"
                )
            )).scalars().first()
            assert lab_insight is not None, "Clinical insight was not created in insights table upon approval"
            print(f"  [+] Created Insight in DB: id={lab_insight.id}, summary={lab_insight.summary}")
            assert "HbA1c 6.8%" in lab_insight.summary
            assert lab_insight.status == "active"
            assert lab_insight.type == "clinical"

        # -------------------------------------------------------------
        # STEP 5: Approved data used in Appointment Preparation (Clinical Workflow)
        # -------------------------------------------------------------
        print("\n>>> Step 5: Approved data mapped into Appointment Preparation")
        res_prep_post = await client.get(
            f"/api/v1/appointments/{appointment_id}/preparation?subject_id={dad_id}",
            headers=coord_headers
        )
        assert res_prep_post.status_code == 200, f"Appointment prep failed: {res_prep_post.text}"
        prep_post_data = res_prep_post.json()
        print(f"  [+] Post-review appointment prep reviewed_data_mapped: {prep_post_data.get('reviewed_data_mapped')}")
        print(f"  [+] Clinical summary: {prep_post_data.get('clinical_summary')}")
        print(f"  [+] Suggested questions: {prep_post_data.get('suggested_questions')}")

        assert prep_post_data["reviewed_data_mapped"] is True, "Approved lab data not mapped into clinical workflow!"
        assert prep_post_data["lab_report_source"] == filenest_file
        assert "HbA1c 6.8%" in prep_post_data["clinical_summary"]
        assert any("HbA1c at 6.8%" in q for q in prep_post_data["suggested_questions"]), "Lab findings not reflected in doctor questions"

        async with SessionLocal() as session:
            # Verify appointment.prepare recorded in audit_log (latest after review)
            prep_audit = (await session.execute(
                select(AuditLog).where(
                    AuditLog.resource_id == str(appointment_id),
                    AuditLog.action == "appointment.prepare"
                ).order_by(AuditLog.created_at.desc())
            )).scalars().first()
            assert prep_audit is not None, "AuditLog entry for appointment.prepare not found"
            assert prep_audit.metadata_json.get("reviewed_data_mapped") is True

            # -------------------------------------------------------------
            # STEP 6: Execute EXACT Database Verification Query from COMPLETE_113_TEST_SCENARIOS.md
            # -------------------------------------------------------------
            print("\n>>> Step 6: Executing Exact Specification Database Verification Query")
            verification_sql = text("""
                SELECT id, filenest_file_id, classification, status, uploaded_by, created_at 
                FROM document_references 
                WHERE classification = 'lab_report'
                ORDER BY created_at DESC 
                LIMIT 1;
            """)
            result = (await session.execute(verification_sql)).mappings().first()
            assert result is not None, "No lab report found in document_references"
            print(f"  [DB Verification Result]:")
            print(f"    id:               {result['id']}")
            print(f"    filenest_file_id: {result['filenest_file_id']}")
            print(f"    classification:   {result['classification']}")
            print(f"    status:           {result['status']}")
            print(f"    uploaded_by:      {result['uploaded_by']}")
            print(f"    created_at:       {result['created_at']}")

            assert uuid.UUID(str(result["id"])) == uuid.UUID(str(doc_id))
            assert result["filenest_file_id"] == filenest_file
            assert result["classification"] == "lab_report"
            assert result["status"] == "approved"
            assert uuid.UUID(str(result["uploaded_by"])) == uuid.UUID(str(mom_id))

    print("\n=================================================================")
    print("TEST E2E-003 PASSED COMPLETELY! (All 6 criteria and tables verified)")
    print("=================================================================\n")


if __name__ == "__main__":
    asyncio.run(test_e2e_003_mom_uploads_lab_report_lifecycle())
