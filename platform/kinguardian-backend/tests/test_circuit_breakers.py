"""
Circuit Breaker Architecture & Resilience Tests.
Validates:
1. Closed -> Open state transition on consecutive failure threshold.
2. Fast-fail behavior in Open state (rejecting calls without hitting downstream).
3. Open -> Half-Open state transition after recovery timeout.
4. Half-Open -> Closed state transition on probe successes.
5. Half-Open -> Open state transition on probe failure.
6. Graceful fallback execution when circuit is Open.
7. Health diagnostics reporting via CircuitBreakerRegistry.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock
from app.core.resilience.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitBreakerOpenError,
    CircuitBreakerRegistry,
    fhir_circuit_breaker,
    agent_circuit_breaker
)


@pytest.fixture(autouse=True)
def reset_all_circuits():
    """Ensures a clean closed circuit breaker state before each test."""
    CircuitBreakerRegistry.reset_all()


@pytest.mark.asyncio
async def test_circuit_breaker_transitions_to_open_on_failures():
    """
    Verifies circuit transitions from CLOSED -> OPEN when consecutive failures exceed threshold.
    """
    config = CircuitBreakerConfig(
        failure_threshold=3,
        recovery_timeout_seconds=5.0,
        half_open_success_threshold=2
    )
    cb = CircuitBreaker("test_service", config)

    assert cb.state == CircuitState.CLOSED

    failing_func = AsyncMock(side_effect=RuntimeError("Downstream DB connection lost"))

    # Failures 1 and 2: Circuit remains CLOSED
    with pytest.raises(RuntimeError):
        await cb.call(failing_func)
    assert cb.state == CircuitState.CLOSED

    with pytest.raises(RuntimeError):
        await cb.call(failing_func)
    assert cb.state == CircuitState.CLOSED

    # Failure 3: Exceeds threshold (3) -> Transitions to OPEN
    with pytest.raises(RuntimeError):
        await cb.call(failing_func)

    assert cb.state == CircuitState.OPEN
    assert cb.time_until_retry > 0


@pytest.mark.asyncio
async def test_circuit_breaker_fast_fails_when_open():
    """
    Verifies that when OPEN, the circuit fast-fails immediately with CircuitBreakerOpenError
    without invoking the downstream target function.
    """
    config = CircuitBreakerConfig(failure_threshold=2, recovery_timeout_seconds=10.0)
    cb = CircuitBreaker("payment_service", config)

    target_mock = AsyncMock(side_effect=RuntimeError("Gateway Timeout"))

    # Trip the circuit breaker
    for _ in range(2):
        with pytest.raises(RuntimeError):
            await cb.call(target_mock)

    assert cb.state == CircuitState.OPEN
    call_count_before = target_mock.call_count

    # In OPEN state, calls should raise CircuitBreakerOpenError FAST without invoking downstream
    with pytest.raises(CircuitBreakerOpenError) as exc_info:
        await cb.call(target_mock)

    assert "payment_service" in str(exc_info.value)
    # Downstream target mock was NOT called again
    assert target_mock.call_count == call_count_before


@pytest.mark.asyncio
async def test_circuit_breaker_fallback_execution():
    """
    Verifies that when a fallback is provided, an OPEN circuit executes fallback seamlessly.
    """
    config = CircuitBreakerConfig(failure_threshold=1, recovery_timeout_seconds=10.0)
    cb = CircuitBreaker("ai_inference", config)

    # Trip the breaker
    with pytest.raises(RuntimeError):
        await cb.call(AsyncMock(side_effect=RuntimeError("GPU OOM")))

    assert cb.state == CircuitState.OPEN

    fallback_mock = AsyncMock(return_value={"insight": "Safe fallback summary", "is_fallback": True})
    downstream_mock = AsyncMock()

    result = await cb.call(downstream_mock, fallback=fallback_mock)

    assert result["is_fallback"] is True
    assert fallback_mock.call_count == 1
    assert downstream_mock.call_count == 0


@pytest.mark.asyncio
async def test_circuit_breaker_recovery_flow():
    """
    Verifies recovery flow:
    CLOSED -> OPEN (after failures) -> HALF_OPEN (after timeout) -> CLOSED (after probe successes)
    """
    config = CircuitBreakerConfig(
        failure_threshold=2,
        recovery_timeout_seconds=0.1,  # Fast 100ms recovery window for test
        half_open_success_threshold=2
    )
    cb = CircuitBreaker("emr_service", config)

    # 1. Trip to OPEN
    for _ in range(2):
        with pytest.raises(RuntimeError):
            await cb.call(AsyncMock(side_effect=RuntimeError("EMR unavailable")))
    assert cb.state == CircuitState.OPEN

    # 2. Wait for recovery timeout
    await asyncio.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # 3. Successful probe 1 -> still in HALF_OPEN
    success_mock = AsyncMock(return_value="EMR Patient Data")
    res1 = await cb.call(success_mock)
    assert res1 == "EMR Patient Data"
    assert cb.state == CircuitState.HALF_OPEN

    # 4. Successful probe 2 (reaches success threshold 2) -> Transitions back to CLOSED
    res2 = await cb.call(success_mock)
    assert res2 == "EMR Patient Data"
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_circuit_breaker_probe_failure_reopens():
    """
    Verifies that a failure during the HALF_OPEN probe window immediately transitions back to OPEN.
    """
    config = CircuitBreakerConfig(
        failure_threshold=1,
        recovery_timeout_seconds=0.1,
        half_open_success_threshold=2
    )
    cb = CircuitBreaker("filenest_service", config)

    # 1. Trip to OPEN
    with pytest.raises(RuntimeError):
        await cb.call(AsyncMock(side_effect=RuntimeError("Disk I/O Error")))

    assert cb.state == CircuitState.OPEN

    # 2. Wait for HALF_OPEN
    await asyncio.sleep(0.15)
    assert cb.state == CircuitState.HALF_OPEN

    # 3. Probe fails
    with pytest.raises(RuntimeError):
        await cb.call(AsyncMock(side_effect=RuntimeError("Still Down")))

    # MUST immediately re-open
    assert cb.state == CircuitState.OPEN


def test_circuit_breaker_registry_diagnostics():
    """
    Verifies CircuitBreakerRegistry collects telemetry diagnostics across all breakers.
    """
    statuses = CircuitBreakerRegistry.get_all_statuses()
    assert "fhir_service" in statuses
    assert "filenest_service" in statuses
    assert "agent_service" in statuses
    assert "notification_provider" in statuses

    assert statuses["fhir_service"]["state"] == "CLOSED"
    assert statuses["agent_service"]["failure_threshold"] == 3
