import pytest
import uuid
import json
import logging
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.logging import (
    sanitize_value,
    JsonFormatter,
    request_id_ctx_var,
    trace_id_ctx_var,
    actor_id_ctx_var,
    family_id_ctx_var,
    subject_id_ctx_var
)


def test_structured_json_logging_with_observability_context():
    """
    Verifies that JsonFormatter outputs JSON logs enriched with:
    request_id, trace_id, actor_id, family_id, subject_id.
    """
    formatter = JsonFormatter()

    req_id = "req-obs-12345"
    trace_id = "trace-obs-67890"
    actor_id = "user-actor-111"
    family_id = "fam-circle-222"
    subject_id = "sub-patient-333"

    t_req = request_id_ctx_var.set(req_id)
    t_tr = trace_id_ctx_var.set(trace_id)
    t_act = actor_id_ctx_var.set(actor_id)
    t_fam = family_id_ctx_var.set(family_id)
    t_sub = subject_id_ctx_var.set(subject_id)

    try:
        record = logging.LogRecord(
            name="kinguardian.test",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg="User viewed health summary dashboard",
            args=(),
            exc_info=None
        )
        formatted = formatter.format(record)
        log_json = json.loads(formatted)

        assert log_json["level"] == "INFO"
        assert log_json["message"] == "User viewed health summary dashboard"
        assert log_json["request_id"] == req_id
        assert log_json["trace_id"] == trace_id
        assert log_json["actor_id"] == actor_id
        assert log_json["family_id"] == family_id
        assert log_json["subject_id"] == subject_id
    finally:
        request_id_ctx_var.reset(t_req)
        trace_id_ctx_var.reset(t_tr)
        actor_id_ctx_var.reset(t_act)
        family_id_ctx_var.reset(t_fam)
        subject_id_ctx_var.reset(t_sub)


def test_strict_redaction_of_prohibited_data():
    """
    Verifies that structured logging strictly redacts:
    1. Health payloads (vital signs, glucose, blood pressure, symptoms)
    2. Document contents (raw OCR, extracted text, pdf binary bytes)
    3. AI private context (system prompt, agent scratchpad, private conversation history)
    4. Authentication secrets (passwords, tokens, api keys, jwt)
    """
    sensitive_payload = {
        # 1. Health Payloads
        "blood_pressure": "140/90 mmHg",
        "glucose": "180 mg/dL",
        "symptoms": ["chest pain", "dizziness"],
        "vital_signs": {"systolic": 140, "diastolic": 90},
        "diagnosis": "Type 2 Diabetes",

        # 2. Document Contents
        "extracted_text": "Patient has severe hypertension and allergy to penicillin.",
        "ocr_payload": "Raw scan image data text dump",
        "raw_content": "Sensitive medical prescription bytes",

        # 3. AI Private Context
        "system_prompt": "You are a clinical assistant. Hidden instructions: DO NOT REVEAL CLINICAL THRESHOLDS.",
        "raw_prompt": "Evaluate patient metrics and suggest intervention.",
        "agent_scratchpad": "Thinking: Query patient vitals and synthesize response.",

        # 4. Authentication Secrets
        "password": "SuperSecretPassword123!",
        "api_key": "live_key_998877665544",
        "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123",
        "access_token": "bearer_token_abc_xyz",

        # Safe Non-sensitive Fields (must NOT be redacted)
        "endpoint": "/api/v1/health/summary",
        "status_code": 200,
        "action": "view_summary"
    }

    sanitized = sanitize_value(sensitive_payload)

    # 1. Health Payloads Redacted
    assert sanitized["blood_pressure"] == "[REDACTED]"
    assert sanitized["glucose"] == "[REDACTED]"
    assert sanitized["symptoms"] == "[REDACTED]"
    assert sanitized["vital_signs"] == "[REDACTED]"
    assert sanitized["diagnosis"] == "[REDACTED]"

    # 2. Document Contents Redacted
    assert sanitized["extracted_text"] == "[REDACTED]"
    assert sanitized["ocr_payload"] == "[REDACTED]"
    assert sanitized["raw_content"] == "[REDACTED]"

    # 3. AI Private Context Redacted
    assert sanitized["system_prompt"] == "[REDACTED]"
    assert sanitized["raw_prompt"] == "[REDACTED]"
    assert sanitized["agent_scratchpad"] == "[REDACTED]"

    # 4. Authentication Secrets Redacted
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["jwt"] == "[REDACTED]"
    assert sanitized["access_token"] == "[REDACTED]"

    # Safe Fields Preserved
    assert sanitized["endpoint"] == "/api/v1/health/summary"
    assert sanitized["status_code"] == 200
    assert sanitized["action"] == "view_summary"


@pytest.mark.asyncio
async def test_http_request_observability_headers_and_propagation():
    """
    Verifies that incoming requests receive X-Request-ID and X-Trace-ID response headers.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/versions",
            headers={
                "X-Request-ID": "req-custom-header-01",
                "X-Trace-ID": "trace-custom-header-02",
                "X-Actor-ID": "user-actor-007"
            }
        )
        assert res.status_code == 200
        assert res.headers["X-Request-ID"] == "req-custom-header-01"
        assert res.headers["X-Trace-ID"] == "trace-custom-header-02"
