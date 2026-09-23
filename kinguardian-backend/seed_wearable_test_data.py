import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, select
from app.db import get_session
from app.models import CareSubject, WearableConnection, WearableData, AuditLog

async def main():
    async for session in get_session():
        # Find all care subjects matching Ramesh or Father
        subs = (await session.execute(
            select(CareSubject).where(
                CareSubject.external_patient_ref.ilike("%Ramesh%") | CareSubject.external_patient_ref.ilike("%Father%")
            )
        )).scalars().all()

        print(f"Found {len(subs)} subjects matching Ramesh/Father")
        now = datetime.now(timezone.utc)

        for sub in subs:
            # Check or create fitbit connection
            fitbit = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == sub.id,
                    WearableConnection.provider == "fitbit"
                )
            )).scalars().first()
            if not fitbit:
                fitbit = WearableConnection(
                    subject_id=sub.id,
                    provider="fitbit",
                    connection_status="connected",
                    device_type="Fitbit Charge 6",
                    device_id="fitbit_charge_6",
                    source="fitbit",
                    last_sync_at=now,
                    sync_status="synced",
                    is_stale=False,
                    created_at=now,
                    updated_at=now
                )
                session.add(fitbit)

            # Check or create garmin connection
            garmin = (await session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == sub.id,
                    WearableConnection.provider == "garmin"
                )
            )).scalars().first()
            if not garmin:
                garmin = WearableConnection(
                    subject_id=sub.id,
                    provider="garmin",
                    connection_status="connected",
                    device_type="Garmin Venu 3 (Slate Black)",
                    device_id="garmin_venu_3",
                    source="garmin",
                    last_sync_at=now,
                    sync_status="synced",
                    is_stale=False,
                    created_at=now,
                    updated_at=now
                )
                session.add(garmin)

            # Check or create wearable_data
            data_count = (await session.execute(
                select(WearableData).where(WearableData.subject_id == sub.id)
            )).scalars().all()

            if not data_count:
                session.add(WearableData(
                    subject_id=sub.id,
                    steps=3420,
                    heart_rate=74,
                    date=now,
                    source="garmin",
                    last_sync_at=now,
                    device_id="garmin_venu_3",
                    sleep_minutes=420,
                    created_at=now,
                    updated_at=now
                ))
                session.add(WearableData(
                    subject_id=sub.id,
                    steps=3560,
                    heart_rate=72,
                    date=now - timedelta(hours=1),
                    source="fitbit",
                    last_sync_at=now,
                    device_id="fitbit_charge_6",
                    sleep_minutes=430,
                    created_at=now - timedelta(hours=1),
                    updated_at=now - timedelta(hours=1)
                ))

        # Ensure Audit log entry for WEAR-008
        audit = (await session.execute(
            select(AuditLog).where(AuditLog.action == "wearable_api_unavailable")
        )).scalars().first()
        if not audit:
            session.add(AuditLog(
                occurred_at=now,
                created_at=now,
                action="wearable_api_unavailable",
                resource_type="wearable_gateway",
                resource_id="upstream_provider",
                error="Upstream wearable cloud API unavailable: Gateway Timeout (504)",
                metadata_json={"provider": "garmin_fitbit_cloud", "simulated": True}
            ))

        await session.commit()
        print("Successfully seeded wearable test data across all Ramesh subjects!")
        break

if __name__ == "__main__":
    asyncio.run(main())
