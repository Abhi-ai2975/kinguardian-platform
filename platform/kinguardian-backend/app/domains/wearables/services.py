"""
Wearable Domain Service Module.
Orchestrates care-subject wearable mappings, metrics querying, webhook event handling,
and Guardian AI anomaly detection.

ARCHITECTURAL PRINCIPLES:
1. Open Wearables is treated as an EXTERNAL INFRASTRUCTURE CAPABILITY.
2. KinGuardian Backend OWNS the identity relationship:
   “This wearable/health-data identity belongs to this KinGuardian parent (CareSubject).”
3. Open Wearables OWNS:
   “This provider account/device produced these normalized measurements.”
4. Anti-Corruption Layer (ACL): Open Wearables-specific schemas never pollute KinGuardian
   domain models. All communication passes through WearableDataGateway into KinGuardian DTOs.
"""


import uuid
import hmac
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


from app.core.config import settings
from app.core.logging import get_logger
from app.domains.wearables.gateway import WearableDataGateway, HttpOpenWearablesGateway
from app.domains.wearables.schemas import (
    DeviceConnectionResponse,
    DeviceConnectUrlResponse,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary,
    WearableWorkoutSummary,
    WearableSyncStatus,
    WearableDashboardResponse,
    OpenWearablesWebhookPayload,
    WearableConnectionPermissionsResponse,
    WearablePermissionDetail,
    WEARABLE_PERMISSION_METADATA,
    WearableConsentStatusResponse,
    WearableConsentGrantRequest,
    WearableConnectionFlowDescriptor,
    WearableDisconnectResponse,
    WearableMetricItem,
    UnifiedWearableMetricsResponse,

    WearableActivityDerivedSummary,
    WearableSleepDerivedSummary,
    WearableHeartRateDerivedSummary,
    WearableDerivedSummaryResponse,
    SyncStatusState,
    DeviceSyncStatusItem,
    CareSubjectSyncStatusResponse
)







from app.domains.events.outbox import OutboxService
from app.domains.family.infrastructure.models import (
    CareSubject,
    Family,
    FamilyMembership,
    AIInsight,
    Notification,
    WearableConnection,
    WearableDataSource,
    MonitoringPreference,
    Consent
)


from app.domains.wearables.domain.entities import WearableMetric, WearableDailySummary
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    AnomalySeverity
)
from app.domains.wearables.domain.services import WearableDomainService
from app.domains.wearables.domain.policies import ActivityAnomalyPolicy, SleepDisruptionPolicy, AutonomicRecoveryPolicy

logger = get_logger(__name__)



