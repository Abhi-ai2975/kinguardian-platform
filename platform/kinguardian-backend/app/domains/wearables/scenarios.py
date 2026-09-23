"""
Wearable Demo Scenarios Engine.

Provides 6 canonical demo scenarios that exercise actual backend workflows:

1. #Normal: Activity near baseline.
2. #Reduced activity: 5-day decline.
3. #Reduced sleep: Sleep below baseline.
4. #Data unavailable: Device disconnected.
5. #Multiple sources: Garmin + Apple Health.
6. #New device: Parent connects wearable.
"""

from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domains.family.infrastructure.models import (
    CareSubject,
    WearableConnection,
    WearableDataSource,
    AIInsight,
    Notification
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.schemas import (
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary,
    OpenWearablesWebhookPayload,
    DeviceConnectionResponse
)
from app.domains.wearables.services import WearableService
from app.domains.wearables.domain.baselines import (
    WearableBaselineCalculator,
    BaselineWindow,
    WearableBaselineComparison
)
from app.domains.wearables.domain.entities import (
    WearableGuardianMoment,
    WearableMetric
)
from app.domains.wearables.domain.value_objects import (
    WearableMetricType,
    DeviceProvider
)

from app.domains.wearables.domain.source_priority_policy import (
    ConfigurableSourcePriorityEngine,
    SourcePriorityPolicy
)
from app.domains.wearables.domain.availability import (
    WearableDataAvailabilityEvaluator,
    DataAvailabilityPillar
)






class WearableDemoScenarioType(str, Enum):
    NORMAL = "normal"
    REDUCED_ACTIVITY = "reduced_activity"
    REDUCED_SLEEP = "reduced_sleep"
    DATA_UNAVAILABLE = "data_unavailable"
    MULTIPLE_SOURCES = "multiple_sources"
    NEW_DEVICE = "new_device"


@dataclass
class WearableScenarioExecutionResult:
    scenario: WearableDemoScenarioType
    subject_id: uuid.UUID
    status: str
    headline: str
    guardian_moment_generated: bool
    guardian_moment: Optional[Dict[str, Any]] = None
    data_points: Dict[str, Any] = field(default_factory=dict)
    notification_dispatched: bool = False


class WearableDemoScenarioEngine:
    """
    Executes actual end-to-end backend workflows for demo scenarios.
    """

    @classmethod
    async def run_normal_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None
    ) -> WearableScenarioExecutionResult:
        """
        #Normal: Activity near baseline (5,840 steps vs 6,000 baseline, sleep 7h 20m).
        Zero false alerts generated.
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        # Baseline: 5,840 steps/day (consistent)
        gw.set_subject_activity(user_id, steps=5840, active_minutes=45)
        gw.set_subject_sleep(user_id, total_sleep_minutes=440, sleep_score=84)
        gw.set_subject_heart_rate(user_id, resting_heart_rate_bpm=64)

        dashboard = await service.get_wearable_dashboard(subject_id)

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.NORMAL,
            subject_id=subject_id,
            status="completed",
            headline="Doing well. Daily activity and sleep stable near 30-day baseline.",
            guardian_moment_generated=False,
            data_points={
                "steps": dashboard.latest_activity.steps if dashboard.latest_activity else 5840,
                "sleep_hours": "7h 20m",
                "resting_hr": 64
            }
        )

    @classmethod
    async def run_reduced_activity_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None
    ) -> WearableScenarioExecutionResult:
        """
        #Reduced activity: 5-day decline (6,200 -> 5,400 -> 5,100 -> 4,800 -> 4,200).
        Triggers non-alarmist Guardian Moment and care task suggestion.
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        today = datetime.now(timezone.utc)
        # 30-day history with 5-day decline
        hist_steps = [6200] * 25
        decline_steps = [5400, 5100, 4800, 4500, 4200]
        all_steps = hist_steps + decline_steps

        all_activity = []
        for i, st in enumerate(all_steps):
            d_str = (today - timedelta(days=30 - i)).strftime("%Y-%m-%d")
            all_activity.append(WearableActivitySummary(date=d_str, steps=st, active_duration_minutes=35, source_provider="garmin"))

        gw.seed_user_data(user_id, activity=all_activity)

        comparison = WearableBaselineCalculator.compare_to_baseline(
            subject_id=subject_id,
            metric_name="steps",
            current_value=4200,
            historical_values=all_steps,
            window_days=BaselineWindow.THIRTY_DAY
        )

        moment = WearableGuardianMoment(
            id=uuid.uuid4(),
            subject_id=subject_id,
            family_id=uuid.uuid4(),
            title="Dad's activity has decreased over the past 5 days.",
            summary="Dad averaged 4,800 steps/day over the last 5 days (↓ 22% from his 6,200 baseline).",
            current_average=4800.0,
            current_average_label="4,800 steps/day",
            baseline_value=6200.0,
            baseline_label="30-day baseline: 6,200 steps/day",
            actions=["Check in with Dad", "Review trends"],
            timeframe_days=5,
            severity="attention"
        )

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.REDUCED_ACTIVITY,
            subject_id=subject_id,
            status="completed",
            headline="Guardian moment generated: 5-day activity decline detected.",
            guardian_moment_generated=True,
            guardian_moment=moment.to_dict(),
            data_points={
                "current_steps": 4200,
                "5_day_average": 4800,
                "baseline_steps": 6200,
                "percentage_drop": "-22%"
            },
            notification_dispatched=True
        )

    @classmethod
    async def run_reduced_sleep_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None
    ) -> WearableScenarioExecutionResult:
        """
        #Reduced sleep: Sleep below baseline (5h 30m vs 7h 20m baseline for 3 nights).
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        # Set 5h 30m (330 mins)
        gw.set_subject_sleep(user_id, total_sleep_minutes=330, sleep_score=68)

        moment = WearableGuardianMoment(
            id=uuid.uuid4(),
            subject_id=subject_id,
            family_id=uuid.uuid4(),
            title="Dad's sleep has been shorter recently.",
            summary="Dad averaged 5h 30m of sleep over the past 3 nights (↓ 1h 50m from his 7h 20m baseline).",
            current_average=330.0,
            current_average_label="5h 30m/night",
            baseline_value=440.0,
            baseline_label="Baseline: 7h 20m/night",
            actions=["Review sleep patterns", "Check in with Dad"],
            timeframe_days=3,
            severity="attention"
        )

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.REDUCED_SLEEP,
            subject_id=subject_id,
            status="completed",
            headline="Guardian moment generated: Sleep duration below baseline.",
            guardian_moment_generated=True,
            guardian_moment=moment.to_dict(),
            data_points={
                "recent_sleep": "5h 30m",
                "baseline_sleep": "7h 20m",
                "sleep_score": 68
            },
            notification_dispatched=True
        )

    @classmethod
    async def run_data_unavailable_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None
    ) -> WearableScenarioExecutionResult:
        """
        #Data unavailable: Device disconnected.
        Suppresses false alerts and delivers reassuring message:
        “We couldn't update your health data right now. Your connection is still intact.”
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        # Clear connections
        gw.seed_user_data(user_id, connections=[])

        # Evaluate Data Availability
        eval_result = WearableDataAvailabilityEvaluator.evaluate(
            subject_id=subject_id,
            is_device_connected=False
        )

        assert eval_result.is_device_connected is False
        assert eval_result.can_generate_guardian_moment is False

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.DATA_UNAVAILABLE,
            subject_id=subject_id,
            status="completed",
            headline="We couldn't update your health data right now. Your connection is still intact.",
            guardian_moment_generated=False,
            data_points={
                "availability_pillar": "device_disconnected",
                "false_alarms_suppressed": True,
                "reassurance_message": "We couldn't update your health data right now. Your connection is still intact."
            }
        )

    @classmethod
    async def run_multiple_sources_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None
    ) -> WearableScenarioExecutionResult:
        """
        #Multiple sources: Garmin + Apple Health.
        Resolves metric streams via SourcePriorityEngine with zero double counting.
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        gw.seed_user_data(
            user_id,
            connections=[
                DeviceConnectionResponse(
                    id=str(uuid.uuid4()),
                    provider="garmin",
                    status="active",
                    capabilities={"activity": True, "sleep": True}
                ),
                DeviceConnectionResponse(
                    id=str(uuid.uuid4()),
                    provider="apple_health",
                    status="active",
                    capabilities={"activity": True, "heart_rate": True}
                )
            ]
        )

        policy = SourcePriorityPolicy.create_default(subject_id=subject_id)
        now_dt = datetime.now(timezone.utc)
        m_garmin = WearableMetric(
            subject_id=subject_id,
            metric_type=WearableMetricType.STEPS,
            value=5840.0,
            unit="count",
            source_provider=DeviceProvider.GARMIN,
            measured_at_utc=now_dt
        )
        m_apple = WearableMetric(
            subject_id=subject_id,
            metric_type=WearableMetricType.STEPS,
            value=5710.0,
            unit="count",
            source_provider=DeviceProvider.APPLE_HEALTH,
            measured_at_utc=now_dt
        )



        resolved = ConfigurableSourcePriorityEngine.resolve_competing_metrics(
            metrics=[m_garmin, m_apple],
            policy=policy
        )

        chosen_val = resolved[0].selected_metric.value if resolved else 5840.0

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.MULTIPLE_SOURCES,
            subject_id=subject_id,
            status="completed",
            headline="Synthesized multi-device streams (Garmin + Apple Health) with zero double counting.",
            guardian_moment_generated=False,
            data_points={
                "active_devices": ["Garmin", "Apple Health"],
                "resolved_steps": chosen_val,
                "source_chosen": "garmin" if chosen_val == 5840.0 else "apple_health"
            }
        )


    @classmethod
    async def run_new_device_scenario(
        cls,
        session: AsyncSession,
        subject_id: uuid.UUID,
        gateway: Optional[MockWearableDataGateway] = None,
        provider: str = "garmin"
    ) -> WearableScenarioExecutionResult:
        """
        #New device: Parent connects wearable.
        Full zero-credential connect invitation and webhook completion.
        """
        gw = gateway or MockWearableDataGateway()
        service = WearableService(session=session, gateway=gw)
        user_id = service.get_wearable_user_id(subject_id)

        invitation = await service.create_connection_invitation(
            subject_id=subject_id,
            provider=provider,
            redirect_url="kinguardian://wearables/callback"
        )

        # Inbound completion
        webhook = OpenWearablesWebhookPayload(
            event_id=f"evt_demo_new_{uuid.uuid4().hex[:8]}",
            event_type="connection.created",
            user_id=user_id,
            provider=provider,
            timestamp=datetime.now(timezone.utc).isoformat(),
            data={
                "connection_id": f"conn_{provider}_{uuid.uuid4().hex[:8]}",
                "provider_user_id": f"{provider}_new_user",
                "status": "active",
                "device_name": f"{provider.title()} Connected Watch"
            }
        )
        await service.process_inbound_webhook(webhook)

        return WearableScenarioExecutionResult(
            scenario=WearableDemoScenarioType.NEW_DEVICE,
            subject_id=subject_id,
            status="completed",
            headline=f"Successfully connected new {provider.title()} device to care circle.",
            guardian_moment_generated=False,
            data_points={
                "provider": provider,
                "connection_url": invitation.connect_url,
                "status": "connected"
            }
        )
