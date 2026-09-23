import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.versioning import VersionRegistry, APIVersion


def test_api_version_registry():
    """
    Verifies that /api/v1 is marked as active, /api/v2 is registered for future breaking changes,
    and domain services are decoupled from HTTP routing prefixes.
    """
    versions = VersionRegistry.get_supported_versions()
    assert len(versions) >= 2

    v1 = VersionRegistry.get_version_info(APIVersion.V1)
    assert v1.version == "v1"
    assert v1.status == "active"
    assert v1.prefix == "/api/v1"

    v2 = VersionRegistry.get_version_info(APIVersion.V2)
    assert v2.version == "v2"
    assert v2.status == "planned"
    assert v2.prefix == "/api/v2"


@pytest.mark.asyncio
async def test_api_versions_discovery_endpoint():
    """
    Verifies that the /api/versions discovery endpoint returns supported versions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/versions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        versions_list = [v["version"] for v in data]
        assert "v1" in versions_list
        assert "v2" in versions_list


def test_all_domain_routes_mounted_under_v1():
    """
    Verifies that all domain routes are strictly prefixed with /api/v1 (or system health/version paths).
    Ensures no unversioned domain endpoints exist.
    """
    allowed_system_paths = {"/health", "/health/ready", "/api/versions", "/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json"}


    for route in app.routes:
        path = getattr(route, "path", None)
        if path:
            if path in allowed_system_paths:
                continue
            assert path.startswith("/api/v1"), f"Route '{path}' is missing /api/v1 prefix!"
