"""
Production Circuit Breaker Module.
Protects the platform against cascading failures across critical external dependencies:
1. FHIR / EMR Gateway: Fast-degrades clinical sections to in-memory/cached payloads during outages.
2. FileNest WORM Storage: Fast-fails upload/download queries during storage partitions.
3. AI Agent Service: Prevents thread starvation by fast-failing directly to safe fallback clinical advice.
4. Notification Provider: Fast-routes outbound alerts to persistent intent queue for asynchronous retry.

States:
- CLOSED: Requests execute normally. Consecutive failures increment error counter.
- OPEN: Failure threshold exceeded. Inbound requests immediately raise CircuitBreakerOpenError or trigger fallback.
- HALF_OPEN: Recovery timer elapsed. A limited number of probe requests are permitted to test upstream recovery.
"""

import asyncio
import time
from enum import Enum
from typing import Dict, Any, Optional, Callable, Awaitable, TypeVar, Set, Type
from dataclasses import dataclass, field

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenError(Exception):
    """Raised when an execution is attempted while the circuit is in the OPEN state."""

    def __init__(self, service_name: str, retry_after_seconds: float):
        self.service_name = service_name
        self.retry_after_seconds = retry_after_seconds
        super().__init__(
            f"Circuit breaker for service '{service_name}' is OPEN. "
            f"Upstream service is currently unavailable. Retry after {retry_after_seconds:.1f}s."
        )


@dataclass
class CircuitBreakerConfig:
    """Configuration parameters for a Circuit Breaker instance."""
    failure_threshold: int = 5                  # Consecutive failures required to open circuit
    recovery_timeout_seconds: float = 30.0     # Time spent in OPEN before transitioning to HALF_OPEN
    half_open_success_threshold: int = 2        # Consecutive successes in HALF_OPEN to close circuit
    excluded_exceptions: Set[Type[Exception]] = field(default_factory=set)


