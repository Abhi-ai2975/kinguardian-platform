import pytest
import yaml
from pathlib import Path


def test_docker_compose_dev_structure_and_env_variables():
    """
    Verifies that docker-compose.dev.yml defines all required minimum local development
    services and explicitly passes all requested environment variables.
    """
    backend_dir = Path(__file__).resolve().parent.parent
    compose_file = backend_dir / "docker-compose.dev.yml"
    root_compose_file = backend_dir.parent.parent / "docker-compose.dev.yml"
    env_example = backend_dir / ".env.example"
    dockerfile = backend_dir / "Dockerfile"

    assert compose_file.exists(), "platform/kinguardian-backend/docker-compose.dev.yml must exist"
    assert root_compose_file.exists(), "root docker-compose.dev.yml must exist"
    assert env_example.exists(), ".env.example must exist"
    assert dockerfile.exists(), "Dockerfile must exist"

    # Parse compose YAML
    with open(compose_file, "r", encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    services = compose_data.get("services", {})
    assert "postgres" in services, "Minimum service 'postgres' is missing"
    assert "redis" in services, "Minimum service 'redis' is missing"
    assert "api" in services, "Minimum service 'api' (DrGodly API) is missing"
    assert "worker" in services, "Minimum service 'worker' (DrGodly Worker) is missing"

    # Verify API environment variables
    api_env = services["api"].get("environment", {})
    required_envs = [
        "DATABASE_URL",
        "REDIS_URL",
        "IAM_JWKS_URL",
        "FHIR_API_URL",
        "FHIR_GQL_URL",
        "FILENEST_URL",
        "AGENT_SERVICE_URL",
        "OBSERVABILITY_URL",
    ]

    for env_name in required_envs:
        assert env_name in api_env, f"Environment variable {env_name} is missing from api service in docker-compose.dev.yml"

    # Verify .env.example contains all required environment variables
    env_example_content = env_example.read_text(encoding="utf-8")
    for env_name in required_envs:
        assert env_name in env_example_content, f"Environment variable {env_name} is missing from .env.example"
