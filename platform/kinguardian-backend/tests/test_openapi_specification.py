import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_openapi_schema_endpoint_and_structure():
    """
    Verifies that GET /openapi.json automatically generates OpenAPI 3.1.0 specification
    describing title, version, tags, endpoints, schemas, and security requirements.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()

        assert schema["openapi"].startswith("3.")
        assert schema["info"]["title"] in ["KinGuardian Platform API", "KinGuardian Platform API"]
        assert schema["info"]["version"] == "0.1.0"

        assert "paths" in schema
        assert len(schema["paths"]) >= 20

        # Verify Authentication Requirements
        components = schema.get("components", {})
        security_schemes = components.get("securitySchemes", {})
        assert "BearerAuth" in security_schemes
        assert security_schemes["BearerAuth"]["type"] == "http"
        assert security_schemes["BearerAuth"]["scheme"] == "bearer"
        assert security_schemes["BearerAuth"]["bearerFormat"] == "JWT"

        # Verify Standard Error Schemas & Examples
        schemas = components.get("schemas", {})
        assert "ErrorResponse" in schemas
        assert "ErrorDetail" in schemas

        error_detail = schemas["ErrorDetail"]
        assert "properties" in error_detail
        assert "code" in error_detail["properties"]
        assert "message" in error_detail["properties"]
        assert "request_id" in error_detail["properties"]
        assert error_detail["properties"]["code"]["example"] == "CONSENT_REQUIRED"


@pytest.mark.asyncio
async def test_interactive_documentation_uis():
    """
    Verifies that Swagger UI (/docs) and ReDoc (/redoc) are automatically generated.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Swagger UI
        swagger_res = await ac.get("/docs")
        assert swagger_res.status_code == 200
        assert "swagger-ui" in swagger_res.text.lower() or "html" in swagger_res.headers.get("content-type", "").lower()

        # ReDoc UI
        redoc_res = await ac.get("/redoc")
        assert redoc_res.status_code == 200
        assert "redoc" in redoc_res.text.lower() or "html" in redoc_res.headers.get("content-type", "").lower()
