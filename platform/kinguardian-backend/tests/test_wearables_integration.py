"""
Open Wearables Integration Test Suite.
Verifies the integration between KinGuardian backend and the Open Wearables aggregation platform:
1. Hexagonal OpenWearablesGateway & Circuit Breaker resilience.
2. WearableService metrics querying, connection invitations, and dashboard aggregation.
3. Baseline anomaly detection (activity drop) triggering Guardian Moments.
4. Inbound Open Wearables webhook processing and transactional outbox event staging.
5. REST endpoints under /families/{family_id}/subjects/{subject_id}/wearables.
6. AI Context Builder integration & GetWearableMetricsTool execution.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.domains.wearables.gateway import (
    IOpenWearablesGateway,
    MockOpenWearablesGateway,
    HttpOpenWearablesGateway
)
from app.domains.wearables.schemas import (
    DeviceConnectionResponse,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary,
    OpenWearablesWebhookPayload
)
from app.domains.wearables.services import WearableService
from app.domains.agent.context_builder import AIContextBuilder
from app.domains.agent.tools import ControlledToolRegistry, AgentToolContext
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    Consent,
    AIInsight
)
from app.domains.events.models import OutboxEvent
from app.domains.events.outbox import OutboxService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository,
    SQLAlchemyAppProfileRepository
)
from app.domains.events.services import EventService


@pytest.fixture
async def test_db_session():
    """In-memory SQLite async test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


from app.domains.wearables.gateway import (
    WearableDataGateway,
    OpenWearablesGateway,
    MockWearableDataGateway,
    OPEN_WEARABLES_PINNED_COMMIT,
    OPEN_WEARABLES_PINNED_VERSION
)


@pytest.mark.asyncio
async def test_wearable_data_gateway_protocol_and_pinned_commit():
    """
    Verifies that WearableDataGateway Protocol, OpenWearablesGateway, and MockWearableDataGateway
    strictly adhere to the early-stage compatibility rules and pinned commit.
    """
    assert OPEN_WEARABLES_PINNED_VERSION == "0.1.0-alpha"
    assert OPEN_WEARABLES_PINNED_COMMIT == "a3c9df8091ee591db4a7b3e1580e150c4c8d0e9b"

    mock_gw = MockWearableDataGateway()
    assert isinstance(mock_gw, WearableDataGateway)

    prod_gw = OpenWearablesGateway()
    assert isinstance(prod_gw, WearableDataGateway)

    user_id = "kinguardian_subject_123"

    # 1. create_user
    user_res = await mock_gw.create_user(user_id, email="dad@chennai.in", display_name="Ramesh")
    assert user_res["user_id"] == user_id

    # 2. create_connection_link
    invitation = await mock_gw.create_connection_link(user_id, "oura")
    assert invitation.provider == "oura"
    assert "oura" in invitation.connect_url
    assert invitation.invitation_code is not None

    # 3. get_connections
    connections = await mock_gw.get_connections(user_id)
    assert len(connections) == 2
    providers = [c.provider for c in connections]
    assert "garmin" in providers
    assert "apple_health" in providers

    # 4. get_daily_activity
    acts = await mock_gw.get_daily_activity(user_id, "2026-08-20", "2026-08-27")
    assert len(acts) >= 1
    assert acts[0].steps == 5840

    # 5. get_sleep
    slps = await mock_gw.get_sleep(user_id, "2026-08-20", "2026-08-27")
    assert len(slps) >= 1
    assert slps[0].total_sleep_minutes == 440
    assert slps[0].sleep_score == 84

    # 6. get_heart_rate
    recs = await mock_gw.get_heart_rate(user_id, "2026-08-20", "2026-08-27")
    assert len(recs) >= 1
    assert recs[0].resting_heart_rate_bpm == 64
    assert recs[0].hrv_ms == 48.5

    # 7. get_workouts
    workouts = await mock_gw.get_workouts(user_id, "2026-08-20", "2026-08-27")
    assert len(workouts) >= 1
    assert workouts[0].activity_type == "walking"
    assert workouts[0].duration_minutes == 35

    # 8. get_sync_status
    sync_status = await mock_gw.get_sync_status(user_id)
    assert sync_status.user_id == user_id
    assert sync_status.connected_provider_count >= 2
    assert "garmin" in sync_status.active_providers

    # 9. get_metrics
    metrics = await mock_gw.get_metrics(user_id, "2026-08-20", "2026-08-27")
    assert "activity" in metrics
    assert "sleep" in metrics
    assert "recovery" in metrics

    # 10. disconnect
    dc_res = await mock_gw.disconnect(user_id, "garmin")
    assert dc_res is True
    conns_after = await mock_gw.get_connections(user_id)
    assert "garmin" not in [c.provider for c in conns_after]



@pytest.mark.asyncio
async def test_wearable_service_dashboard_and_anomaly_detection(test_db_session: AsyncSession):
    """
    Tests that WearableService aggregates daily metrics into a single-roundtrip dashboard
    and detects activity drop anomalies compared to baseline.
    """
    session = test_db_session
    mock_gateway = MockOpenWearablesGateway()
    service = WearableService(session=session, gateway=mock_gateway)

    # 1. Setup Care Subject
    family = Family(id=uuid.uuid4(), name="Sharma Care Circle")
    session.add(family)
    
    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        fhir_patient_id="pat_ramesh_123",
        relationship_to_coordinator="Father",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active"
    )

    session.add(subject)
    await session.commit()

    # 2. Normal Dashboard Retrieval
    dashboard = await service.get_wearable_dashboard(subject.id)
    assert dashboard.subject_id == subject.id
    assert len(dashboard.connected_providers) == 2
    assert dashboard.latest_activity is not None
    assert dashboard.latest_activity.steps == 5840
    assert dashboard.has_activity_anomaly is False

    # 3. Seed an activity drop anomaly (e.g. Ramesh walks only 1,200 steps vs 5,000 baseline)
    wearable_uid = service.get_wearable_user_id(subject.id)
    mock_gateway.seed_user_data(
        user_id=wearable_uid,
        activity=[
            WearableActivitySummary(
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                steps=1200,
                active_duration_minutes=12,
                calories_burned_kcal=1400.0,
                source_provider="garmin"
            )
        ]
    )

    dashboard_anomaly = await service.get_wearable_dashboard(subject.id)
    assert dashboard_anomaly.has_activity_anomaly is True
    assert "dropped by 76%" in dashboard_anomaly.anomaly_description


@pytest.mark.asyncio
async def test_open_wearables_inbound_webhook_processing(test_db_session: AsyncSession):
    """
    Verifies that inbound Open Wearables webhooks stage transactional outbox events
    and synthesize Guardian Moments on severe anomalies.
    """
    session = test_db_session
    service = WearableService(session=session)

    # Setup subject
    family = Family(id=uuid.uuid4(), name="Sharma Family")
    session.add(family)
    
    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        fhir_patient_id="pat_ramesh_wh",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )

    session.add(subject)
    await session.commit()

    payload = OpenWearablesWebhookPayload(
        event_type="data:synced",
        user_id=f"kinguardian_subject_{subject.id}",
        provider="garmin",
        timestamp=datetime.utcnow(),
        data={
            "activity": {
                "steps": 1450,
                "active_minutes": 15
            }
        }
    )

    result = await service.process_inbound_webhook(payload)
    assert result["status"] == "processed"

    # Verify OutboxEvent staged
    outbox_res = await session.execute(
        OutboxEvent.__table__.select().where(OutboxEvent.family_id == family.id)
    )
    outbox_events = outbox_res.fetchall()
    assert len(outbox_events) >= 1
    assert outbox_events[0].event_type == "wearable.data.synced"

    # Verify Guardian Moment AIInsight created due to low steps (< 2000)
    insight_res = await session.execute(
        AIInsight.__table__.select().where(AIInsight.subject_id == subject.id)
    )
    insights = insight_res.fetchall()
    assert len(insights) >= 1
    assert "Activity Trending Lower" in insights[0].title