class WearableService:
    """
    Business logic and domain orchestration service for wearable health telemetry.
    Maintains the invariant: CareSubject (Parent) <-> Wearable Health-Data Identity.
    """

    def __init__(
        self,
        session: AsyncSession,
        gateway: Optional[WearableDataGateway] = None,
        outbox_svc: Optional[OutboxService] = None
    ):
        self.session = session
        self.gateway = gateway or HttpOpenWearablesGateway()
        self.outbox_svc = outbox_svc or OutboxService(session)

    @staticmethod
    def get_wearable_user_id(subject_id: uuid.UUID) -> str:
        """
        Derives the deterministic Open Wearables external identity for a KinGuardian care subject.
        KinGuardian owns this identity mapping:
        KinGuardian CareSubject (Parent) <---> Open Wearables External ID ("kinguardian_subject_{uuid}").
        """
        return f"kinguardian_subject_{subject_id}"


    async def verify_subject_access(
        self,
        user_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> CareSubject:
        """Verifies that the caller has authorized family access to the care subject."""
        res_subj = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
        subject = res_subj.scalar_one_or_none()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Care subject '{subject_id}' not found"
            )

        if subject.profile_id == user_id:
            return subject

        res_mem = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == subject.family_id,
                FamilyMembership.profile_id == user_id,
                FamilyMembership.status == "active"
            )
        )
        if not res_mem.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User does not have active membership in the subject's care circle."
            )

        return subject

    async def verify_family_access(
        self,
        user_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> None:
        """Verifies that the user has active membership in the family care circle."""
        res = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == user_id,
                FamilyMembership.status == "active"
            )
        )
        if not res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to family care circle denied."
            )

    async def get_subject_connections(self, subject_id: uuid.UUID) -> List[DeviceConnectionResponse]:

        """Fetch all connected wearable devices for a subject."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        return await self.gateway.get_user_connections(wearable_user_id)


    async def create_connection_invitation(
        self,
        subject_id: uuid.UUID,
        provider: str,
        redirect_url: Optional[str] = None
    ) -> DeviceConnectUrlResponse:
        """
        Initiates the zero-credential connection flow via Open Wearables:
        1. Validates care subject existence.
        2. Records/updates a pending WearableConnection in the KinGuardian database.
        3. Requests a secure hosted OAuth connection URL or mobile SDK token from Open Wearables.
        4. Returns ONLY the connection URL / token to the mobile client (zero provider secrets/credentials).
        """
        res_subj = await self.session.execute(
            select(CareSubject).where(CareSubject.id == subject_id)
        )
        subject = res_subj.scalar_one_or_none()
        if not subject:
            raise ValueError(f"Care subject {subject_id} not found")

        wearable_user_id = self.get_wearable_user_id(subject_id)

        # 0. Enforce KinGuardian Authorization Layer Consent Boundary
        # Wearable data is protected health information (PHI). Active consent is strictly required.
        has_consent = await self.verify_wearable_consent(subject_id=subject.id)
        if not has_consent:
            raise ValueError("Active parent/coordinator wearable health data consent is required before connecting a device.")

        # 1. Maintain WearableConnection in PostgreSQL (Pending state)
        res_conn = await self.session.execute(
            select(WearableConnection).where(
                WearableConnection.subject_id == subject.id,
                WearableConnection.provider == provider.lower()
            )
        )
        existing_conn = res_conn.scalar_one_or_none()
        if not existing_conn:
            new_conn = WearableConnection(
                id=uuid.uuid4(),
                family_id=subject.family_id,
                subject_id=subject.id,
                profile_id=subject.profile_id,
                provider=provider.lower(),
                open_wearables_user_id=wearable_user_id,
                connection_status="pending",
                metadata_json={"redirect_url": redirect_url} if redirect_url else {}
            )
            self.session.add(new_conn)
            await self.session.flush()
        else:
            existing_conn.connection_status = "pending"
            await self.session.flush()

        # 2. Open Wearables connection flow
        return await self.gateway.create_connection_invitation(wearable_user_id, provider)

    async def create_connection_descriptor(
        self,
        subject_id: uuid.UUID,
        provider: str,
        redirect_url: Optional[str] = None,
        profile_id: Optional[uuid.UUID] = None
    ) -> WearableConnectionFlowDescriptor:
        """
        Creates/initiates a wearable connection flow and returns a descriptor containing:
        - connection_id
        - provider
        - status: pending
        - connection_url: Hosted Open Wearables authentication URL (Zero vendor credentials).
        """
        res_subj = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
        subject = res_subj.scalar_one_or_none()
        if not subject:
            raise ValueError(f"Care subject {subject_id} not found")

        wearable_user_id = self.get_wearable_user_id(subject_id)

        # Enforce KinGuardian Authorization Layer Consent Boundary
        has_consent = await self.verify_wearable_consent(subject_id=subject.id)
        if not has_consent:
            raise ValueError("Active parent/coordinator wearable health data consent is required before connecting a device.")

        # Check or create WearableConnection record
        res_conn = await self.session.execute(
            select(WearableConnection).where(
                WearableConnection.subject_id == subject.id,
                WearableConnection.provider == provider.lower()
            )
        )
        conn = res_conn.scalar_one_or_none()
        if not conn:
            conn = WearableConnection(
                id=uuid.uuid4(),
                family_id=subject.family_id,
                subject_id=subject.id,
                profile_id=profile_id or subject.profile_id,
                provider=provider.lower(),
                open_wearables_user_id=wearable_user_id,
                connection_status="pending",
                metadata_json={"redirect_url": redirect_url} if redirect_url else {}
            )
            self.session.add(conn)
        else:
            conn.connection_status = "pending"
            if redirect_url:
                meta = conn.metadata_json or {}
                meta["redirect_url"] = redirect_url
                conn.metadata_json = meta
        await self.session.commit()

        # Open Wearables connection flow
        link_resp = await self.gateway.create_connection_invitation(wearable_user_id, provider)

        return WearableConnectionFlowDescriptor(
            connection_id=conn.id,
            provider=provider.lower(),
            status="pending",
            connection_url=link_resp.connect_url,
            expires_at=link_resp.expires_at
        )

    async def reconnect_connection_by_id(
        self,
        connection_id: uuid.UUID
    ) -> WearableConnectionFlowDescriptor:
        """
        Regenerates an active authentication connection link for an existing wearable connection.
        """
        res_conn = await self.session.execute(
            select(WearableConnection).where(WearableConnection.id == connection_id)
        )
        conn = res_conn.scalar_one_or_none()
        if not conn:
            raise ValueError(f"Wearable connection {connection_id} not found")

        # Verify active consent
        has_consent = await self.verify_wearable_consent(subject_id=conn.subject_id)
        if not has_consent:
            raise ValueError("Active parent/coordinator wearable health data consent is required before reconnecting.")

        conn.connection_status = "pending"
        await self.session.commit()

        wearable_user_id = conn.open_wearables_user_id or self.get_wearable_user_id(conn.subject_id)
        link_resp = await self.gateway.create_connection_invitation(wearable_user_id, conn.provider)

        return WearableConnectionFlowDescriptor(
            connection_id=conn.id,
            provider=conn.provider,
            status="pending",
            connection_url=link_resp.connect_url,
            expires_at=link_resp.expires_at
        )

    async def disconnect_connection_by_id(
        self,
        connection_id: uuid.UUID
    ) -> WearableDisconnectResponse:
        """
        Disconnects and revokes an active or pending wearable connection.
        """
        res_conn = await self.session.execute(
            select(WearableConnection).where(WearableConnection.id == connection_id)
        )
        conn = res_conn.scalar_one_or_none()
        if not conn:
            raise ValueError(f"Wearable connection {connection_id} not found")

        wearable_user_id = conn.open_wearables_user_id or self.get_wearable_user_id(conn.subject_id)
        await self.gateway.disconnect(wearable_user_id, conn.provider)

        now = datetime.utcnow()
        conn.connection_status = "disconnected"
        conn.disconnected_at = now
        await self.session.commit()

        return WearableDisconnectResponse(
            connection_id=conn.id,
            provider=conn.provider,
            status="disconnected",
            disconnected_at=now
        )


    async def verify_wearable_consent(
        self,
        subject_id: uuid.UUID,
        requester_profile_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Enforces authorization layer check for active wearable health data consent.
        Returns True if an active consent record exists for the subject/family.
        """
        query = select(Consent).where(
            Consent.subject_id == subject_id,
            Consent.status == "active"
        )
        if requester_profile_id:
            query = query.where(
                (Consent.grantor_profile_id == requester_profile_id) |
                (Consent.grantee_profile_id == requester_profile_id)
            )
        res = await self.session.execute(query)
        active_consent = res.scalar_one_or_none()
        return active_consent is not None

    async def get_consent_status(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        requester_profile_id: Optional[uuid.UUID] = None
    ) -> WearableConsentStatusResponse:
        """
        Retrieves current consent status and the mandatory pre-connection disclosures:
        - What KinGuardian can receive: Activity, Sleep, Heart rate
        - Revocation guarantee: You can disconnect this device at any time.
        """
        query = select(Consent).where(
            Consent.family_id == family_id,
            Consent.subject_id == subject_id,
            Consent.status == "active"
        )
        if requester_profile_id:
            query = query.where(
                (Consent.grantor_profile_id == requester_profile_id) |
                (Consent.grantee_profile_id == requester_profile_id)
            )
        res = await self.session.execute(query)
        consent = res.scalar_one_or_none()

        if consent:
            return WearableConsentStatusResponse(
                subject_id=subject_id,
                family_id=family_id,
                is_consent_granted=True,
                status="active",
                disclosures=["Activity", "Sleep", "Heart rate"],
                revocation_policy="You can disconnect this device at any time.",
                granted_scopes=consent.scope or {"activity": True, "sleep": True, "heart_rate": True},
                granted_at=consent.granted_at,
                expires_at=consent.expires_at
            )

        return WearableConsentStatusResponse(
            subject_id=subject_id,
            family_id=family_id,
            is_consent_granted=False,
            status="not_requested",
            disclosures=["Activity", "Sleep", "Heart rate"],
            revocation_policy="You can disconnect this device at any time.",
            granted_scopes={},
            granted_at=None,
            expires_at=None
        )

    async def grant_wearable_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID,
        scopes: Optional[Dict[str, bool]] = None
    ) -> WearableConsentStatusResponse:
        """
        Explicitly records consent granted by parent/coordinator in the KinGuardian authorization layer.
        """
        if grantor_profile_id == grantee_profile_id:
            res_subj = await self.session.execute(select(CareSubject).where(CareSubject.id == subject_id))
            subject = res_subj.scalar_one_or_none()
            if subject and subject.profile_id and subject.profile_id != grantee_profile_id:
                grantor_profile_id = subject.profile_id
            else:
                res_fam = await self.session.execute(select(Family).where(Family.id == family_id))
                fam = res_fam.scalar_one_or_none()
                if fam and fam.primary_coordinator_profile_id and fam.primary_coordinator_profile_id != grantee_profile_id:
                    grantor_profile_id = fam.primary_coordinator_profile_id
                else:
                    grantor_profile_id = uuid.uuid4()

        effective_scopes = scopes or {
            "activity": True,
            "sleep": True,
            "heart_rate": True
        }


        # Check existing consent
        res = await self.session.execute(
            select(Consent).where(
                Consent.family_id == family_id,
                Consent.subject_id == subject_id,
                Consent.grantor_profile_id == grantor_profile_id,
                Consent.grantee_profile_id == grantee_profile_id
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.status = "active"
            existing.scope = effective_scopes
            existing.revoked_at = None
            existing.version += 1
            existing.updated_at = datetime.utcnow()
            consent_obj = existing
        else:
            consent_obj = Consent(
                id=uuid.uuid4(),
                family_id=family_id,
                subject_id=subject_id,
                grantor_profile_id=grantor_profile_id,
                grantee_profile_id=grantee_profile_id,
                consent_type="wearable_health_data",
                scope=effective_scopes,
                status="active"
            )
            self.session.add(consent_obj)

        await self.session.commit()
        return await self.get_consent_status(family_id, subject_id, grantee_profile_id)

    async def revoke_wearable_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        revoking_profile_id: uuid.UUID
    ) -> WearableConsentStatusResponse:
        """
        Revokes consent at any time. Immediately pauses ingestion and marks connections as disconnected.
        """
        res = await self.session.execute(
            select(Consent).where(
                Consent.family_id == family_id,
                Consent.subject_id == subject_id,
                Consent.status == "active",
                (Consent.grantor_profile_id == revoking_profile_id) | (Consent.grantee_profile_id == revoking_profile_id)
            )
        )
        consents = res.scalars().all()
        for c in consents:
            c.status = "revoked"
            c.revoked_at = datetime.utcnow()

        # Disconnect all active connections
        res_conns = await self.session.execute(
            select(WearableConnection).where(
                WearableConnection.subject_id == subject_id,
                WearableConnection.connection_status.in_(["connected", "active", "pending"])
            )
        )
        for conn in res_conns.scalars().all():
            conn.connection_status = "disconnected"
            conn.disconnected_at = datetime.utcnow()

        await self.session.commit()
        return await self.get_consent_status(family_id, subject_id, revoking_profile_id)



    async def get_activity_history(
        self,
        subject_id: uuid.UUID,
        days: int = 7
    ) -> List[WearableActivitySummary]:
        """Fetch historical daily activity metrics."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.gateway.get_activity_summaries(wearable_user_id, start_date, end_date)

    async def get_sleep_history(
        self,
        subject_id: uuid.UUID,
        days: int = 7
    ) -> List[WearableSleepSummary]:
        """Fetch historical sleep metrics."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.gateway.get_sleep_summaries(wearable_user_id, start_date, end_date)

    async def get_recovery_history(
        self,
        subject_id: uuid.UUID,
        days: int = 7
    ) -> List[WearableRecoverySummary]:
        """Fetch historical recovery metrics (HRV, resting HR, SpO2)."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.gateway.get_recovery_summaries(wearable_user_id, start_date, end_date)

    async def get_workouts_history(
        self,
        subject_id: uuid.UUID,
        days: int = 7
    ) -> List[WearableWorkoutSummary]:
        """Fetch historical recorded workouts and exercise sessions."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.gateway.get_workouts(wearable_user_id, start_date, end_date)

    async def get_sync_status(self, subject_id: uuid.UUID) -> WearableSyncStatus:
        """Fetch synchronization status and connected provider diagnostics."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        return await self.gateway.get_sync_status(wearable_user_id)

    @staticmethod
    def format_relative_sync_time(last_sync: Optional[datetime], now: Optional[datetime] = None) -> Optional[str]:
        if not last_sync:
            return None
        now_dt = now or datetime.now(timezone.utc)
        sync_dt = last_sync if last_sync.tzinfo is not None else last_sync.replace(tzinfo=timezone.utc)
        diff = now_dt - sync_dt
        secs = max(0, int(diff.total_seconds()))
        if secs < 60:
            return "Last sync: just now"
        mins = secs // 60
        if mins < 60:
            return f"Last sync: {mins} minute{'s' if mins != 1 else ''} ago"
        hours = mins // 60
        if hours < 24:
            return f"Last sync: {hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"Last sync: {days} day{'s' if days != 1 else ''} ago"

    async def get_care_subject_sync_status(
        self,
        subject_id: uuid.UUID,
        view_mode: str = "coordinator"
    ) -> CareSubjectSyncStatusResponse:
        """
        Evaluates and exposes granular wearable sync status across 6 canonical states:
        - Connected ("Connected" / "✓ Connected")
        - Syncing ("Syncing" / "⟳ Syncing")
        - Up to date ("Up to date" / "✓ Up to date")
        - Delayed ("Delayed" / "⚠ Delayed")
        - Error ("Error" / "✕ Error")
        - Disconnected ("Disconnected" / "✕ Disconnected")

        Formats presentation based on role/view_mode:
        - Coordinator (e.g. Anjali in London): "Dad's Garmin", "✓ Up to date", "Last sync: 8 minutes ago"
        - Parent (e.g. Dad in Chennai): "My watch", "✓ Connected"
        """
        res_subj = await self.session.execute(
            select(CareSubject).where(CareSubject.id == subject_id)
        )
        subject = res_subj.scalar_one_or_none()
        subject_title = (subject.relationship_to_coordinator if subject and subject.relationship_to_coordinator else "Dad")

        res_conns = await self.session.execute(
            select(WearableConnection).where(WearableConnection.subject_id == subject_id)
        )
        conns = res_conns.scalars().all()

        gateway_sync = await self.get_sync_status(subject_id)
        now_dt = datetime.now(timezone.utc)

        device_items: List[DeviceSyncStatusItem] = []
        most_recent_sync: Optional[datetime] = gateway_sync.last_successful_sync_at

        for conn in conns:
            last_sync = conn.last_sync_at or gateway_sync.last_successful_sync_at
            if last_sync and (not most_recent_sync or (last_sync > most_recent_sync)):
                most_recent_sync = last_sync


            # Device title based on perspective
            if view_mode == "parent":
                dev_title = "My watch" if conn.provider in ("garmin", "apple_health", "fitbit") else f"My {conn.provider.title()}"
            else:
                dev_title = f"{subject_title}'s {conn.provider.title()}"

            # Determine sync status and failure messaging
            sync_msg: Optional[str] = None
            act_label: Optional[str] = None
            act_type: Optional[str] = None

            if conn.connection_status in ("disconnected", "revoked"):
                status_state = SyncStatusState.DISCONNECTED
                status_label = "Disconnected" if view_mode == "parent" else "✕ Disconnected"
                sync_msg = "Your health device needs to reconnect." if view_mode == "parent" else f"{subject_title}'s {conn.provider.title()} needs to reconnect."
                act_label = "Reconnect"
                act_type = "reconnect"
            elif gateway_sync.is_syncing:
                status_state = SyncStatusState.SYNCING
                status_label = "Syncing" if view_mode == "parent" else "⟳ Syncing"
            elif conn.connection_status in ("error", "failed") or (gateway_sync.errors and conn.provider in gateway_sync.errors):
                status_state = SyncStatusState.ERROR
                status_label = "Error" if view_mode == "parent" else "✕ Error"
                sync_msg = "Your health device needs to reconnect." if view_mode == "parent" else f"{subject_title}'s {conn.provider.title()} needs to reconnect."
                act_label = "Reconnect"
                act_type = "reconnect"
            elif last_sync:
                sync_dt = last_sync if last_sync.tzinfo is not None else last_sync.replace(tzinfo=timezone.utc)
                diff_secs = (now_dt - sync_dt).total_seconds()
                if diff_secs <= 1800:  # within 30 mins
                    status_state = SyncStatusState.UP_TO_DATE
                    status_label = "✓ Connected" if view_mode == "parent" else "✓ Up to date"
                elif diff_secs <= 43200:  # within 12 hours
                    status_state = SyncStatusState.CONNECTED
                    status_label = "✓ Connected"
                else:
                    # Sync delayed or stale (> 12 hours)
                    status_state = SyncStatusState.DELAYED
                    status_label = "Delayed" if view_mode == "parent" else "⚠ Delayed"
                    hours = max(1, int(diff_secs // 3600))
                    sync_msg = "Your health device needs to reconnect." if view_mode == "parent" else f"{subject_title}'s {conn.provider.title()} hasn't synced for {hours} hour{'s' if hours != 1 else ''}."
                    act_label = "Reconnect"
                    act_type = "reconnect"
            else:
                status_state = SyncStatusState.CONNECTED
                status_label = "✓ Connected"

            rel_time = self.format_relative_sync_time(last_sync, now_dt)

            device_items.append(
                DeviceSyncStatusItem(
                    connection_id=conn.id,
                    provider=conn.provider,
                    device_name=f"{conn.provider.title()} Watch",
                    device_title=dev_title,
                    status=status_state,
                    status_label=status_label,
                    sync_message=sync_msg,
                    action_label=act_label,
                    action_type=act_type,
                    last_sync_at=last_sync,
                    last_sync_relative=rel_time,
                    is_syncing=gateway_sync.is_syncing,
                    is_health_event=False
                )
            )

        # Compute overall status
        if not device_items:
            overall_state = SyncStatusState.DISCONNECTED
            overall_label = "Disconnected"
            overall_msg = "Your health device needs to reconnect." if view_mode == "parent" else f"{subject_title}'s device needs to reconnect."
            overall_act = "Reconnect"
        elif any(d.status == SyncStatusState.ERROR for d in device_items):
            overall_state = SyncStatusState.ERROR
            overall_label = "✕ Error"
            overall_msg = "Your health device needs to reconnect." if view_mode == "parent" else next((d.sync_message for d in device_items if d.sync_message), f"{subject_title}'s device needs to reconnect.")
            overall_act = "Reconnect"
        elif any(d.status == SyncStatusState.SYNCING for d in device_items):
            overall_state = SyncStatusState.SYNCING
            overall_label = "⟳ Syncing"
            overall_msg = None
            overall_act = None
        elif all(d.status == SyncStatusState.UP_TO_DATE for d in device_items):
            overall_state = SyncStatusState.UP_TO_DATE
            overall_label = "✓ Connected" if view_mode == "parent" else "✓ Up to date"
            overall_msg = None
            overall_act = None
        elif any(d.status == SyncStatusState.DELAYED for d in device_items):
            overall_state = SyncStatusState.DELAYED
            overall_label = "⚠ Delayed"
            overall_msg = "Your health device needs to reconnect." if view_mode == "parent" else next((d.sync_message for d in device_items if d.sync_message), f"{subject_title}'s device needs to reconnect.")
            overall_act = "Reconnect"
        else:
            overall_state = SyncStatusState.CONNECTED
            overall_label = "✓ Connected"
            overall_msg = None
            overall_act = None

        return CareSubjectSyncStatusResponse(
            subject_id=subject_id,
            view_mode=view_mode,
            overall_status=overall_state,
            overall_status_label=overall_label,
            sync_message=overall_msg,
            action_label=overall_act,
            action_type="reconnect" if overall_act else None,
            devices=device_items,
            last_sync_at=most_recent_sync,
            last_sync_relative=self.format_relative_sync_time(most_recent_sync, now_dt),
            is_health_event=False
        )



    async def get_connection_permissions(
        self,
        subject_id: uuid.UUID,
        provider_or_connection_id: str
    ) -> WearableConnectionPermissionsResponse:
        """
        Retrieves the granular permissions/scopes granted to a specific wearable connection,
        along with clear, human-readable explanations of what data is shared.
        """
        # Look up connection by ID or provider name
        query = select(WearableConnection).where(WearableConnection.subject_id == subject_id)
        try:
            conn_uuid = uuid.UUID(provider_or_connection_id)
            query = query.where(WearableConnection.id == conn_uuid)
        except ValueError:
            query = query.where(WearableConnection.provider == provider_or_connection_id.lower())

        res = await self.session.execute(query)
        conn = res.scalar_one_or_none()
        if not conn:
            raise ValueError(f"Wearable connection '{provider_or_connection_id}' not found for care subject {subject_id}")

        # Build default permissions if empty
        current_perms = conn.permissions if isinstance(conn.permissions, dict) and conn.permissions else {
            "activity": True,
            "sleep": True,
            "heart_rate": True,
            "workouts": True,
            "weight": False,
            "blood_oxygen": True,
            "body_temperature": False,
            "stress": True
        }

        # Build human-friendly explanations
        explanations: List[WearablePermissionDetail] = []
        for key, meta in WEARABLE_PERMISSION_METADATA.items():
            is_granted = current_perms.get(key, False)
            explanations.append(
                WearablePermissionDetail(
                    key=key,
                    label=meta["label"],
                    description=meta["description"],
                    is_granted=is_granted,
                    data_types=meta["data_types"]
                )
            )

        return WearableConnectionPermissionsResponse(
            connection_id=conn.id,
            subject_id=conn.subject_id,
            provider=conn.provider,
            permissions=current_perms,
            permission_explanations=explanations,
            updated_at=conn.updated_at
        )

    async def update_connection_permissions(
        self,
        subject_id: uuid.UUID,
        provider_or_connection_id: str,
        permissions: Dict[str, bool]
    ) -> WearableConnectionPermissionsResponse:
        """
        Updates the granular telemetry scopes granted to a connection.
        Persists changes to the KinGuardian database and emits a permissions updated event.
        """
        query = select(WearableConnection).where(WearableConnection.subject_id == subject_id)
        try:
            conn_uuid = uuid.UUID(provider_or_connection_id)
            query = query.where(WearableConnection.id == conn_uuid)
        except ValueError:
            query = query.where(WearableConnection.provider == provider_or_connection_id.lower())

        res = await self.session.execute(query)
        conn = res.scalar_one_or_none()
        if not conn:
            raise ValueError(f"Wearable connection '{provider_or_connection_id}' not found for care subject {subject_id}")

        merged_perms = dict(conn.permissions or {})
        merged_perms.update(permissions)
        conn.permissions = merged_perms
        conn.updated_at = datetime.utcnow()
        await self.session.commit()

        return await self.get_connection_permissions(subject_id, provider_or_connection_id)

    async def disconnect_provider(self, subject_id: uuid.UUID, provider: str) -> bool:
        """Revoke a provider connection."""
        wearable_user_id = self.get_wearable_user_id(subject_id)
        return await self.gateway.disconnect(wearable_user_id, provider)



    async def get_wearable_dashboard(self, subject_id: uuid.UUID) -> WearableDashboardResponse:
        """
        Aggregates a complete single-roundtrip wearable health overview for mobile clients.
        Includes active connections, latest daily vitals, weekly averages, and baseline trend analysis.
        """
        wearable_user_id = self.get_wearable_user_id(subject_id)
        connections = await self.gateway.get_user_connections(wearable_user_id)

        # 7-day query window
        activities = await self.get_activity_history(subject_id, days=7)
        sleeps = await self.get_sleep_history(subject_id, days=7)
        recoveries = await self.get_recovery_history(subject_id, days=7)

        sorted_activities = sorted(activities, key=lambda x: x.date, reverse=True) if activities else []
        sorted_sleeps = sorted(sleeps, key=lambda x: x.date, reverse=True) if sleeps else []
        sorted_recoveries = sorted(recoveries, key=lambda x: x.date, reverse=True) if recoveries else []

        latest_activity = sorted_activities[0] if sorted_activities else None
        latest_sleep = sorted_sleeps[0] if sorted_sleeps else None
        latest_recovery = sorted_recoveries[0] if sorted_recoveries else None


        # Calculate weekly averages
        total_steps = sum(a.steps for a in activities)
        avg_steps = int(total_steps / len(activities)) if activities else 0

        total_sleep_mins = sum(s.total_sleep_minutes for s in sleeps)
        avg_sleep_hours = round(total_sleep_mins / (len(sleeps) * 60), 1) if sleeps else 0.0

        # Baseline anomaly detection: Ramesh's activity drop detection
        baseline_step_goal = 5000
        has_anomaly = False
        anomaly_desc = None

        if latest_activity and latest_activity.steps > 0 and latest_activity.steps < (baseline_step_goal * 0.4):
            has_anomaly = True
            drop_pct = int(((baseline_step_goal - latest_activity.steps) / baseline_step_goal) * 100)
            anomaly_desc = f"Activity dropped by {drop_pct}% compared to baseline goal ({latest_activity.steps} steps vs {baseline_step_goal} baseline)."

        return WearableDashboardResponse(
            subject_id=subject_id,
            wearable_user_id=wearable_user_id,
            connected_providers=connections,
            latest_activity=latest_activity,
            latest_sleep=latest_sleep,
            latest_recovery=latest_recovery,
            weekly_average_steps=avg_steps,
            weekly_average_sleep_hours=avg_sleep_hours,
            baseline_step_goal=baseline_step_goal,
            has_activity_anomaly=has_anomaly,
            anomaly_description=anomaly_desc
        )

    async def get_derived_summary(
        self,
        subject_id: uuid.UUID
    ) -> WearableDerivedSummaryResponse:
        """
        Derives mobile-friendly summary read model (activity, sleep, resting heart rate vs baselines)
        for a care subject.
        """
        wearable_user_id = self.get_wearable_user_id(subject_id)

        # 7-day query window
        activities = await self.get_activity_history(subject_id, days=7)
        sleeps = await self.get_sleep_history(subject_id, days=7)
        recoveries = await self.get_recovery_history(subject_id, days=7)
        sync_status = await self.get_sync_status(subject_id)

        sorted_acts = sorted(activities, key=lambda x: x.date, reverse=True) if activities else []
        sorted_slps = sorted(sleeps, key=lambda x: x.date, reverse=True) if sleeps else []
        sorted_recs = sorted(recoveries, key=lambda x: x.date, reverse=True) if recoveries else []

        # 1. Activity: Today, baseline, change_percent
        today_steps = sorted_acts[0].steps if sorted_acts else 0
        total_steps = sum(a.steps for a in sorted_acts)
        baseline_steps = int(total_steps / len(sorted_acts)) if sorted_acts else 6000
        change_pct = int(((today_steps - baseline_steps) / baseline_steps) * 100) if baseline_steps > 0 else 0

        # 2. Sleep: Duration minutes, baseline minutes
        today_sleep_mins = sorted_slps[0].total_sleep_minutes if sorted_slps else 420
        total_sleep_mins = sum(s.total_sleep_minutes for s in sorted_slps)
        baseline_sleep_mins = int(total_sleep_mins / len(sorted_slps)) if sorted_slps else 420

        # 3. Resting Heart Rate: Value, baseline
        today_rhr = sorted_recs[0].resting_heart_rate_bpm if sorted_recs and sorted_recs[0].resting_heart_rate_bpm else 68
        rhrs = [r.resting_heart_rate_bpm for r in sorted_recs if r.resting_heart_rate_bpm is not None]
        baseline_rhr = int(sum(rhrs) / len(rhrs)) if rhrs else 68

        # 4. Last sync at
        last_sync = sync_status.last_successful_sync_at or (sorted_acts[0].measured_at if sorted_acts and hasattr(sorted_acts[0], 'measured_at') else datetime.utcnow())

        return WearableDerivedSummaryResponse(
            activity=WearableActivityDerivedSummary(
                today=today_steps,
                baseline=baseline_steps,
                change_percent=change_pct
            ),
            sleep=WearableSleepDerivedSummary(
                duration_minutes=today_sleep_mins,
                baseline_minutes=baseline_sleep_mins
            ),
            resting_heart_rate=WearableHeartRateDerivedSummary(
                value=today_rhr,
                baseline=baseline_rhr
            ),
            last_sync_at=last_sync
        )


    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """
        Verifies HMAC SHA-256 signature on inbound Open Wearables webhooks.
        """
        if not signature_header:
            return False
        secret = settings.OPEN_WEARABLES_WEBHOOK_SECRET.get_secret_value().encode("utf-8")
        computed = hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, signature_header)

    async def process_inbound_webhook(self, payload: OpenWearablesWebhookPayload) -> Dict[str, Any]:
        """
        Processes inbound webhook event from Open Wearables.
        Stages domain events in the transactional outbox and detects Guardian Moments.
        """
        logger.info(
            f"Processing Open Wearables webhook: event={payload.event_type} user={payload.user_id} provider={payload.provider}"
        )

        # Extract subject_id from user_id (format: "kinguardian_subject_<uuid>" or "kinguardian_subject_<uuid>")
        subject_id_str = payload.user_id.replace("kinguardian_subject_", "").replace("kinguardian_subject_", "")
        try:

            subject_id = uuid.UUID(subject_id_str)
        except ValueError:
            logger.warning(f"Could not parse care subject UUID from Open Wearables user_id '{payload.user_id}'")
            return {"status": "ignored", "reason": "invalid_subject_id"}

        # Find care subject to locate family_id
        res = await self.session.execute(
            select(CareSubject).where(CareSubject.id == subject_id)
        )
        subject = res.scalar_one_or_none()
        if not subject:
            logger.warning(f"Care subject {subject_id} not found for Open Wearables webhook")
            return {"status": "ignored", "reason": "subject_not_found"}

        # 1. Stage transactional domain event
        outbox_event = await self.outbox_svc.stage_event(
            event_type=f"wearable.{payload.event_type.replace(':', '.')}",
            aggregate_type="wearable_telemetry",
            aggregate_id=subject.id,
            family_id=subject.family_id,
            payload={
                "subject_id": str(subject.id),
                "wearable_user_id": payload.user_id,
                "provider": payload.provider,
                "event_type": payload.event_type,
                "data": payload.data
            }
        )

        # 2. Connection Lifecycle Handling
        normalized_event = payload.event_type.replace(":", ".")
        if normalized_event in ("connection.completed", "connection.created"):
            res_conn = await self.session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject.id,
                    WearableConnection.provider == payload.provider.lower()
                )
            )
            conn = res_conn.scalar_one_or_none()
            if not conn:
                conn = WearableConnection(
                    id=uuid.uuid4(),
                    family_id=subject.family_id,
                    subject_id=subject.id,
                    profile_id=subject.profile_id,
                    provider=payload.provider.lower(),
                    open_wearables_user_id=payload.user_id,
                    provider_user_id=payload.data.get("provider_user_id"),
                    connection_status="connected",
                    connected_at=datetime.utcnow()
                )
                self.session.add(conn)
                await self.session.flush()
            else:
                conn.connection_status = "connected"
                conn.connected_at = datetime.utcnow()
                if "provider_user_id" in payload.data:
                    conn.provider_user_id = payload.data["provider_user_id"]
                await self.session.flush()

            # Create or update WearableDataSource
            device_name = payload.data.get("device_name", f"{payload.provider.title()} Device")
            device_id = payload.data.get("device_id")
            source_type = payload.data.get("source_type", "smartwatch")
            res_src = await self.session.execute(
                select(WearableDataSource).where(WearableDataSource.connection_id == conn.id)
            )
            src = res_src.scalar_one_or_none()
            if not src:
                src = WearableDataSource(
                    id=uuid.uuid4(),
                    connection_id=conn.id,
                    provider=payload.provider.lower(),
                    source_type=source_type,
                    device_name=device_name,
                    device_id=device_id,
                    status="active"
                )
                self.session.add(src)
                await self.session.flush()

        elif normalized_event in ("connection.revoked", "connection.disconnected"):
            res_conn = await self.session.execute(
                select(WearableConnection).where(
                    WearableConnection.subject_id == subject.id,
                    WearableConnection.provider == payload.provider.lower()
                )
            )
            conn = res_conn.scalar_one_or_none()
            if conn:
                conn.connection_status = "disconnected"
                conn.disconnected_at = datetime.utcnow()
                await self.session.flush()

        # 3. Check for anomaly triggers in webhook payload
        activity_data = payload.data.get("activity", {})
        steps = activity_data.get("steps", 0)

        if steps > 0 and steps < 2000:
            # Significant activity drop -> Synthesize Guardian Moment
            now = datetime.utcnow()
            insight = AIInsight(
                id=uuid.uuid4(),
                family_id=subject.family_id,
                subject_id=subject.id,
                type="guardian_moment",
                severity="attention",
                title="Activity Trending Lower",
                summary=f"Wearable synced {steps} steps today, significantly below the 5,000 baseline goal.",
                observation=f"Daily step count dropped to {steps} steps.",
                recommendation="Reach out to Dad to check for mild fatigue or mobility discomfort.",
                timeframe_start=now - timedelta(days=1),
                timeframe_end=now,
                confidence=0.92,
                status="active",
                actionability="propose_care_task",
                baseline_comparison="Baseline: 5,000 steps/day",
                created_at=now
            )
            self.session.add(insight)
            await self.session.flush()


        await self.session.commit()
        return {"status": "processed", "outbox_id": str(outbox_event.id)}

    async def sync_and_process_wearable_data_flow(
        self,
        subject_id: uuid.UUID,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Executes the complete End-to-End KinGuardian Wearable Data Flow:
        1. Open Wearables normalized API -> KinGuardian fetches raw provider data.
        2. Normalize into KinGuardian WearableMetric domain models.
        3. Insight Engine -> Calculate baselines & detect anomalies (Activity, Sleep, Recovery).
        4. Guardian Moment / health trend -> Persist AIInsight.
        5. Coordinator notification -> Generate Notification entity & stage Outbox event for coordinator.
        """
        # Fetch Subject and Family
        res_subj = await self.session.execute(
            select(CareSubject).where(CareSubject.id == subject_id)
        )
        subject = res_subj.scalar_one_or_none()
        if not subject:
            raise ValueError(f"Care subject {subject_id} not found")

        res_family = await self.session.execute(
            select(Family).where(Family.id == subject.family_id)
        )
        family = res_family.scalar_one()

        wearable_user_id = self.get_wearable_user_id(subject_id)

        # 1. Fetch raw summaries from Open Wearables Gateway
        activities = await self.get_activity_history(subject_id, days=days)
        sleeps = await self.get_sleep_history(subject_id, days=days)
        recoveries = await self.get_recovery_history(subject_id, days=days)
        workouts = await self.get_workouts_history(subject_id, days=days)

        # 2. Normalize into KinGuardian WearableMetric domain representations
        normalized_metrics: List[WearableMetric] = []
        for act in activities:
            d_time = datetime.strptime(act.date, "%Y-%m-%d") if act.date else datetime.utcnow()
            normalized_metrics.extend([
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.STEPS,
                    value=act.steps,
                    unit="count",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(act.source_provider or "unknown"),
                    source_device="Connected Wearable"
                ),
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.ACTIVE_MINUTES,
                    value=act.active_duration_minutes,
                    unit="minutes",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(act.source_provider or "unknown")
                ),
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.DISTANCE,
                    value=act.distance_meters or 0.0,
                    unit="meters",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(act.source_provider or "unknown")
                ),
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.CALORIES,
                    value=act.calories_burned_kcal or 0.0,
                    unit="kcal",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(act.source_provider or "unknown")
                ),
            ])

        for slp in sleeps:
            d_time = datetime.strptime(slp.date, "%Y-%m-%d") if slp.date else datetime.utcnow()
            normalized_metrics.extend([
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.SLEEP_DURATION,
                    value=slp.total_sleep_minutes * 60,
                    unit="seconds",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(slp.source_provider or "unknown")
                ),
                WearableMetric(
                    subject_id=subject.id,
                    metric_type=WearableMetricType.SLEEP_SCORE,
                    value=slp.sleep_score,
                    unit="score_0_100",
                    measured_at=d_time,
                    source_provider=DeviceProvider.from_str(slp.source_provider or "unknown")
                )
            ])

        for rec in recoveries:
            d_time = datetime.strptime(rec.date, "%Y-%m-%d") if rec.date else datetime.utcnow()
            if rec.resting_heart_rate_bpm:
                normalized_metrics.append(
                    WearableMetric(
                        subject_id=subject.id,
                        metric_type=WearableMetricType.RESTING_HEART_RATE,
                        value=rec.resting_heart_rate_bpm,
                        unit="bpm",
                        measured_at=d_time,
                        source_provider=DeviceProvider.from_str(rec.source_provider or "unknown")
                    )
                )
            if rec.hrv_ms:
                normalized_metrics.append(
                    WearableMetric(
                        subject_id=subject.id,
                        metric_type=WearableMetricType.HEART_RATE_VARIABILITY,
                        value=rec.hrv_ms,
                        unit="ms",
                        measured_at=d_time,
                        source_provider=DeviceProvider.from_str(rec.source_provider or "unknown")
                    )
                )

        # 3. Insight Engine: Trend derivation & Anomaly Evaluation
        daily_domain_summaries: List[WearableDailySummary] = []
        for i in range(len(activities)):
            act = activities[i]
            slp = sleeps[i] if i < len(sleeps) else None
            rec = recoveries[i] if i < len(recoveries) else None
            daily_domain_summaries.append(
                WearableDailySummary(
                    date=act.date,
                    activity=ActivityMetrics(steps=act.steps, active_minutes=act.active_duration_minutes),
                    sleep=SleepArchitecture(total_sleep_minutes=slp.total_sleep_minutes, sleep_score=slp.sleep_score) if slp else None,
                    recovery=RecoveryVitals(resting_heart_rate_bpm=rec.resting_heart_rate_bpm, hrv_rmssd_ms=rec.hrv_ms, spo2_percentage=rec.spo2_percentage) if rec else None
                )
            )


        latest_day = daily_domain_summaries[-1] if daily_domain_summaries else None
        historical_days = daily_domain_summaries[:-1] if len(daily_domain_summaries) > 1 else daily_domain_summaries

        anomalies = []
        if latest_day:
            anomalies = WearableDomainService.evaluate_all_anomalies(
                subject_id=subject.id,
                today_summary=latest_day,
                historical_summaries=historical_days
            )

        # 4. Guardian Moment / Health Trend: Persist AIInsight & Emit Notification
        generated_insights: List[AIInsight] = []
        generated_notifications: List[Notification] = []

        now = datetime.utcnow()
        for anomaly in anomalies:
            insight_id = uuid.uuid4()
            insight = AIInsight(
                id=insight_id,
                family_id=family.id,
                subject_id=subject.id,
                type="guardian_moment",
                severity="attention" if anomaly.severity == AnomalySeverity.ATTENTION else "warning",
                title=f"Guardian Moment: {anomaly.metric_name.replace('_', ' ').title()} Deviation",
                summary=anomaly.description,
                observation=f"Observed value: {anomaly.observed_value:.1f}, Baseline: {anomaly.baseline_value:.1f} ({anomaly.percentage_deviation:.0f}% deviation).",
                recommendation=f"Check in with {subject.relationship_to_coordinator or 'care subject'} regarding fatigue or health concerns.",
                timeframe_start=now - timedelta(days=1),
                timeframe_end=now,
                confidence=0.94,
                status="active",
                actionability="propose_care_task",
                baseline_comparison=f"Baseline: {anomaly.baseline_value:.1f}"
            )
            self.session.add(insight)
            generated_insights.append(insight)

            # 5. Coordinator Notification (e.g. to Anjali in London)
            if family.primary_coordinator_profile_id:
                notif_id = uuid.uuid4()
                notif = Notification(
                    id=notif_id,
                    recipient_profile_id=family.primary_coordinator_profile_id,
                    family_id=family.id,
                    subject_id=subject.id,
                    type="guardian_anomaly_alert",
                    priority="high" if anomaly.severity == AnomalySeverity.WARNING else "normal",
                    title=f"Guardian Alert: Activity drop for {subject.relationship_to_coordinator or 'Dad'}",
                    body=anomaly.description,
                    action_type="view_guardian_moment"
                )
                self.session.add(notif)
                generated_notifications.append(notif)

                # Stage Outbox Notification Event
                await self.outbox_svc.stage_event(
                    event_type="notification.guardian_alert",
                    aggregate_type="notification",
                    aggregate_id=notif_id,
                    family_id=family.id,
                    payload={
                        "notification_id": str(notif_id),
                        "recipient_profile_id": str(family.primary_coordinator_profile_id),
                        "subject_id": str(subject.id),
                        "title": notif.title,
                        "body": notif.body
                    }
                )


        await self.session.commit()

        return {
            "subject_id": str(subject.id),
            "normalized_metrics_count": len(normalized_metrics),
            "metrics": [m.to_dict() for m in normalized_metrics[:10]],  # sample preview
            "anomalies_detected": len(anomalies),
            "insights_generated": len(generated_insights),
            "notifications_dispatched": len(generated_notifications),
            "guardian_moment": generated_insights[0].title if generated_insights else None
        }

    async def get_unified_metrics(
        self,
        subject_id: uuid.UUID,
        metric: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        provider: Optional[str] = None,
        source: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 20
    ) -> UnifiedWearableMetricsResponse:
        """
        Unified endpoint for querying multi-dimensional wearable metrics (steps, heart rate,
        sleep duration, HRV, etc.) with provider/source filtering and cursor-based pagination.
        """
        wearable_user_id = self.get_wearable_user_id(subject_id)

        # Parse date range
        end_d = to_date or datetime.utcnow().strftime("%Y-%m-%d")
        start_d = from_date or (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

        # Fetch telemetry from Open Wearables Gateway
        activities = await self.gateway.get_daily_activity(wearable_user_id, start_d, end_d)
        sleeps = await self.gateway.get_sleep(wearable_user_id, start_d, end_d)
        recoveries = await self.gateway.get_heart_rate(wearable_user_id, start_d, end_d)

        # Determine subject local timezone
        subject_tz = "UTC"
        subject_record = await self.session.get(CareSubject, subject_id)
        if subject_record and subject_record.timezone:
            subject_tz = subject_record.timezone

        # Normalize into domain WearableMetric items
        metrics: List[WearableMetricItem] = []

        # 1. Activities
        for act in activities:
            try:
                measured_at = datetime.fromisoformat(act.date)
                if measured_at.tzinfo is None:
                    measured_at = measured_at.replace(tzinfo=timezone.utc)
            except Exception:
                measured_at = datetime.now(timezone.utc)

            # Steps
            metrics.append(
                WearableMetricItem(
                    subject_id=subject_id,
                    metric="steps",
                    value=act.steps,
                    unit="steps",
                    measured_at_utc=measured_at,
                    measured_at=measured_at,
                    local_timezone=subject_tz,
                    source_provider=act.source_provider or "garmin",
                    source_device=source or "Garmin Venu",
                    source_reference=f"act_{act.date}",
                    metadata={"calories": act.calories_burned_kcal, "distance_meters": act.distance_meters}
                )
            )
            # Distance
            if act.distance_meters is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="distance",
                        value=act.distance_meters,
                        unit="meters",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=act.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"act_{act.date}"
                    )
                )
            # Active Minutes
            if act.active_duration_minutes is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="active_minutes",
                        value=act.active_duration_minutes,
                        unit="minutes",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=act.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"act_{act.date}"
                    )
                )
            # Calories
            if act.calories_burned_kcal is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="calories",
                        value=act.calories_burned_kcal,
                        unit="kcal",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=act.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"act_{act.date}"
                    )
                )

        # 2. Sleep
        for slp in sleeps:
            try:
                measured_at = datetime.fromisoformat(slp.date)
                if measured_at.tzinfo is None:
                    measured_at = measured_at.replace(tzinfo=timezone.utc)
            except Exception:
                measured_at = datetime.now(timezone.utc)

            # Sleep Duration
            metrics.append(
                WearableMetricItem(
                    subject_id=subject_id,
                    metric="sleep_duration",
                    value=slp.total_sleep_minutes,
                    unit="minutes",
                    measured_at_utc=measured_at,
                    measured_at=measured_at,
                    local_timezone=subject_tz,
                    source_provider=slp.source_provider or "garmin",
                    source_device=source or "Garmin Venu",
                    source_reference=f"sleep_{slp.date}",
                    metadata={"efficiency": slp.efficiency_percentage}
                )
            )
            # Sleep Score
            if slp.sleep_score is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="sleep_score",
                        value=slp.sleep_score,
                        unit="score",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=slp.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"sleep_{slp.date}"
                    )
                )

        # 3. Recovery / Heart Rate
        for rec in recoveries:
            try:
                measured_at = datetime.fromisoformat(rec.date)
                if measured_at.tzinfo is None:
                    measured_at = measured_at.replace(tzinfo=timezone.utc)
            except Exception:
                measured_at = datetime.now(timezone.utc)

            # Resting Heart Rate
            if rec.resting_heart_rate_bpm is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="resting_heart_rate",
                        value=rec.resting_heart_rate_bpm,
                        unit="bpm",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=rec.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"rec_{rec.date}"
                    )
                )
            # Heart Rate Variability (HRV)
            if rec.hrv_ms is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="heart_rate_variability",
                        value=rec.hrv_ms,
                        unit="ms",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=rec.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"rec_{rec.date}"
                    )
                )
            # Blood Oxygen (SpO2)
            if rec.spo2_percentage is not None:
                metrics.append(
                    WearableMetricItem(
                        subject_id=subject_id,
                        metric="blood_oxygen",
                        value=rec.spo2_percentage,
                        unit="%",
                        measured_at_utc=measured_at,
                        measured_at=measured_at,
                        local_timezone=subject_tz,
                        source_provider=rec.source_provider or "garmin",
                        source_device=source or "Garmin Venu",
                        source_reference=f"rec_{rec.date}"
                    )
                )


        # Apply Filters
        filtered = metrics
        if metric:
            m_lower = metric.lower().strip()
            filtered = [
                m for m in filtered
                if m.metric.lower() == m_lower
                or (m_lower in ("heart_rate", "heart-rate") and m.metric == "resting_heart_rate")
                or (m_lower in ("sleep", "sleep_duration") and m.metric in ("sleep_duration", "sleep_score"))
            ]

        if provider:
            p_lower = provider.lower().strip()
            filtered = [m for m in filtered if m.source_provider.lower() == p_lower]

        if source:
            s_lower = source.lower().strip()
            filtered = [
                m for m in filtered
                if (m.source_device and s_lower in m.source_device.lower())
                or (m.source_reference and s_lower in m.source_reference.lower())
            ]

        # Sort descending by measured_at
        filtered.sort(key=lambda x: x.measured_at, reverse=True)

        # Cursor pagination
        offset = 0
        if cursor:
            try:
                import base64
                offset = int(base64.b64decode(cursor.encode()).decode())
            except Exception:
                offset = 0

        total_items = len(filtered)
        paginated_items = filtered[offset : offset + limit]
        has_more = (offset + limit) < total_items

        next_cursor = None
        if has_more:
            import base64
            next_cursor = base64.b64encode(str(offset + limit).encode()).decode()

        return UnifiedWearableMetricsResponse(
            items=paginated_items,
            total_items=total_items,
            next_cursor=next_cursor,
            has_more=has_more
        )


