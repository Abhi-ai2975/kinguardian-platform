import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, select
from app.db import get_session
from app.models import CareSubject, WearableConnection, WearableData, AuditLog

async def seed_section13():
    async for session in get_session():
        # Find all care subjects matching Ramesh or Father
        subs = (await session.execute(
            select(CareSubject).where(
                CareSubject.external_patient_ref.ilike("%Father%") | CareSubject.external_patient_ref.ilike("%Ramesh%")
            )
        )).scalars().all()

        print(f"Found {len(subs)} care subjects matching Ramesh/Father")
        now = datetime.now(timezone.utc)

        for sub in subs:
            subject_id = sub.id

            # A. Google Fit / Health Connect (Connected & Fresh)
            conn_hc = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject_id,
                    WearableConnection.provider == "health_connect"
                )
            )).scalars().first()
            if not conn_hc:
                conn_hc = WearableConnection(
                    subject_id=subject_id,
                    provider="health_connect",
                    connection_status="connected",
                    device_type="Google Fit / Android Phone",
                    device_id="google_health_connect",
                    source="health_connect",
                    last_sync_at=now,
                    sync_status="synced",
                    is_stale=False,
                    created_at=now,
                    updated_at=now
                )
                session.add(conn_hc)
            else:
                conn_hc.connection_status = "connected"
                conn_hc.disconnected_at = None
                conn_hc.last_sync_at = now
                conn_hc.sync_status = "synced"
                conn_hc.is_stale = False

            # B. Fitbit (Connected & Fresh)
            conn_fitbit = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject_id,
                    WearableConnection.provider == "fitbit"
                )
            )).scalars().first()
            if not conn_fitbit:
                conn_fitbit = WearableConnection(
                    subject_id=subject_id,
                    provider="fitbit",
                    connection_status="connected",
                    device_type="Fitbit Charge 6",
                    device_id="fitbit_charge_6",
                    source="fitbit",
                    last_sync_at=now - timedelta(minutes=20),
                    sync_status="synced",
                    is_stale=False,
                    created_at=now - timedelta(days=5),
                    updated_at=now
                )
                session.add(conn_fitbit)
            else:
                conn_fitbit.connection_status = "connected"
                conn_fitbit.disconnected_at = None
                conn_fitbit.last_sync_at = now - timedelta(minutes=20)
                conn_fitbit.sync_status = "synced"
                conn_fitbit.is_stale = False

            # C. Garmin (Connected & Fresh)
            conn_garmin = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject_id,
                    WearableConnection.provider == "garmin"
                )
            )).scalars().first()
            if not conn_garmin:
                conn_garmin = WearableConnection(
                    subject_id=subject_id,
                    provider="garmin",
                    connection_status="connected",
                    device_type="Garmin Venu 3 (Slate Black)",
                    device_id="garmin_venu_3",
                    source="garmin",
                    last_sync_at=now - timedelta(hours=1),
                    sync_status="synced",
                    is_stale=False,
                    created_at=now - timedelta(days=10),
                    updated_at=now
                )
                session.add(conn_garmin)
            else:
                conn_garmin.connection_status = "connected"
                conn_garmin.disconnected_at = None
                conn_garmin.last_sync_at = now - timedelta(hours=1)
                conn_garmin.sync_status = "synced"
                conn_garmin.is_stale = False

            # D. Disconnected Oura Device (for TEST WEAR-005)
            conn_oura = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject_id,
                    WearableConnection.provider == "oura"
                )
            )).scalars().first()
            if not conn_oura:
                conn_oura = WearableConnection(
                    subject_id=subject_id,
                    provider="oura",
                    connection_status="disconnected",
                    device_type="Oura Ring Gen 3",
                    device_id="oura_ring_gen3",
                    source="oura",
                    last_sync_at=now - timedelta(days=2),
                    disconnected_at=now - timedelta(hours=1),
                    sync_status="disconnected",
                    is_stale=False,
                    created_at=now - timedelta(days=15),
                    updated_at=now - timedelta(hours=1)
                )
                session.add(conn_oura)
            else:
                conn_oura.connection_status = "disconnected"
                conn_oura.disconnected_at = now - timedelta(hours=1)
                conn_oura.sync_status = "disconnected"

            # E. Stale Device (Apple Watch 14h old for TEST WEAR-007)
            conn_apple = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject_id,
                    WearableConnection.provider == "apple_health"
                )
            )).scalars().first()
            if not conn_apple:
                conn_apple = WearableConnection(
                    subject_id=subject_id,
                    provider="apple_health",
                    connection_status="connected",
                    device_type="Apple Watch Series 9",
                    device_id="apple_watch_s9",
                    source="apple_health",
                    last_sync_at=now - timedelta(hours=14),
                    sync_status="stale_sync",
                    is_stale=True,
                    created_at=now - timedelta(days=20),
                    updated_at=now - timedelta(hours=14)
                )
                session.add(conn_apple)
            else:
                conn_apple.connection_status = "connected"
                conn_apple.last_sync_at = now - timedelta(hours=14)
                conn_apple.sync_status = "stale_sync"
                conn_apple.is_stale = True

            # F. Telemetry in wearable_data
            session.add(WearableData(
                subject_id=subject_id,
                connection_id=conn_hc.id if conn_hc else None,
                steps=5420,
                heart_rate=68,
                sleep_minutes=475,
                date=now,
                source="health_connect",
                last_sync_at=now,
                device_id="google_health_connect",
                created_at=now,
                updated_at=now
            ))

        # 4. Seed Audit Log for Outage (WEAR-008)
        session.add(AuditLog(
            occurred_at=now,
            created_at=now,
            action="wearable_api_unavailable",
            resource_type="wearable_gateway",
            resource_id="upstream_provider_outage",
            error="Upstream wearable cloud API unavailable: Gateway Timeout (504)",
            metadata_json={
                "provider": "garmin_fitbit_cloud",
                "reason": "upstream_504_timeout",
                "fallback_used": True
            }
        ))

        await session.commit()
        print("Successfully seeded all Ramesh care subjects!")
        break

if __name__ == "__main__":
    asyncio.run(seed_section13())
