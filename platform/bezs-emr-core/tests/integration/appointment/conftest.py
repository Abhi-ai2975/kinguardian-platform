"""Appointment-specific auth setup for integration tests."""

import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_appointment_permissions(client):
    """Grant appointment permissions, plus fixture-friendly patient/practitioner create access."""
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=[
            "appointment:create",
            "appointment:read",
            "appointment:update",
            "appointment:delete",
            "patient:create",
            "patient:read",
            "practitioner:create",
            "practitioner:read",
        ]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
