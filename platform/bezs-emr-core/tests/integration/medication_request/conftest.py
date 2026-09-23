import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_permissions(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["medication_request:create", "medication_request:read", "medication_request:update", "medication_request:delete"]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
