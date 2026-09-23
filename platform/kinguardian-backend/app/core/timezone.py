from datetime import datetime
from typing import Dict
import zoneinfo


def format_dual_timezone(
    utc_dt: datetime,
    parent_tz_str: str = "Asia/Kolkata",
    coordinator_tz_str: str = "America/New_York"
) -> Dict[str, str]:
    """
    Takes a UTC datetime and localized timezone strings.
    Returns a dict with localized string representations for display.
    """
    # Ensure datetime has timezone info, fallback to UTC if not
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=zoneinfo.ZoneInfo("UTC"))

    try:
        parent_tz = zoneinfo.ZoneInfo(parent_tz_str)
    except Exception:
        parent_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    try:
        coordinator_tz = zoneinfo.ZoneInfo(coordinator_tz_str)
    except Exception:
        coordinator_tz = zoneinfo.ZoneInfo("America/New_York")

    # Localize
    parent_dt = utc_dt.astimezone(parent_tz)
    coordinator_dt = utc_dt.astimezone(coordinator_tz)

    # Format strings nicely, e.g. "2026-08-23 00:06:40 IST"
    fmt = "%Y-%m-%d %H:%M:%S %Z"

    return {
        "parent_local_time": parent_dt.strftime(fmt),
        "coordinator_local_time": coordinator_dt.strftime(fmt),
        "parent_timezone": parent_tz_str,
        "coordinator_timezone": coordinator_tz_str
    }
