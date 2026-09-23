import zoneinfo
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from app.core.logging import get_logger

logger = get_logger(__name__)


class DualTimezoneView(BaseModel):
    """
    Dual-timezone projection ensuring coordinators and parents view timestamps
    strictly in their respective local contexts without ambiguous time interpretation.
    """
    utc_timestamp: datetime
    utc_iso: str
    parent_timezone: str
    parent_local_time: str
    coordinator_timezone: str
    coordinator_local_time: str
    time_difference_hours: float


class TimezoneService:
    """
    Cross-Border Timezone Service:
    - Never stores local time without timezone context.
    - Stores all persistence timestamps in UTC.
    - Displays timestamps formatted in the recipient/viewing user's local IANA timezone.
    - Supports cross-border coordinator-parent dual timezone projections (e.g. Asia/Kolkata vs Europe/London).
    """

    @staticmethod
    def get_zone_info(tz_str: str) -> zoneinfo.ZoneInfo:
        """Resolves IANA timezone string to ZoneInfo, falling back safely to UTC on invalid names."""
        try:
            return zoneinfo.ZoneInfo(tz_str.strip())
        except Exception:
            logger.warning(f"Invalid timezone identifier '{tz_str}'. Falling back to UTC.")
            return zoneinfo.ZoneInfo("UTC")

    @classmethod
    def validate_timezone(cls, tz_str: str) -> bool:
        """Validates if tz_str is a valid IANA timezone."""
        try:
            zoneinfo.ZoneInfo(tz_str.strip())
            return True
        except Exception:
            return False

    @classmethod
    def to_utc(cls, local_dt: datetime, source_tz_str: str) -> datetime:
        """
        Converts a local datetime with timezone context to an unambiguous UTC datetime.
        Guarantees that no local timestamp is stored without timezone context.
        """
        tz = cls.get_zone_info(source_tz_str)
        if local_dt.tzinfo is None:
            localized = local_dt.replace(tzinfo=tz)
        else:
            localized = local_dt.astimezone(tz)
        return localized.astimezone(timezone.utc)

    @classmethod
    def to_local(cls, utc_dt: datetime, target_tz_str: str) -> datetime:
        """
        Converts a UTC datetime into the target user's local timezone for display.
        """
        tz = cls.get_zone_info(target_tz_str)
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)
        return utc_dt.astimezone(tz)

    @classmethod
    def format_local(
        cls,
        utc_dt: datetime,
        target_tz_str: str,
        fmt: str = "%Y-%m-%d %H:%M:%S %Z"
    ) -> str:
        """
        Formats a UTC timestamp into a user-friendly local string with timezone abbreviation.
        Example: "2026-08-23 13:50:41 IST" or "2026-08-23 09:20:41 BST"
        """
        local_dt = cls.to_local(utc_dt, target_tz_str)
        return local_dt.strftime(fmt)

    @classmethod
    def build_dual_timezone_view(
        cls,
        utc_dt: datetime,
        parent_tz_str: str = "Asia/Kolkata",
        coordinator_tz_str: str = "Europe/London",
        fmt: str = "%Y-%m-%d %H:%M:%S %Z"
    ) -> DualTimezoneView:
        """
        Constructs a cross-border dual timezone view between Parent and Coordinator.
        Example: Parent (Asia/Kolkata) and Coordinator (Europe/London).
        """
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)

        parent_local_dt = cls.to_local(utc_dt, parent_tz_str)
        coord_local_dt = cls.to_local(utc_dt, coordinator_tz_str)

        # Calculate time difference in hours (Parent - Coordinator)
        parent_offset = parent_local_dt.utcoffset().total_seconds() if parent_local_dt.utcoffset() else 0
        coord_offset = coord_local_dt.utcoffset().total_seconds() if coord_local_dt.utcoffset() else 0
        diff_hours = round((parent_offset - coord_offset) / 3600.0, 2)

        return DualTimezoneView(
            utc_timestamp=utc_dt,
            utc_iso=utc_dt.isoformat(),
            parent_timezone=parent_tz_str,
            parent_local_time=parent_local_dt.strftime(fmt),
            coordinator_timezone=coordinator_tz_str,
            coordinator_local_time=coord_local_dt.strftime(fmt),
            time_difference_hours=diff_hours
        )
