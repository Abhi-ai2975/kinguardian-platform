import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_permissions(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=[
            "audit_event:create",
            "audit_event:read",
            "audit_event:update",
            "audit_event:delete",
        ]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
