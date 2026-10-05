"""
Database & API Verification Test Suite for COORD-001, COORD-002, COORD-003
Tests against live database (PostgreSQL) and FastAPI endpoints:
- COORD-001 (P1): New coordinator onboarding flow creates family context in families & memberships tables and routes to Coordinator Home.
- COORD-002 (P1): Parent has no recent events -> Home displays appropriate reassurance and data-availability state without false alerts.
- COORD-003 (P0): Guardian Moment exists for Dad -> Home displays prominent and actionable Guardian Moment citing underlying data.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
import httpx
from sqlalchemy import select, text
from app.db import SessionLocal
from app.main import app
from app.models import (
    AuditLog,
    CareSubject,
    CheckIn,
    Family,
    Insight,
    Membership,
    Notification,
    Profile
)
from app.security import create_access_token


async def run_coord_tests():
    print("=================================================================")
    print("STARTING VERIFICATION: COORD-001, COORD-002, COORD-003")
    print("=================================================================\n")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        async with SessionLocal() as session:
            # -----------------------------------------------------------------
            # TEST COORD-001: New coordinator completes onboarding flow
            # Expected: Onboarding creates family context and routes to Coordinator Home.
            # Data / Tables: families, memberships
            # -----------------------------------------------------------------
            print(">>> TEST COORD-001: Coordinator Onboarding & Family Context Creation")
            coord_email = f"coord_test_{uuid.uuid4().hex[:6]}@example.com"
            coord_profile = Profile(
                identity_subject=f"local:{coord_email}",
                email=coord_email,
                display_name="Sarah Jenkins",
                role="coordinator",
                timezone="Europe/London"
            )
            session.add(coord_profile)
            await session.commit()
            await session.refresh(coord_profile)

            coord_token = create_access_token({
                "sub": str(coord_profile.identity_subject),
                "email": coord_profile.email,
                "name": coord_profile.display_name,
                "role": "coordinator",
                "permissions": ["families:read", "families:write", "memberships:read", "memberships:write"]
            })
            headers = {"Authorization": f"Bearer {coord_token}"}

            onboarding_payload = {
                "location": "UK",
                "timezone": "Europe/London",
                "family_name": "Jenkins Care Circle",
                "force_new": True,
                "parent": {
                    "name": "Dad (Ramesh Jenkins)",
                    "relationship": "Father",
                    "city": "Chennai",
                    "age": 68,
                    "phone": "+91 98765 43210",
                    "invite_method": "WhatsApp"
                }
            }

            # Step 1: Execute onboarding flow endpoint
            res = await client.post("/api/v1/coordinator/onboarding", json=onboarding_payload, headers=headers)
            assert res.status_code == 200, f"Onboarding failed: {res.text}"
            data = res.json()
            print(f"  [+] Onboarding response status: {data['status']}")
            assert data["status"] == "completed"
            assert data["route"] == "/(coordinator)"
            assert data["membership_created"] is True
            family_id = uuid.UUID(data["family_id"])

            # Step 2: Database Verification in `families` and `memberships` tables
            fam_db = await session.get(Family, family_id)
            assert fam_db is not None, "Family record not found in families table"
            assert fam_db.name == "Jenkins Care Circle"
            print(f"  [+] Verified family in DB: id={fam_db.id}, name={fam_db.name}")

            mem_res = await session.execute(
                select(Membership).where(Membership.family_id == family_id, Membership.profile_id == coord_profile.id)
            )
            coord_mem = mem_res.scalar_one_or_none()
            assert coord_mem is not None, "Coordinator membership record not found in memberships table"
            assert coord_mem.role == "coordinator"
            assert coord_mem.status == "active"
            print(f"  [+] Verified coordinator membership in DB: id={coord_mem.id}, role={coord_mem.role}")

            # Verify parent care subject and invitation
            cs_res = await session.execute(select(CareSubject).where(CareSubject.family_id == family_id))
            care_subjects = cs_res.scalars().all()
            assert len(care_subjects) > 0, "CareSubject record not created for Dad"
            dad_sub = care_subjects[0]
            print(f"  [+] Verified Dad CareSubject in DB: id={dad_sub.id}, family_id={dad_sub.family_id}")

            notif_res = await session.execute(select(Notification).where(Notification.family_id == family_id))
            notifs = notif_res.scalars().all()
            assert any(n.event_type == "family.invitation" for n in notifs), "Family invitation notification not created"
            print(f"  [+] Verified invitation notification sent to parent")

            print("  --> COORD-001 PASSED (Families, memberships, care_subjects, and routing verified!)\n")

            # -----------------------------------------------------------------
            # TEST COORD-002: Parent has no recent events
            # Expected: Home displays appropriate no-attention/reassurance or data-availability state, not a false alert.
            # Data / Tables: checkins, insights, notifications
            # -----------------------------------------------------------------
            print(">>> TEST COORD-002: Parent Has No Recent Events -> Reassurance & Data Availability State")
            home_res = await client.get(f"/api/v1/families/{family_id}/home", headers=headers)
            assert home_res.status_code == 200, f"Home failed: {home_res.text}"
            home_data = home_res.json()

            reassurance = home_data.get("reassurance")
            today_attention = home_data.get("today_attention")

            print(f"  [+] Home reassurance status: {reassurance.get('status')}")
            print(f"  [+] Reassurance card title: {reassurance.get('card_title')}")
            print(f"  [+] Data availability message: {reassurance.get('data_availability')}")
            print(f"  [+] Urgent alerts count: {reassurance.get('urgent_alerts_count')}")
            print(f"  [+] Is false alert: {reassurance.get('is_false_alert')}")

            # Assertions per COORD-002 specifications:
            assert reassurance["status"] == "optimal", f"Expected optimal reassurance, got {reassurance['status']}"
            assert reassurance["no_attention_required"] is True, "Expected no_attention_required == True"
            assert reassurance["is_false_alert"] is False, "Expected is_false_alert == False"
            assert reassurance["urgent_alerts_count"] == 0, "Expected 0 urgent alerts when no events exist"
            assert "Data available" in reassurance["data_availability"] or "active" in reassurance["data_availability"].lower()
            assert today_attention["prominent"] is False, "Expected attention to NOT be prominent when no events"
            assert today_attention["guardian_moment"] is None, "Expected no Guardian Moment for calm state"
            print("  --> COORD-002 PASSED (Reassurance and data-availability state verified without false alerts!)\n")

            # -----------------------------------------------------------------
            # TEST COORD-003: Guardian Moment exists for Dad
            # Expected: Guardian Moment is prominent and actionable; summary cites underlying data.
            # Data / Tables: insights, care_subjects
            # -----------------------------------------------------------------
            print(">>> TEST COORD-003: Guardian Moment Exists for Dad -> Prominent, Actionable, Citing Data")
            gm_create_res = await client.post(
                f"/api/v1/insights/guardian-moment?subject_id={dad_sub.id}&family_id={family_id}",
                headers=headers
            )
            assert gm_create_res.status_code in [200, 201], f"Guardian moment creation failed: {gm_create_res.text}"
            gm_data = gm_create_res.json()

            print(f"  [+] Created Guardian Moment in DB: id={gm_data.get('id')}")
            print(f"  [+] Summary: {gm_data.get('summary')}")
            print(f"  [+] Prominent: {gm_data.get('prominent')}")
            print(f"  [+] Actionable: {gm_data.get('actionable')}")
            print(f"  [+] Summary cites data: {gm_data.get('summary_cites_data')}")

            # Verify in DB table `insights`
            insight_res = await session.execute(
                select(Insight).where(Insight.family_id == family_id, Insight.type == "guardian_moment")
            )
            db_insight = insight_res.scalars().first()
            assert db_insight is not None, "Guardian moment insight not found in DB insights table"
            assert db_insight.status == "active"
            print(f"  [+] Verified Insight in database: id={db_insight.id}, type={db_insight.type}, status={db_insight.status}")

            # Now query Coordinator Home again to verify prominent & actionable display citing data
            home_res_gm = await client.get(f"/api/v1/families/{family_id}/home", headers=headers)
            assert home_res_gm.status_code == 200
            home_gm_data = home_res_gm.json()

            today_gm = home_gm_data["today_attention"]
            print(f"  [+] Home today_attention prominent: {today_gm.get('prominent')}")
            print(f"  [+] Home today_attention actionable: {today_gm.get('actionable')}")
            print(f"  [+] Home today_attention cites data: {today_gm.get('summary_cites_data')}")

            # Assertions per COORD-003 specifications:
            assert today_gm["prominent"] is True, "Expected Guardian Moment to be prominent"
            assert today_gm["actionable"] is True, "Expected Guardian Moment to be actionable"
            assert today_gm["summary_cites_data"] is True, "Expected summary to cite underlying data"
            assert today_gm["guardian_moment"] is not None, "Expected guardian_moment object in today_attention"

            # Verify underlying data citations in the summary & AI explanation
            gm_obj = today_gm["guardian_moment"]
            text_content = (gm_obj.get("summary", "") + " " + gm_obj.get("observation", "") + " " + gm_obj.get("sources", "")).lower()
            has_baseline_citation = any(w in text_content for w in ["baseline", "step", "34%", "telemetry", "google fit", "health connect"])
            assert has_baseline_citation, f"Guardian Moment summary does not cite underlying data: {text_content}"
            print(f"  [+] Confirmed underlying data citations: {gm_obj.get('summary')}")
            print("  --> COORD-003 PASSED (Prominent, actionable Guardian Moment citing underlying data verified!)\n")

    print("=================================================================")
    print("ALL 3 COORD TEST SCENARIOS (COORD-001, COORD-002, COORD-003) PASSED!")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(run_coord_tests())
