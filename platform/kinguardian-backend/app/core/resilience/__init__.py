"""
Resilience & Graceful Failure Handling Package.
"""

from app.core.resilience.failure_handling import (
    SAFE_AI_FALLBACK_MESSAGE,
    ResilientFHIRHandler,
    ResilientNotificationHandler,
    ResilientAIHandler
)

__all__ = [
    "SAFE_AI_FALLBACK_MESSAGE",
    "ResilientFHIRHandler",
    "ResilientNotificationHandler",
    "ResilientAIHandler"
]
