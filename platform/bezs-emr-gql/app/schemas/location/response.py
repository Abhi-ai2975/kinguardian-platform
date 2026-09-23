"""
Plain JSON response schemas for FHIR Location resources.

These models document the shape of the fhir-server's plain JSON output — the format
returned when the client sends no Accept header or `Accept: application/json`.

Design decisions:
  - extra="allow" lets new fhir-server fields pass through to the client without
    requiring a schema bump here. The middleware is not the source of truth for the
    full schema — the fhir-server is.
  - All scalar fields are Optional because the fhir-server may omit them when not set.
  - Array fields (identifiers, aliases, types, telecoms, hours_of_operation, endpoints)
    use List[dict] rather than typed sub-models because the middleware never inspects
    their contents — it forwards them as-is. Typed sub-models would add no safety and
    would break if the fhir-server adds sub-fields without a coordinated schema bump here.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class LocationResponse(BaseModel):
    """
    Full plain JSON response for a single Location resource.

    Mirrors the PlainLocationResponse returned by the fhir-server for GET /locations/{id},
    POST /locations, and PATCH /locations/{id} when no FHIR Accept header is sent.

    extra="allow" is intentional: new fhir-server fields flow through without breaking
    existing clients or requiring a coordinated schema update here.
    """

    model_config = ConfigDict(extra="allow")

    # ── Core identity ──────────────────────────────────────────────────────────
    id: Optional[int] = None
    status: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None

    # ── Operational status (coded) ─────────────────────────────────────────────
    operational_status_system: Optional[str] = None
    operational_status_code: Optional[str] = None
    operational_status_display: Optional[str] = None

    # ── Address (flattened from FHIR Address backbone) ─────────────────────────
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[str] = None
    address_period_end: Optional[str] = None

    # ── Physical type (flattened) ──────────────────────────────────────────────
    physical_type_system: Optional[str] = None
    physical_type_code: Optional[str] = None
    physical_type_display: Optional[str] = None
    physical_type_text: Optional[str] = None

    # ── Relationships ──────────────────────────────────────────────────────────
    managing_organization_type: Optional[str] = None
    managing_organization_id: Optional[str] = None
    managing_organization_display: Optional[str] = None
    part_of_type: Optional[str] = None
    part_of_id: Optional[str] = None
    part_of_display: Optional[str] = None

    # ── Availability ───────────────────────────────────────────────────────────
    availability_exceptions: Optional[str] = None

    # ── Geographic position ────────────────────────────────────────────────────
    position_longitude: Optional[float] = None
    position_latitude: Optional[float] = None
    position_altitude: Optional[float] = None

    # ── Array sub-resources (forwarded as-is from fhir-server) ─────────────────
    # Using List[Dict] rather than typed sub-models because the middleware never
    # inspects these arrays — they are forwarded verbatim to the client.
    identifier: Optional[List[Dict[str, Any]]] = None
    alias: Optional[List[str]] = None
    type: Optional[List[Dict[str, Any]]] = None
    telecom: Optional[List[Dict[str, Any]]] = None
    hours_of_operation: Optional[List[Dict[str, Any]]] = None
    endpoint: Optional[List[Dict[str, Any]]] = None

    # ── Tenant / audit fields ──────────────────────────────────────────────────
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedLocationResponse(BaseModel):
    """
    Paginated plain JSON list response for GET /locations.

    Matches the fhir-server's standard pagination envelope:
      { total, limit, offset, data: [LocationResponse, ...] }
    """

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[LocationResponse]
