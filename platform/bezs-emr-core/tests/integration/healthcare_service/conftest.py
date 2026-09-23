import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_permissions(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["healthcare_service:create", "healthcare_service:read", "healthcare_service:update", "healthcare_service:delete"]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
