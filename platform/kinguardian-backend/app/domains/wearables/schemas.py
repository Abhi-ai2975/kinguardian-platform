"""
Open Wearables Domain Schemas & DTOs.

Provides strongly-typed contracts for wearable device connections,
daily aggregated health summaries (activity, sleep, recovery, body),
and inbound webhook event ingestion.
"""

import uuid
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict


class WearableProvider(str):
    GARMIN = "garmin"
    OURA = "oura"
    WHOOP = "whoop"
    SUUNTO = "suunto"
    POLAR = "polar"
    ULTRAHUMAN = "ultrahuman"
    STRAVA = "strava"
    FITBIT = "fitbit"
    APPLE_HEALTH = "apple_health"
    HEALTH_CONNECT = "health_connect"
    SAMSUNG_HEALTH = "samsung_health"


class DeviceConnectionResponse(BaseModel):
    """Connected wearable device state for a care subject."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    status: Literal["active", "inactive", "pending", "error"] = "active"
    provider_user_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    capabilities: Dict[str, Any] = Field(default_factory=dict)


class DeviceConnectUrlResponse(BaseModel):
    """OAuth connection URL or mobile SDK token for connecting a wearable device."""
    provider: str
    connect_url: Optional[str] = None
    invitation_code: Optional[str] = None
    sdk_token: Optional[str] = None
    expires_at: Optional[datetime] = None


class WearableActivitySummary(BaseModel):
    """Daily aggregated activity metrics (steps, energy, active duration)."""
    date: str
    steps: int = 0
    active_duration_minutes: int = 0
    calories_burned_kcal: Optional[float] = None
    distance_meters: Optional[float] = None
    floors_climbed: Optional[int] = None
    source_provider: Optional[str] = None


class WearableSleepSummary(BaseModel):
    """Daily aggregated sleep architecture and quality metrics."""
    date: str
    total_sleep_minutes: int = 0
    deep_sleep_minutes: Optional[int] = None
    light_sleep_minutes: Optional[int] = None
    rem_sleep_minutes: Optional[int] = None
    awake_minutes: Optional[int] = None
    sleep_score: Optional[int] = None  # 0 - 100
    efficiency_percentage: Optional[float] = None
    source_provider: Optional[str] = None


class WearableRecoverySummary(BaseModel):
    """Daily aggregated autonomic recovery and physiological metrics."""
    date: str
    resting_heart_rate_bpm: Optional[int] = None
    hrv_ms: Optional[float] = None  # Heart Rate Variability (RMSSD)
    spo2_percentage: Optional[float] = None  # Blood oxygen saturation
    skin_temperature_celsius: Optional[float] = None
    recovery_score: Optional[int] = None  # 0 - 100
    respiratory_rate_bpm: Optional[float] = None
    source_provider: Optional[str] = None


class WearableDashboardResponse(BaseModel):
    """Single-roundtrip aggregated wearable health overview for a care subject."""
    subject_id: uuid.UUID
    wearable_user_id: str
    connected_providers: List[DeviceConnectionResponse] = Field(default_factory=list)
    latest_activity: Optional[WearableActivitySummary] = None
    latest_sleep: Optional[WearableSleepSummary] = None
    latest_recovery: Optional[WearableRecoverySummary] = None
    weekly_average_steps: int = 0
    weekly_average_sleep_hours: float = 0.0
    baseline_step_goal: int = 5000
    has_activity_anomaly: bool = False
    anomaly_description: Optional[str] = None


class WearableWorkoutSummary(BaseModel):
    """Normalized workout or physical exercise session."""
    id: str
    date: str
    activity_type: str  # e.g. "walking", "running", "yoga", "swimming"
    duration_minutes: int
    calories_burned_kcal: Optional[float] = None
    average_heart_rate_bpm: Optional[int] = None
    max_heart_rate_bpm: Optional[int] = None
    distance_meters: Optional[float] = None
    source_provider: Optional[str] = None


from enum import Enum


class SyncStatusState(str, Enum):
    """
    Exposed canonical wearable sync status states:
    - Connected
    - Syncing
    - Up to date
    - Delayed
    - Error
    - Disconnected
    """
    CONNECTED = "connected"         # "Connected"
    SYNCING = "syncing"             # "Syncing"
    UP_TO_DATE = "up_to_date"       # "Up to date"
    DELAYED = "delayed"             # "Delayed"
    ERROR = "error"                 # "Error"
    DISCONNECTED = "disconnected"   # "Disconnected"


class DeviceSyncStatusItem(BaseModel):
    """Individual connected device sync status descriptor."""
    connection_id: uuid.UUID
    provider: str
    device_name: str
    device_title: str                     # e.g. "Dad's Garmin" (Coordinator) or "My watch" (Parent)
    status: SyncStatusState
    status_label: str                     # e.g. "✓ Up to date", "✓ Connected", "⟳ Syncing", "⚠ Delayed", "✕ Error", "✕ Disconnected"
    sync_message: Optional[str] = None    # e.g. "Dad's Garmin hasn't synced for 12 hours." (Coordinator) or "Your health device needs to reconnect." (Parent)
    action_label: Optional[str] = None    # e.g. "Reconnect"
    action_type: Optional[str] = None     # e.g. "reconnect"
    last_sync_at: Optional[datetime] = None
    last_sync_relative: Optional[str] = None  # e.g. "Last sync: 8 minutes ago"
    is_syncing: bool = False
    error_message: Optional[str] = None
    is_health_event: bool = Field(default=False, description="Explicit safety invariant: Missing wearable telemetry is an operational state and NOT a health event")


class CareSubjectSyncStatusResponse(BaseModel):
    """Aggregated role-aware sync status response for all devices associated with a care subject."""
    subject_id: uuid.UUID
    view_mode: str                        # "coordinator" | "parent"
    overall_status: SyncStatusState
    overall_status_label: str
    sync_message: Optional[str] = None
    action_label: Optional[str] = None
    action_type: Optional[str] = None
    devices: List[DeviceSyncStatusItem] = Field(default_factory=list)
    last_sync_at: Optional[datetime] = None
    last_sync_relative: Optional[str] = None
    is_health_event: bool = Field(default=False, description="Explicit safety invariant: Missing wearable telemetry is an operational state and NOT a health event")



class WearableSyncStatus(BaseModel):
    """Sync status and health diagnostics across all connected providers."""
    user_id: str
    is_syncing: bool = False
    last_successful_sync_at: Optional[datetime] = None
    connected_provider_count: int = 0
    active_providers: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)



class OpenWearablesWebhookPayload(BaseModel):
    """Inbound webhook event delivered by Open Wearables upon sync."""
    event_id: Optional[str] = Field(default=None, description="Unique event identifier for idempotency")
    event_type: str = Field(..., description="e.g. wearable.connected, wearable.disconnected, wearable.sync.completed, wearable.data.received, data.synced, connection.created, anomaly.detected")
    user_id: str
    provider: Optional[str] = "unknown"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict)



class WearablePermissionDetail(BaseModel):
    """Explains in clear, human-friendly terms what data is shared under a specific scope."""
    key: str
    label: str
    description: str
    is_granted: bool
    data_types: List[str]


class WearableConnectionPermissionsResponse(BaseModel):
    """Granular permissions/scope granted to a specific wearable connection."""
    connection_id: uuid.UUID
    subject_id: uuid.UUID
    provider: str
    permissions: Dict[str, bool]
    permission_explanations: List[WearablePermissionDetail]
    updated_at: Optional[datetime] = None


class UpdateWearablePermissionsRequest(BaseModel):
    """Request payload to update granted scopes for a connection."""
    permissions: Dict[str, bool]


WEARABLE_PERMISSION_METADATA: Dict[str, Dict[str, Any]] = {
    "activity": {
        "label": "Daily Activity & Movement",
        "description": "Daily steps, active minutes, walking distance, and estimated calorie expenditure.",
        "data_types": ["steps", "distance", "active_minutes", "calories"]
    },
    "sleep": {
        "label": "Sleep Architecture & Quality",
        "description": "Total sleep duration, sleep scores, and sleep stage cycles (Deep, REM, Light).",
        "data_types": ["sleep_duration", "sleep_score", "sleep_stages"]
    },
    "heart_rate": {
        "label": "Heart Rate & Recovery",
        "description": "Continuous pulse, resting heart rate (RHR), and heart rate variability (HRV RMSSD).",
        "data_types": ["heart_rate", "resting_heart_rate", "heart_rate_variability"]
    },
    "workouts": {
        "label": "Exercise & Workout Sessions",
        "description": "Logged fitness activities including walking, running, and cardio sessions.",
        "data_types": ["workout", "activity_level"]
    },
    "weight": {
        "label": "Weight & Body Composition",
        "description": "Body weight measurements and BMI trends.",
        "data_types": ["weight"]
    },
    "blood_oxygen": {
        "label": "Pulse Oximetry (SpO2)",
        "description": "Blood oxygen saturation levels and nocturnal respiratory rate patterns.",
        "data_types": ["blood_oxygen", "respiratory_rate"]
    },
    "body_temperature": {
        "label": "Skin Temperature",
        "description": "Wrist/skin temperature variations relative to baseline.",
        "data_types": ["body_temperature"]
    },
    "stress": {
        "label": "Autonomic Stress Index",
        "description": "Physiological stress scores and relaxation balance derived from HRV.",
        "data_types": ["stress"]
    }
}


class WearableConsentStatusResponse(BaseModel):
    """Consent status and mandatory pre-connection disclosures for wearable health information."""
    subject_id: uuid.UUID
    family_id: uuid.UUID
    is_consent_granted: bool
    status: str  # active, pending, revoked, not_requested
    disclosures: List[str] = Field(
        default_factory=lambda: [
            "Activity",
            "Sleep",
            "Heart rate"
        ]
    )
    revocation_policy: str = "You can disconnect this device at any time."
    granted_scopes: Dict[str, bool] = Field(default_factory=dict)
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class WearableConsentGrantRequest(BaseModel):
    """Explicit grant of consent by parent or authorized coordinator."""
    grantor_profile_id: Optional[uuid.UUID] = None
    grantee_profile_id: Optional[uuid.UUID] = None
    scopes: Dict[str, bool] = Field(
        default_factory=lambda: {
            "activity": True,
            "sleep": True,
            "heart_rate": True
        }
    )
    acknowledgement_text: str = Field(
        default="I understand that KinGuardian will receive Activity, Sleep, and Heart rate data from connected wearables, and I can disconnect at any time."
    )


class PaginationMetadata(BaseModel):
    """Metadata for paginated time-series queries."""
    page: int = Field(1, ge=1, description="Current 1-indexed page number")
    page_size: int = Field(20, ge=1, le=100, description="Number of items per page")
    total_items: int = Field(0, ge=0, description="Total number of items in query")
    total_pages: int = Field(0, ge=0, description="Total number of pages")
    has_next: bool = False
    has_previous: bool = False


class PaginatedActivityResponse(BaseModel):
    """Paginated daily activity time-series data."""
    items: List[WearableActivitySummary] = Field(default_factory=list)
    pagination: PaginationMetadata


class PaginatedSleepResponse(BaseModel):
    """Paginated sleep architecture time-series data."""
    items: List[WearableSleepSummary] = Field(default_factory=list)
    pagination: PaginationMetadata


class PaginatedHeartRateResponse(BaseModel):
    """Paginated cardiovascular and recovery vitals time-series data."""
    items: List[WearableRecoverySummary] = Field(default_factory=list)
    pagination: PaginationMetadata


class WearableSubjectOverview(BaseModel):
    """Root wearable overview for a care subject."""
    subject_id: uuid.UUID
    open_wearables_user_id: str
    active_connections: List[DeviceConnectionResponse] = Field(default_factory=list)
    latest_activity: Optional[WearableActivitySummary] = None
    latest_sleep: Optional[WearableSleepSummary] = None
    latest_heart_rate: Optional[WearableRecoverySummary] = None
    sync_status: WearableSyncStatus


class CreateWearableConnectionRequest(BaseModel):
    """Payload to initiate a wearable device connection."""
    provider: str = Field(..., description="Target wearable vendor (e.g. garmin, apple_health, fitbit, oura, whoop)")
    redirect_url: Optional[str] = Field(None, description="Optional client redirect URL after completing OAuth flow")


class WearableConnectionFlowDescriptor(BaseModel):
    """
    Connection Flow Descriptor returned to the mobile client.
    Contains strictly zero provider credentials, providing a secure connection URL.
    """
    connection_id: uuid.UUID
    provider: str
    status: str = "pending"
    connection_url: str
    expires_at: Optional[datetime] = None


class WearableDisconnectResponse(BaseModel):
    """Response returned upon disconnecting a wearable provider."""
    connection_id: uuid.UUID
    provider: str
    status: str = "disconnected"
    disconnected_at: datetime


class WearableMetricItem(BaseModel):
    """Normalized domain metric representation for a care subject."""
    subject_id: uuid.UUID
    metric: str = Field(..., description="Metric type identifier (e.g. steps, heart_rate, sleep_duration, hrv)")
    value: Any = Field(..., description="Biometric metric value (scalar, time duration, or stage breakdown)")
    unit: str = Field(..., description="Standardized measurement unit (e.g. steps, bpm, minutes, ms, %)")
    measured_at_utc: datetime = Field(..., description="Measurement timestamp strictly normalized to UTC")
    measured_at: Optional[datetime] = Field(None, description="Backwards-compatible alias for measured_at_utc")
    local_timezone: str = Field("UTC", description="Subject local timezone for mobile UI client conversion (e.g. Asia/Kolkata)")
    source_provider: str = Field(..., description="Origin provider (garmin, apple_health, fitbit, oura, etc.)")
    source_device: Optional[str] = Field(None, description="Hardware model or device identifier if available")
    source_reference: Optional[str] = Field(None, description="External Open Wearables event or reading reference")
    metadata: Dict[str, Any] = Field(default_factory=dict)



class UnifiedWearableMetricsResponse(BaseModel):
    """Unified paginated wearable metrics response supporting multi-dimension filtering."""
    items: List[WearableMetricItem] = Field(default_factory=list)
    total_items: int = Field(0, description="Total matching items in the queried range")
    next_cursor: Optional[str] = Field(None, description="Opaque cursor token for next page")
    has_more: bool = False


class WearableActivityDerivedSummary(BaseModel):
    """Derived read model for physical activity vs baseline."""
    today: int = Field(..., description="Today's step count")
    baseline: int = Field(..., description="Calculated 7-day baseline step goal/average")
    change_percent: int = Field(..., description="Percentage change relative to baseline (+/-)")


class WearableSleepDerivedSummary(BaseModel):
    """Derived read model for sleep duration vs baseline."""
    duration_minutes: int = Field(..., description="Latest nocturnal sleep duration in minutes")
    baseline_minutes: int = Field(..., description="Calculated 7-day baseline sleep duration in minutes")


class WearableHeartRateDerivedSummary(BaseModel):
    """Derived read model for cardiovascular recovery vitals vs baseline."""
    value: int = Field(..., description="Latest resting heart rate in bpm")
    baseline: int = Field(..., description="Calculated 7-day baseline resting heart rate in bpm")


class WearableDerivedSummaryResponse(BaseModel):
    """
    Mobile-friendly derived wearable summary read model.
    Encapsulates derived health dimensions and baselines rather than raw provider payloads.
    """
    activity: WearableActivityDerivedSummary
    sleep: WearableSleepDerivedSummary
    resting_heart_rate: WearableHeartRateDerivedSummary
    last_sync_at: Optional[datetime] = None







