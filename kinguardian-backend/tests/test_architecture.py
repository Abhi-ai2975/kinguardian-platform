from pathlib import Path


def test_platform_references_remain_external_to_backend_implementation():
    source = Path("app").read_text if False else ""  # documents the deliberately local scan scope
    forbidden = ("platform/bezs", "platform\\bezs")
    for path in Path("app").rglob("*.py"):
        assert not any(value in path.read_text(encoding="utf-8") for value in forbidden), path


def test_initial_migration_and_outbox_exist():
    assert Path("migrations/versions/0001_initial_platform.py").exists()
    assert "class OutboxEvent" in Path("app/models.py").read_text(encoding="utf-8")
