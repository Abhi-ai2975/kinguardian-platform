from enum import Enum
from typing import List, Dict
from pydantic import BaseModel, Field


class APIVersion(str, Enum):
    V1 = "v1"
    V2 = "v2"


class APIVersionInfo(BaseModel):
    version: str
    status: str = Field(..., description="active | planned | deprecated")
    prefix: str
    description: str
    breaking_changes_policy: str


class VersionRegistry:
    """
    KinGuardian API Versioning Architecture:
    - Current Active API: /api/v1
    - Future Breaking Versions: /api/v2
    - Domain Services are strictly Version-Independent: Business rules, domain models,
      and aggregate root logic do not know or care about HTTP version prefixes.
    - Presentation Layer (Routers & Pydantic DTOs) maps version-specific contracts
      (v1 vs v2) onto the underlying domain services.
    - No internal implementation details or raw DB queries are ever exposed in API contracts.
    """

    _VERSIONS: Dict[APIVersion, APIVersionInfo] = {
        APIVersion.V1: APIVersionInfo(
            version="v1",
            status="active",
            prefix="/api/v1",
            description="KinGuardian Platform Production API v1.0. Two-sided care coordination, health metrics, and guardian agent interfaces.",
            breaking_changes_policy="No breaking changes permitted on /api/v1. Additive non-breaking changes only."
        ),
        APIVersion.V2: APIVersionInfo(
            version="v2",
            status="planned",
            prefix="/api/v2",
            description="Future Breaking API version reserved for major schema refactors while keeping domain services reusable.",
            breaking_changes_policy="Breaking contract changes isolated to /api/v2 DTO adapters."
        ),
    }

    @classmethod
    def get_supported_versions(cls) -> List[APIVersionInfo]:
        """Returns all registered API versions."""
        return list(cls._VERSIONS.values())

    @classmethod
    def get_version_info(cls, version: APIVersion) -> APIVersionInfo:
        """Returns version details for a specific API version."""
        return cls._VERSIONS[version]
