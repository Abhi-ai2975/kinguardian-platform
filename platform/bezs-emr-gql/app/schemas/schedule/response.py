"""
Plain JSON response schemas for FHIR Schedule resources.

These models document the shape of the fhir-server's plain JSON output — the format
returned when the client sends no Accept header or `Accept: application/json`.

Typed sub-schemas are used for array fields (identifier, service_category, service_type,
specialty, actor) because their structures are stable and well-defined, giving Swagger UI
richer documentation than `List[Dict]` would.

extra="allow" on every model lets new fhir-server fields pass through without a schema bump.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Typed array sub-schemas (mirror fhir-server PlainSchedule* models) ────────


class PlainScheduleIdentifier(BaseModel):
    """A single business identifier row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainScheduleServiceCategory(BaseModel):
    """A single service category row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleServiceType(BaseModel):
    """A single service type row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleSpecialty(BaseModel):
    """A single clinical specialty row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleActor(BaseModel):
    """
    A single actor reference row as returned by the fhir-server.

    The fhir-server splits the FHIR reference string (e.g. 'Practitioner/30001')
    into reference_type and reference_id for relational storage.
    """

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    reference_type: Optional[str] = None   # e.g. "Practitioner"
    reference_id: Optional[int] = None     # e.g. 30001
    reference_display: Optional[str] = None


# ── Top-level response models ──────────────────────────────────────────────────


class ScheduleResponse(BaseModel):
    """
    Full plain JSON response for a single Schedule resource.

    Mirrors PlainScheduleResponse from the fhir-server. extra="allow" lets
    new fhir-server fields pass through without requiring a schema bump here.
    """

    model_config = ConfigDict(extra="allow")

    id: Optional[int] = None
    active: Optional[bool] = None
    comment: Optional[str] = None
    planning_horizon_start: Optional[str] = None
    planning_horizon_end: Optional[str] = None

    # ── Array sub-resources ────────────────────────────────────────────────────
    identifier: Optional[List[PlainScheduleIdentifier]] = None
    service_category: Optional[List[PlainScheduleServiceCategory]] = None
    service_type: Optional[List[PlainScheduleServiceType]] = None
    specialty: Optional[List[PlainScheduleSpecialty]] = None
    actor: Optional[List[PlainScheduleActor]] = None

    # ── Tenant / audit fields ──────────────────────────────────────────────────
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedScheduleResponse(BaseModel):
    """
    Paginated plain JSON list response for GET /schedules.

    Matches the fhir-server's standard pagination envelope:
      { total, limit, offset, data: [ScheduleResponse, ...] }
    """

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[ScheduleResponse]
