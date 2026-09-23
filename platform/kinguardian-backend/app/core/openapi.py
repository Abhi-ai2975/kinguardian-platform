from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI
from typing import Dict, Any


TAGS_METADATA = [
    {
        "name": "Family Operations",
        "description": "Multi-tenant family circles, memberships, and care circle management."
    },
    {
        "name": "Care Subjects",
        "description": "Elder care recipient profiles, demographics, and relationship mappings."
    },
    {
        "name": "Medications & Adherence",
        "description": "Prescription sync and deterministic parent medication confirmations."
    },
    {
        "name": "Care Tasks",
        "description": "Daily care assignments, task scheduling, and completion workflows."
    },
    {
        "name": "Appointments",
        "description": "Clinical appointment coordination, calendar scheduling, and sync."
    },
    {
        "name": "AI Guardian & Insights",
        "description": "Autonomous guardian monitoring, baseline analytics, and safety-gated AI actions."
    },
    {
        "name": "Documents & OCR",
        "description": "FileNest-integrated medical records, lab reports, and OCR extraction."
    },
    {
        "name": "Consents & Governance",
        "description": "Explicit Granular Consent granting, verification, and revocation."
    },
    {
        "name": "System",
        "description": "Health liveness/readiness probes and API version discovery."
    }
]


def custom_openapi_generator(app: FastAPI) -> Dict[str, Any]:
    """
    Generates structured OpenAPI 3.1.0 documentation with:
    - Authentication security schemes (Bearer JWT)
    - Comprehensive request/response schemas
    - Standardized error envelopes with real-world examples
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="KinGuardian Platform API",
        version="0.1.0",
        description=(
            "Enterprise two-sided cross-border parent healthcare coordination platform API. "
            "Connects coordinators globally with aging parents and local caregivers."
        ),
        routes=app.routes,
        tags=TAGS_METADATA
    )

    # 1. Define Bearer Authentication Security Scheme
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the IAM JWT Bearer token issued during authentication handoff."
        }
    }

    # 2. Add Standard Error Schema Components
    openapi_schema["components"]["schemas"]["ErrorDetail"] = {
        "type": "object",
        "required": ["code", "message", "request_id"],
        "properties": {
            "code": {
                "type": "string",
                "description": "Stable domain error code",
                "example": "CONSENT_REQUIRED"
            },
            "message": {
                "type": "string",
                "description": "Human-readable sanitized error message",
                "example": "You do not have permission to view this health information."
            },
            "request_id": {
                "type": "string",
                "format": "uuid",
                "description": "Unique correlation request ID for support telemetry",
                "example": "679f85b4-fc98-4562-843e-23c97e635735"
            },
            "details": {
                "type": "object",
                "nullable": True,
                "description": "Optional domain details",
                "example": {"required_scope": "clinical:vitals:read"}
            }
        }
    }

    openapi_schema["components"]["schemas"]["ErrorResponse"] = {
        "type": "object",
        "required": ["error"],
        "properties": {
            "error": {
                "$ref": "#/components/schemas/ErrorDetail"
            }
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema
