from app.services import HEALTH_SCOPES


def test_health_scope_vocabulary_is_explicit_and_small():
    assert HEALTH_SCOPES == {"health.summary", "care.tasks", "checkins", "medications", "documents", "messages"}
