"""
Wearable Domain Exceptions & Error Handling.

Security and User Experience Boundary:
If Open Wearables or any upstream wearable provider fails:
1. Do NOT expose the provider error directly (zero technical leak / zero PHI leak).
2. Return standardized error code: `WEARABLE_SERVICE_UNAVAILABLE`.
3. Provide user-friendly, reassuring message:
   “We couldn't update your health data right now. Your connection is still intact.”
"""

from typing import Optional, Dict, Any


class WearableServiceUnavailableError(Exception):
    """
    Raised when Open Wearables or an upstream device provider encounters an outage,
    network timeout, rate limit, or sync failure.

    GUARANTEE:
    - Never exposes raw provider errors (e.g. Garmin 502, Oura 429, OpenWearables internal error) to the client.
    - Error code is always WEARABLE_SERVICE_UNAVAILABLE.
    - Reassures user that their connection remains intact.
    """
    ERROR_CODE = "WEARABLE_SERVICE_UNAVAILABLE"
    USER_FACING_MESSAGE = "We couldn't update your health data right now. Your connection is still intact."

    def __init__(
        self,
        internal_diagnostic: Optional[str] = None,
        provider: Optional[str] = None,
        retryable: bool = True
    ):
        super().__init__(self.USER_FACING_MESSAGE)
        self.error_code = self.ERROR_CODE
        self.user_message = self.USER_FACING_MESSAGE
        self.internal_diagnostic = internal_diagnostic
        self.provider = provider
        self.retryable = retryable

    def to_api_response(self) -> Dict[str, Any]:
        return {
            "error_code": self.error_code,
            "message": self.user_message,
            "retryable": self.retryable,
            "connection_intact": True
        }


class WearableErrorHandler:
    """
    Transforms any internal / upstream wearable failure into the sanitized
    WEARABLE_SERVICE_UNAVAILABLE error response.
    """

    @classmethod
    def sanitize_error(
        cls,
        exc: Exception,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Catches any external or internal exception and returns the safe
        WEARABLE_SERVICE_UNAVAILABLE error envelope without technical technical leakage.
        """
        return {
            "error_code": WearableServiceUnavailableError.ERROR_CODE,
            "message": WearableServiceUnavailableError.USER_FACING_MESSAGE,
            "retryable": True,
            "connection_intact": True
        }