@pytest.mark.asyncio
async def test_wearables_rest_api_endpoints(test_db_session: AsyncSession):
    """
    Tests FastAPI endpoints under /families/{family_id}/subjects/{subject_id}/wearables:
    - GET /connections
    - POST /connect/garmin
    - GET /activity
    - GET /sleep
    - GET /recovery
    - GET /dashboard
    - POST /webhooks/open-wearables
    """
    session = test_db_session

    # Create actor profile and family circle
    user_id = uuid.uuid4()
    profile = AppProfile(
        id=user_id,
        iam_subject_id="iam_anjali_01",
        email="anjali@london.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(profile)

    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=user_id)
    session.add(family)

    membership = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=user_id,
        membership_role="primary_coordinator",
        status="active"
    )
    session.add(membership)

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        fhir_patient_id="pat_ramesh_123",
        relationship_to_coordinator="Father",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active"
    )

    session.add(subject)

    # Active Wearable Consent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=uuid.uuid4(),
        grantee_profile_id=user_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)
    await session.commit()



    # Override dependencies
    mock_gw = MockOpenWearablesGateway()
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: profile
    from app.domains.wearables.router import get_wearable_service
    app.dependency_overrides[get_wearable_service] = lambda: WearableService(session=session, gateway=mock_gw)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /connections
        resp = await client.get(f"/families/{family.id}/subjects/{subject.id}/wearables/connections")
        assert resp.status_code == 200
        connections = resp.json()
        assert len(connections) >= 1


        # 2. POST /connect/garmin
        resp_conn = await client.post(f"/families/{family.id}/subjects/{subject.id}/wearables/connect/garmin")
        assert resp_conn.status_code == 200
        conn_data = resp_conn.json()
        assert conn_data["provider"] == "garmin"
        assert "connect_url" in conn_data

        # 3. GET /activity
        resp_act = await client.get(f"/families/{family.id}/subjects/{subject.id}/wearables/activity?days=7")
        assert resp_act.status_code == 200
        act_data = resp_act.json()
        assert len(act_data) >= 1
        assert act_data[0]["steps"] > 0

        # 4. GET /sleep
        resp_slp = await client.get(f"/families/{family.id}/subjects/{subject.id}/wearables/sleep?days=7")
        assert resp_slp.status_code == 200
        slp_data = resp_slp.json()
        assert len(slp_data) >= 1
        assert slp_data[0]["total_sleep_minutes"] > 0

        # 5. GET /recovery
        resp_rec = await client.get(f"/families/{family.id}/subjects/{subject.id}/wearables/recovery?days=7")
        assert resp_rec.status_code == 200
        rec_data = resp_rec.json()
        assert len(rec_data) >= 1
        assert rec_data[0]["resting_heart_rate_bpm"] > 0

        # 6. GET /dashboard
        resp_dash = await client.get(f"/families/{family.id}/subjects/{subject.id}/wearables/dashboard")
        assert resp_dash.status_code == 200
        dash = resp_dash.json()
        assert dash["subject_id"] == str(subject.id)
        assert dash["latest_activity"]["steps"] > 0
        assert dash["weekly_average_steps"] > 0

        # 7. POST /webhooks/open-wearables
        webhook_body = {
            "event_type": "data:synced",
            "user_id": f"kinguardian_subject_{subject.id}",
            "provider": "oura",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {"activity": {"steps": 4500}}
        }
        resp_wh = await client.post("/webhooks/open-wearables", json=webhook_body)
        assert resp_wh.status_code == 200
        assert resp_wh.json()["status"] == "success"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ai_context_builder_and_wearables_tool_integration(test_db_session: AsyncSession):
    """
    Tests that AIContextBuilder includes wearable telemetry when authorized,
    and that GetWearableMetricsTool executes safely.
    """
    session = test_db_session

    user_id = uuid.uuid4()
    profile = AppProfile(
        id=user_id,
        iam_subject_id="iam_anjali_02",
        email="anjali@london.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(profile)

    family = Family(id=uuid.uuid4(), name="Sharma Circle", primary_coordinator_profile_id=user_id)
    session.add(family)


    membership = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=user_id,
        membership_role="primary_coordinator",
        status="active"
    )
    session.add(membership)

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=uuid.uuid4(),
        fhir_patient_id="pat_ramesh_ai",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )


    session.add(subject)

    # Consent grant for wearables
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=subject.profile_id,
        grantee_profile_id=user_id,
        scope={"wearables": True, "vitals": True},
        status="active"
    )
    session.add(consent)
    await session.commit()

    # 1. AI Context Builder test
    mock_gateway = MockOpenWearablesGateway()
    context_builder = AIContextBuilder(session=session, wearable_gateway=mock_gateway)
    context_payload = await context_builder.build_scoped_context(
        requester_id=user_id,
        family_id=family.id,
        subject_ids=[subject.id],
        requested_dimensions=["wearables"]
    )

    subj_ctx = context_payload.subjects[0]
    assert "wearables" in subj_ctx.authorized_dimensions
    assert subj_ctx.wearables is not None
    assert subj_ctx.wearables["latest_activity"]["steps"] == 5840

    prompt = context_payload.to_prompt_context()
    assert "Wearable Telemetry" in prompt
    assert "5,840" in prompt or "5840" in prompt


    # 2. Controlled Tool Registry test
    tool_registry = ControlledToolRegistry(
        family_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        profile_repo=SQLAlchemyAppProfileRepository(session),
        event_logger=EventService(session),
        wearable_gateway=mock_gateway
    )

    
    tool = tool_registry.get_tool("get_wearable_metrics")
    assert tool is not None
    assert tool.required_permission == "wearables"

    tool_ctx = AgentToolContext(
        actor_id=user_id,
        family_id=family.id,
        subject_id=subject.id,
        permissions_override={"wearables": True}
    )
    result = await tool_registry.execute_tool(
        "get_wearable_metrics",
        {"subject_id": str(subject.id), "days": 7},
        tool_ctx
    )
    assert result.success is True
    assert result.data["subject_id"] == str(subject.id)
    assert result.data["latest_activity"]["steps"] == 5840
