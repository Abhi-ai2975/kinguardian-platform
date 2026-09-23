import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from fastapi import APIRouter
from app.main import app
from app.core.errors import (
    ErrorCode,
    FamilyNotFoundError,
    SubjectNotFoundError,
    ForbiddenError,
    ConsentRequiredError,
    MedicationNotActiveError,
    AppointmentNotFoundError,
    DocumentNotReadyError,
    AIActionRequiresApprovalError,
    RateLimitedError
)

# Test router to trigger domain exceptions
test_err_router = APIRouter(prefix="/api/v1/test-errors")

@test_err_router.get("/consent-required")
async def trigger_consent_required():
    raise ConsentRequiredError(required_scope="vitals")

@test_err_router.get("/family-not-found")
async def trigger_family_not_found():
    raise FamilyNotFoundError(family_id=uuid.uuid4())

@test_err_router.get("/subject-not-found")
async def trigger_subject_not_found():
    raise SubjectNotFoundError(subject_id=uuid.uuid4())

@test_err_router.get("/forbidden")
async def trigger_forbidden():
    raise ForbiddenError()

@test_err_router.get("/medication-inactive")
async def trigger_medication_inactive():
    raise MedicationNotActiveError()

@test_err_router.get("/appointment-not-found")
async def trigger_appointment_not_found():
    raise AppointmentNotFoundError(appointment_id="appt-12345")

@test_err_router.get("/document-not-ready")
async def trigger_document_not_ready():
    raise DocumentNotReadyError()

@test_err_router.get("/ai-action-approval")
async def trigger_ai_action_approval():
    raise AIActionRequiresApprovalError(action_id=uuid.uuid4())

@test_err_router.get("/rate-limited")
async def trigger_rate_limited():
    raise RateLimitedError()

@test_err_router.get("/unhandled-crash")
async def trigger_unhandled_crash():
    # Deliberate internal unhandled exception
    raise ValueError("Sensitive internal database connection failed: Patient ID #992348")

app.include_router(test_err_router)


@pytest.mark.asyncio
async def test_standardized_error_envelope_consent_required():
    """
    Verifies that ConsentRequiredError returns exact envelope:
    { "error": { "code": "CONSENT_REQUIRED", "message": "...", "request_id": "..." } }
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/test-errors/consent-required", headers={"X-Request-ID": "req-consent-test-01"})
        assert res.status_code == 403
        data = res.json()
        assert "error" in data
        err = data["error"]
        assert err["code"] == "CONSENT_REQUIRED"
        assert "permission to view this health information" in err["message"]
        assert err["request_id"] == "req-consent-test-01"
        assert err["details"] == {"required_scope": "vitals"}


@pytest.mark.asyncio
async def test_domain_specific_error_codes():
    """
    Verifies domain-specific error codes return correctly.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Family Not Found
        r1 = await ac.get("/api/v1/test-errors/family-not-found")
        assert r1.status_code == 404
        assert r1.json()["error"]["code"] == "FAMILY_NOT_FOUND"

        # 2. Subject Not Found
        r2 = await ac.get("/api/v1/test-errors/subject-not-found")
        assert r2.status_code == 404
        assert r2.json()["error"]["code"] == "SUBJECT_NOT_FOUND"

        # 3. Forbidden
        r3 = await ac.get("/api/v1/test-errors/forbidden")
        assert r3.status_code == 403
        assert r3.json()["error"]["code"] == "FORBIDDEN"

        # 4. Medication Not Active
        r4 = await ac.get("/api/v1/test-errors/medication-inactive")
        assert r4.status_code == 400
        assert r4.json()["error"]["code"] == "MEDICATION_NOT_ACTIVE"

        # 5. Appointment Not Found
        r5 = await ac.get("/api/v1/test-errors/appointment-not-found")
        assert r5.status_code == 404
        assert r5.json()["error"]["code"] == "APPOINTMENT_NOT_FOUND"

        # 6. Document Not Ready
        r6 = await ac.get("/api/v1/test-errors/document-not-ready")
        assert r6.status_code == 422
        assert r6.json()["error"]["code"] == "DOCUMENT_NOT_READY"

        # 7. AI Action Requires Approval
        r7 = await ac.get("/api/v1/test-errors/ai-action-approval")
        assert r7.status_code == 400
        assert r7.json()["error"]["code"] == "AI_ACTION_REQUIRES_APPROVAL"

        # 8. Rate Limited
        r8 = await ac.get("/api/v1/test-errors/rate-limited")
        assert r8.status_code == 429
        assert r8.json()["error"]["code"] == "RATE_LIMITED"


@pytest.mark.asyncio
async def test_no_stack_traces_or_phi_in_500_response():
    """
    Verifies that unhandled 500 exceptions NEVER leak stack traces or internal exception messages
    to the client, but still return correlation request IDs.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/test-errors/unhandled-crash", headers={"X-Request-ID": "req-crash-safe-01"})
        assert res.status_code == 500
        data = res.json()
        assert "error" in data
        err = data["error"]
        assert err["code"] == "INTERNAL_SERVER_ERROR"
        assert "internal error occurred" in err["message"]
        assert err["request_id"] == "req-crash-safe-01"

        # CRITICAL: No internal stack trace or patient ID in response
        raw_body = res.text
        assert "Traceback" not in raw_body
        assert "992348" not in raw_body
        assert "ValueError" not in raw_body
