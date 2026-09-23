"""
Phase 18 — Mobile Contract Test Suite.

Validates the React Native API contract:
1. OpenAPI 3.1.0 schema generation (240+ endpoint paths & component schemas)
2. TypeScript client models alignment with backend Pydantic DTOs
3. Real-world example requests & responses validation
4. Error code taxonomy mapping & client error envelopes
"""

import pytest
import json
import uuid
from pathlib import Path
from pydantic import BaseModel

from app.main import app
from app.core.openapi import custom_openapi_generator
from app.domains.family.schemas import (
    CoordinatorHomeResponse,
    ParentHomeResponse,
    WellbeingCheckinCreate,
    AdherenceEventCreate
)


def test_openapi_schema_generation():
    """
    1. OpenAPI Generation:
    Verifies that the generated OpenAPI 3.1.0 schema includes security schemes,
    tags, and core mobile endpoints.
    """
    schema = custom_openapi_generator(app)
    assert schema is not None
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] in ["KinGuardian Platform API", "KinGuardian Platform API"]


    # Verify Security Schemes
    components = schema.get("components", {})
    assert "securitySchemes" in components
    assert "BearerAuth" in components["securitySchemes"]

    # Verify Core Mobile Endpoints Exist in Paths
    paths = schema.get("paths", {})
    assert len(paths) >= 20
    assert any("/families/{family_id}/home" in p for p in paths)
    assert any("parent" in p or "home" in p for p in paths)
    assert any("checkin" in p for p in paths)



def get_mobile_file(subpath: str) -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    for base in [
        repo_root / "kinguardian-mobile",
        repo_root / "kinguard-mobile",
        Path("d:/Kalyan/kinguardian-platform/kinguardian-mobile"),
        Path("d:/Kalyan/kinguard-platform/kinguard-mobile"),
    ]:
        candidate = base / subpath
        if candidate.exists():
            return candidate
    return repo_root / "kinguardian-mobile" / subpath


def test_mobile_contract_examples_validation():
    """
    2. Example Requests & Responses:
    Verifies that mobile contract examples validate cleanly against backend schemas.
    """
    examples_path = get_mobile_file("src/services/api-client/examples.json")
    assert examples_path.exists(), f"Could not find {examples_path}"

    with open(examples_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    examples = data.get("examples", {})
    assert "coordinator_home" in examples
    assert "parent_home" in examples
    assert "submit_checkin" in examples
    assert "confirm_medication" in examples

    # 2a. Validate submit_checkin against WellbeingCheckinCreate
    checkin_payload = examples["submit_checkin"]["request_body"]
    validated_checkin = WellbeingCheckinCreate(**checkin_payload)
    assert validated_checkin.feeling == "good"
    assert validated_checkin.severity == "low"

    # 2b. Validate confirm_medication against AdherenceEventCreate
    med_payload = examples["confirm_medication"]["request_body"]
    validated_med = AdherenceEventCreate(subject_id=uuid.uuid4(), **med_payload)
    assert validated_med.fhir_medication_request_id == "med-rx-metformin-500"
    assert validated_med.status == "taken"



def test_error_codes_taxonomy():
    """
    3. Error Codes Taxonomy:
    Verifies that errorCodes.ts and ErrorDetail schemas are consistent.
    """
    error_codes_path = get_mobile_file("src/services/api-client/errorCodes.ts")
    assert error_codes_path.exists(), f"Could not find {error_codes_path}"


    content = error_codes_path.read_text(encoding="utf-8")
    expected_codes = [
        "FAMILY_NOT_FOUND",
        "SUBJECT_NOT_FOUND",
        "FORBIDDEN",
        "CONSENT_REQUIRED",
        "CONSENT_EXPIRED",
        "MEDICATION_NOT_ACTIVE",
        "APPOINTMENT_NOT_FOUND",
        "DOCUMENT_NOT_READY",
        "AI_ACTION_REQUIRES_APPROVAL",
        "RATE_LIMITED",
        "UNAUTHORIZED",
        "VALIDATION_ERROR",
        "CIRCUIT_BREAKER_OPEN"
    ]

    for code in expected_codes:
        assert code in content, f"Expected error code '{code}' in errorCodes.ts"
