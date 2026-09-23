"""Shared assertion helpers for FHIR patient responses."""


def assert_plain_patient(data: dict, **expected) -> None:
    """Assert fields on a plain (snake_case) patient response."""
    assert data.get("id") is not None, "plain response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected patient.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_fhir_patient(data: dict, **expected) -> None:
    """Assert fields on a FHIR patient response."""
    assert data.get("resourceType") == "Patient", (
        f"expected resourceType=Patient, got {data.get('resourceType')!r}"
    )
    assert data.get("id") is not None, "FHIR response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected patient.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_plain_practitioner(data: dict, **expected) -> None:
    """Assert fields on a plain (snake_case) practitioner response."""
    assert data.get("id") is not None, "plain response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected practitioner.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_fhir_practitioner(data: dict, **expected) -> None:
    """Assert fields on a FHIR practitioner response."""
    assert data.get("resourceType") == "Practitioner", (
        f"expected resourceType=Practitioner, got {data.get('resourceType')!r}"
    )
    assert data.get("id") is not None, "FHIR response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected practitioner.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_plain_appointment(data: dict, **expected) -> None:
    """Assert fields on a plain (snake_case) appointment response."""
    assert data.get("id") is not None, "plain response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected appointment.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_fhir_appointment(data: dict, **expected) -> None:
    """Assert fields on a FHIR appointment response."""
    assert data.get("resourceType") == "Appointment", (
        f"expected resourceType=Appointment, got {data.get('resourceType')!r}"
    )
    assert data.get("id") is not None, "FHIR response must have 'id'"
    for field, value in expected.items():
        assert data.get(field) == value, (
            f"expected appointment.{field}={value!r}, got {data.get(field)!r}"
        )


def assert_paginated(data: dict, *, min_total: int = 1) -> None:
    """Assert structure of a plain paginated list response."""
    assert "total" in data, "paginated response must have 'total'"
    assert "limit" in data, "paginated response must have 'limit'"
    assert "offset" in data, "paginated response must have 'offset'"
    assert "data" in data, "paginated response must have 'data'"
    assert isinstance(data["data"], list), "'data' must be a list"
    assert data["total"] >= min_total, (
        f"expected total >= {min_total}, got {data['total']}"
    )


def assert_fhir_bundle(data: dict, *, min_total: int = 1) -> None:
    """Assert structure of a FHIR Bundle response."""
    assert data.get("resourceType") == "Bundle", (
        f"expected resourceType=Bundle, got {data.get('resourceType')!r}"
    )
    assert data.get("type") == "searchset"
    assert "entry" in data, "Bundle must have 'entry'"
    assert isinstance(data["entry"], list)
    assert data.get("total", 0) >= min_total, (
        f"expected total >= {min_total}, got {data.get('total')}"
    )


def assert_operation_outcome(data: dict, expected_status: int, response_status: int) -> None:
    """Assert that an error response is a valid FHIR OperationOutcome."""
    assert response_status == expected_status, (
        f"expected HTTP {expected_status}, got {response_status}"
    )
    assert data.get("resourceType") == "OperationOutcome", (
        f"expected OperationOutcome, got {data.get('resourceType')!r}"
    )
    assert len(data.get("issue", [])) > 0, "OperationOutcome must have at least one issue"
