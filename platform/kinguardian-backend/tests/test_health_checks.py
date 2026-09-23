import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.health import HealthCheckService


@pytest.mark.asyncio
async def test_liveness_probe_endpoint():
    """
    Verifies that GET /health returns fast in-memory status and does NOT depend on downstream systems.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "healthy"]

        assert data["service"] == "kinguardian-backend"
        assert "uptime_seconds" in data
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_readiness_probe_endpoint():
    """
    Verifies that GET /health/ready evaluates PostgreSQL, Redis, and required downstream services.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["service"] == "kinguardian-backend"
        
        # Verify check components
        checks = data["checks"]
        assert "postgresql" in checks
        assert checks["postgresql"]["status"] == "healthy"
        assert "redis" in checks
        assert checks["redis"]["status"] == "healthy"
        assert "downstream" in checks
        assert "iam_jwks" in checks["downstream"]
        assert "emr_core" in checks["downstream"]
        assert "filenest" in checks["downstream"]


@pytest.mark.asyncio
async def test_readiness_probe_failure_on_database_down(monkeypatch):
    """
    Verifies that GET /health/ready returns HTTP 503 if PostgreSQL is unreachable.
    """
    async def mock_failed_db():
        return False, {"status": "unhealthy", "error": "Database connection refused"}

    monkeypatch.setattr(HealthCheckService, "check_database", mock_failed_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["postgresql"]["status"] == "unhealthy"
