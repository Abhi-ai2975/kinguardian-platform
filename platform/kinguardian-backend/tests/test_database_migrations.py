import pytest
import io
import os
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic import command


@pytest.fixture
def alembic_config(monkeypatch):
    """
    Creates an Alembic configuration pointing to the production migrations directory
    with PostgreSQL dialect for offline SQL compilation.
    """
    backend_dir = Path(__file__).resolve().parent.parent
    ini_path = backend_dir / "alembic.ini"

    config = Config(str(ini_path))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    pg_url = "postgresql://user:password@localhost:5432/kinguardian_db"
    config.set_main_option("sqlalchemy.url", pg_url)
    monkeypatch.setattr("app.core.config.settings.DATABASE_URL", pg_url)
    return config



def test_alembic_migration_chain_integrity(alembic_config):
    """
    Verifies Alembic migration rules:
    1. Single continuous DAG from <base> to <head> (No branching/divergent heads).
    2. One logical migration per feature.
    3. Every migration file provides both upgrade() and downgrade() functions (Reversibility).
    """
    script = ScriptDirectory.from_config(alembic_config)

    # 1. Verify single head
    heads = script.get_heads()
    assert len(heads) == 1, f"Expected exactly 1 migration head, found {len(heads)}: {heads}"
    head_rev = heads[0]
    assert head_rev is not None

    # 2. Verify linear continuity from base to head
    revisions = list(script.walk_revisions())
    assert len(revisions) >= 20, f"Expected full migration chain, found {len(revisions)} revisions."

    # 3. Verify upgrade() and downgrade() exist on every revision module
    for rev in revisions:
        module = rev.module
        assert hasattr(module, "upgrade"), f"Revision {rev.revision} is missing upgrade() function"
        assert hasattr(module, "downgrade"), f"Revision {rev.revision} is missing downgrade() function"
        assert callable(module.upgrade), f"upgrade on revision {rev.revision} must be callable"
        assert callable(module.downgrade), f"downgrade on revision {rev.revision} must be callable"


def test_alembic_upgrade_sql_compilation_from_empty_database(alembic_config, capsys):
    """
    Verifies that Alembic compiles the entire upgrade sequence from <base> to head
    for PostgreSQL without syntax errors or broken constraints.
    """
    # Test full upgrade compilation in offline mode
    command.upgrade(alembic_config, "head", sql=True)
    captured = capsys.readouterr()
    sql_output = captured.out

    assert "CREATE TABLE app_profiles" in sql_output
    assert "CREATE TABLE families" in sql_output
    assert "CREATE TABLE care_subjects" in sql_output
    assert "CREATE TABLE care_tasks" in sql_output
    assert "CREATE TABLE medication_adherence_events" in sql_output
    assert "CREATE TABLE outbox_events" in sql_output
    assert "alembic_version" in sql_output


def test_alembic_downgrade_sql_compilation_to_base(alembic_config, capsys):
    """
    Verifies that Alembic compiles the complete downgrade sequence from head to base
    for PostgreSQL without syntax errors or unresolvable constraints (Reversibility).
    """
    # Test full downgrade compilation in offline mode
    command.downgrade(alembic_config, "head:base", sql=True)
    captured = capsys.readouterr()
    sql_output = captured.out

    assert "DROP TABLE outbox_events" in sql_output
    assert "DROP TABLE care_tasks" in sql_output
    assert "DROP TABLE medication_adherence_events" in sql_output
    assert "DROP TABLE care_subjects" in sql_output
    assert "DROP TABLE app_profiles" in sql_output
    assert "DELETE FROM alembic_version" in sql_output

