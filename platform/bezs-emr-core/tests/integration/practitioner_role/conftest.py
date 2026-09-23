import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_permissions(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["practitioner_role:create", "practitioner_role:read", "practitioner_role:update", "practitioner_role:delete"]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
