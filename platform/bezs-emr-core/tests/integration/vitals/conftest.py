import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_permissions(client):
    # Vitals uses get_current_user directly (no require_permission), so just set a valid user
    app.dependency_overrides[get_current_user] = make_test_user()
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