class CircuitBreaker:
    """
    Thread-safe, asynchronous circuit breaker instance for a named external dependency.
    """

    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._state: CircuitState = CircuitState.CLOSED
        self._consecutive_failures: int = 0
        self._consecutive_successes: int = 0
        self._opened_at: Optional[float] = None
        self._last_state_change: float = time.time()
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Returns the current state, evaluating automatic OPEN -> HALF_OPEN transitions."""
        if self._state == CircuitState.OPEN and self._opened_at:
            if time.time() - self._opened_at >= self.config.recovery_timeout_seconds:
                return CircuitState.HALF_OPEN
        return self._state

    @property
    def time_until_retry(self) -> float:
        """Seconds remaining before half-open probing is permitted."""
        if self._state == CircuitState.OPEN and self._opened_at:
            elapsed = time.time() - self._opened_at
            return max(0.0, self.config.recovery_timeout_seconds - elapsed)
        return 0.0

    async def _transition_to(self, new_state: CircuitState):
        """Transitions to a new state and updates metrics/logs."""
        if self._state != new_state:
            old_state = self._state
            self._state = new_state
            self._last_state_change = time.time()
            if new_state == CircuitState.OPEN:
                self._opened_at = time.time()
                self._consecutive_successes = 0
                logger.error(
                    f"[CircuitBreaker:{self.name}] Transitioned {old_state} -> OPEN. "
                    f"Failures exceeded threshold ({self.config.failure_threshold}). "
                    f"Probing in {self.config.recovery_timeout_seconds}s."
                )
            elif new_state == CircuitState.HALF_OPEN:
                self._consecutive_successes = 0
                logger.info(
                    f"[CircuitBreaker:{self.name}] Transitioned {old_state} -> HALF_OPEN. "
                    f"Permitting probe executions (success threshold: {self.config.half_open_success_threshold})."
                )
            elif new_state == CircuitState.CLOSED:
                self._opened_at = None
                self._consecutive_failures = 0
                self._consecutive_successes = 0
                logger.info(
                    f"[CircuitBreaker:{self.name}] Transitioned {old_state} -> CLOSED. "
                    f"Upstream dependency has fully recovered."
                )

    async def call(
        self,
        func: Callable[..., Awaitable[T]],
        *args: Any,
        fallback: Optional[Callable[..., Awaitable[T]]] = None,
        **kwargs: Any
    ) -> T:
        """
        Executes the async function through the circuit breaker.
        If OPEN, immediately invokes fallback or raises CircuitBreakerOpenError.
        """
        current_state = self.state

        if current_state == CircuitState.OPEN:
            if fallback is not None:
                logger.debug(f"[CircuitBreaker:{self.name}] Circuit is OPEN. Executing fallback.")
                return await fallback(*args, **kwargs)
            raise CircuitBreakerOpenError(self.name, self.time_until_retry)

        # Transition to HALF_OPEN if time elapsed
        if current_state == CircuitState.HALF_OPEN and self._state == CircuitState.OPEN:
            async with self._lock:
                await self._transition_to(CircuitState.HALF_OPEN)

        try:
            result = await func(*args, **kwargs)
            await self._record_success()
            return result
        except Exception as exc:
            # Check if exception is excluded (e.g. business logic/validation errors)
            if any(isinstance(exc, exc_type) for exc_type in self.config.excluded_exceptions):
                raise exc

            await self._record_failure(exc)
            if fallback is not None:
                logger.warning(
                    f"[CircuitBreaker:{self.name}] Upstream call failed ({exc}). Executing fallback."
                )
                return await fallback(*args, **kwargs)
            raise exc

    async def _record_success(self):
        """Records a successful upstream call."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._consecutive_successes += 1
                if self._consecutive_successes >= self.config.half_open_success_threshold:
                    await self._transition_to(CircuitState.CLOSED)
            elif self._state == CircuitState.CLOSED:
                self._consecutive_failures = 0

    async def _record_failure(self, exc: Exception):
        """Records an upstream failure."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                # Any failure in half-open immediately re-opens the circuit
                logger.warning(
                    f"[CircuitBreaker:{self.name}] Probe failed in HALF_OPEN state ({exc}). Re-opening circuit."
                )
                await self._transition_to(CircuitState.OPEN)
            elif self._state == CircuitState.CLOSED:
                self._consecutive_failures += 1
                if self._consecutive_failures >= self.config.failure_threshold:
                    await self._transition_to(CircuitState.OPEN)

    def get_status(self) -> Dict[str, Any]:
        """Returns snapshot diagnostics for telemetry and health dashboards."""
        return {
            "name": self.name,
            "state": self.state.value,
            "consecutive_failures": self._consecutive_failures,
            "consecutive_successes": self._consecutive_successes,
            "failure_threshold": self.config.failure_threshold,
            "recovery_timeout_seconds": self.config.recovery_timeout_seconds,
            "time_until_retry": self.time_until_retry
        }


class CircuitBreakerRegistry:
    """
    Central registry for managing and inspecting named CircuitBreakers across services.
    """
    _breakers: Dict[str, CircuitBreaker] = {}

    @classmethod
    def get(
        cls,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Retrieves or registers a named CircuitBreaker."""
        if name not in cls._breakers:
            cls._breakers[name] = CircuitBreaker(name, config)
        return cls._breakers[name]

    @classmethod
    def get_all_statuses(cls) -> Dict[str, Dict[str, Any]]:
        """Returns the health and status of all registered circuit breakers."""
        return {name: cb.get_status() for name, cb in cls._breakers.items()}

    @classmethod
    def reset_all(cls):
        """Resets all circuit breakers to CLOSED (for testing)."""
        for cb in cls._breakers.values():
            cb._state = CircuitState.CLOSED
            cb._consecutive_failures = 0
            cb._consecutive_successes = 0
            cb._opened_at = None


# Pre-configured circuit breakers for critical external boundaries
fhir_circuit_breaker = CircuitBreakerRegistry.get(
    "fhir_service",
    CircuitBreakerConfig(failure_threshold=4, recovery_timeout_seconds=20.0, half_open_success_threshold=2)
)

filenest_circuit_breaker = CircuitBreakerRegistry.get(
    "filenest_service",
    CircuitBreakerConfig(failure_threshold=5, recovery_timeout_seconds=30.0, half_open_success_threshold=2)
)

agent_circuit_breaker = CircuitBreakerRegistry.get(
    "agent_service",
    CircuitBreakerConfig(failure_threshold=3, recovery_timeout_seconds=15.0, half_open_success_threshold=1)
)

notification_circuit_breaker = CircuitBreakerRegistry.get(
    "notification_provider",
    CircuitBreakerConfig(failure_threshold=5, recovery_timeout_seconds=30.0, half_open_success_threshold=2)
)
