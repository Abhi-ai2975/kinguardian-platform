from typing import List, Optional, Dict, Any
from datetime import datetime, time
from zoneinfo import ZoneInfo

from app.core.logging import get_logger

logger = get_logger(__name__)


class NotificationPolicy:
    """
    Notification Policy:
    Determines delivery channels, quiet hours rules, and priority overrides for notifications.
    """

    # Priority to default channels mapping
    PRIORITY_CHANNELS = {
        "critical": ["in_app", "push", "sms"],
        "high": ["in_app", "push"],
        "normal": ["in_app", "push"],
        "low": ["in_app"]
    }

    @staticmethod
    def is_in_quiet_hours(
        recipient_timezone: Optional[str] = None,
        quiet_start_hour: int = 22,  # 10:00 PM
        quiet_end_hour: int = 7      # 07:00 AM
    ) -> bool:
        """
        Calculates if the current local time for recipient is within quiet hours.
        """
        if not recipient_timezone:
            return False
        try:
            tz = ZoneInfo(recipient_timezone)
            local_now = datetime.now(tz)
            hour = local_now.hour

            if quiet_start_hour > quiet_end_hour:
                # Spans across midnight (e.g. 22:00 -> 07:00)
                return hour >= quiet_start_hour or hour < quiet_end_hour
            else:
                return quiet_start_hour <= hour < quiet_end_hour
        except Exception as e:
            logger.warning(f"Failed to calculate quiet hours for tz {recipient_timezone}: {e}")
            return False

    @classmethod
    def resolve_delivery_channels(
        cls,
        priority: str = "normal",
        recipient_timezone: Optional[str] = None,
        user_channel_preferences: Optional[Dict[str, bool]] = None,
        force_in_app_only: bool = False
    ) -> List[str]:
        """
        Determines the list of channels to dispatch this notification to.
        - Critical notifications bypass quiet hours and activate emergency channels (in_app, push, sms).
        - Non-critical notifications adhere to quiet hours and user channel toggles.
        """
        priority_norm = priority.lower().strip()
        default_channels = cls.PRIORITY_CHANNELS.get(priority_norm, ["in_app", "push"])

        if force_in_app_only:
            return ["in_app"]

        # Critical priority overrides quiet hours
        if priority_norm == "critical":
            return default_channels

        # Check quiet hours for recipient
        in_quiet = cls.is_in_quiet_hours(recipient_timezone)
        if in_quiet:
            logger.info(f"Recipient in quiet hours ({recipient_timezone}). Downgrading to in-app only.")
            return ["in_app"]

        # Filter by user preferences if configured
        if user_channel_preferences:
            active_channels = [
                ch for ch in default_channels
                if user_channel_preferences.get(ch, True) is not False
            ]
            # In-App is always preserved
            if "in_app" not in active_channels:
                active_channels.insert(0, "in_app")
            return active_channels

        return default_channels
