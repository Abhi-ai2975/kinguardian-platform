"""
Open Wearables Deployment & Schema Isolation Test Suite.

Verifies:
1. Deployment Topology:
   - drgodly-api
   - open-wearables (separate service)
   - postgres (isolated databases)
   - redis
   - workers
2. Strict Schema & Database Isolation:
   - KinGuardian connects to `kinguardian_db`.
   - Open Wearables connects to `open_wearables_db`.
   - Avoid sharing Open Wearables' PostgreSQL schema with KinGuardian.
"""

import pytest
import os
import yaml


def test_docker_compose_deployment_topology_and_schema_isolation():
    """
    Parses docker-compose.dev.yml to verify separate service architecture
    and strict database / schema isolation.
    """
    compose_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker-compose.dev.yml")
    assert os.path.exists(compose_path), f"docker-compose.dev.yml not found at {compose_path}"

    with open(compose_path, "r") as f:
        compose_config = yaml.safe_load(f)

    services = compose_config.get("services", {})

    # 1. Verify all 5 core topology services exist
    assert "api" in services or "drgodly-api" in services
    assert "open-wearables" in services
    assert "postgres" in services
    assert "redis" in services
    assert "worker" in services

    # 2. Verify Open Wearables is deployed as a separate service
    open_wearables_svc = services["open-wearables"]
    assert open_wearables_svc["container_name"] == "drgodly-open-wearables"
    assert "8007:8000" in open_wearables_svc["ports"]

    # 3. CRITICAL INVARIANT: Avoid sharing Open Wearables' PostgreSQL schema with KinGuardian
    kinguardian_db_url = services["api"]["environment"]["DATABASE_URL"]
    open_wearables_db_url = open_wearables_svc["environment"]["DATABASE_URL"]

    assert ("kinguardian_db" in kinguardian_db_url or "kinguardian_db" in kinguardian_db_url)
    assert "open_wearables_db" in open_wearables_db_url
    assert kinguardian_db_url != open_wearables_db_url, "KinGuardian and Open Wearables must not share PostgreSQL databases"


    # 4. Multi-database init script mounted on Postgres
    postgres_volumes = services["postgres"]["volumes"]
    has_init_script = any("init-multi-postgres.sh" in str(v) for v in postgres_volumes)
    assert has_init_script is True, "Postgres service must mount init-multi-postgres.sh to provision isolated databases"
