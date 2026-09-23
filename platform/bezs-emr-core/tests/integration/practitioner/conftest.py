"""Practitioner-specific auth setup for integration tests."""

import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_practitioner_permissions(client):
    """Give the default test identity practitioner permissions for this package."""
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=[
            "practitioner:create",
            "practitioner:read",
            "practitioner:update",
            "practitioner:delete",
        ]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()

