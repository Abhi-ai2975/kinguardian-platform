"""
Request and response schemas for the Terminology proxy endpoints.

These schemas mirror the fhir-server's terminology schemas (app/schemas/terminology.py)
for the five endpoints exposed by fhir-gql:
  - GET  /terminology/search         → SearchResponse
  - GET  /terminology/concepts       → ConceptsForFieldResponse
  - POST /terminology/lookup         → LookupResult         (input: LookupRequest)
  - POST /terminology/lookup-batch   → LookupBatchResponse  (input: LookupBatchRequest)
  - POST /terminology/validate       → ValidateResponse     (input: ValidateRequest)

All responses are plain JSON only — terminology has no FHIR content negotiation.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Shared sub-schemas ────────────────────────────────────────────────────────


class ConceptResponse(BaseModel):
    """
    A single terminology concept returned by search, lookup, and concepts endpoints.
    Mirrors the fhir-server's ConceptResponse.
    """

    id: int = Field(description="Internal concept database ID")
    code: str = Field(description="The concept code within its code system (e.g. '73211009')")
    display: str = Field(description="Human-readable display name (e.g. 'Diabetes mellitus')")
    definition: Optional[str] = Field(default=None, description="Definition of the concept")
    active: bool = Field(description="Whether this concept is currently active")
    system: str = Field(description="Canonical URL of the code system this concept belongs to")
    system_name: str = Field(description="Human-readable name of the code system (e.g. 'SNOMED CT')")


class ValueSetResponse(BaseModel):
    """
    A FHIR value set — a defined collection of concepts from one or more code systems.
    Mirrors the fhir-server's ValueSetResponse.
    """

    id: int = Field(description="Internal value set database ID")
    canonical_url: str = Field(description="Canonical URL of the value set (e.g. http://hl7.org/fhir/ValueSet/...)")
    name: str = Field(description="Machine-readable name of the value set")
    title: Optional[str] = Field(default=None, description="Human-readable title")
    description: Optional[str] = Field(default=None, description="Description of the value set scope")
    version: Optional[str] = Field(default=None, description="Version of the value set")
    binding_strength: str = Field(
        description="Binding strength: required | extensible | preferred | example"
    )
    active: bool = Field(description="Whether this value set is currently active")


# ── Response schemas ──────────────────────────────────────────────────────────


class SearchResponse(BaseModel):
    """
    Paginated search results from GET /terminology/search.
    Contains matching concepts ranked by trigram similarity to the query.
    """

    total: int = Field(description="Total number of matching concepts across all pages")
    limit: int = Field(description="Page size requested")
    offset: int = Field(description="Number of records skipped")
    data: List[ConceptResponse] = Field(description="Matching concepts for this page")


class ConceptsForFieldResponse(BaseModel):
    """
    Value set concepts bound to a specific FHIR resource field.
    Returned by GET /terminology/concepts?resource=Condition&field=clinicalStatus.
    Used to populate dropdowns in clinical UIs and validate user-selected codes.
    """

    resource: str = Field(description="The FHIR resource type queried (e.g. 'Condition')")
    field: str = Field(description="The field name queried (e.g. 'clinicalStatus')")
    value_set: Optional[ValueSetResponse] = Field(
        default=None,
        description="The value set bound to this field, if one exists",
    )
    binding_strength: Optional[str] = Field(
        default=None,
        description="Binding strength for this field: required | extensible | preferred | example",
    )
    multiple_allowed: bool = Field(
        default=False,
        description="True if the field allows multiple codes (e.g. Condition.category)",
    )
    total: int = Field(description="Total number of concepts in the value set")
    limit: int = Field(description="Page size requested")
    offset: int = Field(description="Number of records skipped")
    concepts: List[ConceptResponse] = Field(description="Concepts in the value set for this page")


class LookupResult(BaseModel):
    """
    Result of a single concept lookup.
    `found=false` means the code does not exist — not raised as a 404 so callers
    can handle unknown codes without catching exceptions.
    """

    found: bool = Field(description="True if the code exists in the specified code system")
    concept: Optional[ConceptResponse] = Field(
        default=None,
        description="Full concept details — present only when found=true",
    )
    code_system: Optional[dict] = Field(
        default=None,
        description="Code system metadata — present only when found=true",
    )


class LookupBatchResponse(BaseModel):
    """Results of a bulk lookup — one LookupResult per input item."""

    results: List[LookupResult] = Field(
        description="Lookup results in the same order as the input items"
    )


class ValidateResponse(BaseModel):
    """
    Result of validating a code against a FHIR resource field binding.

    `valid` reflects the overall pass/fail. `in_value_set` tells you if the code
    is literally in the bound value set regardless of binding strength (so an
    extensible binding can be valid even when in_value_set=false).
    """

    valid: bool = Field(description="Overall validation result — true if the code is acceptable for this field")
    in_value_set: bool = Field(description="True if the code exists in the bound value set")
    binding_strength: Optional[str] = Field(
        default=None,
        description="Binding strength for the field: required | extensible | preferred | example",
    )
    concept: Optional[ConceptResponse] = Field(
        default=None,
        description="Full concept details if the code was found in the terminology DB",
    )
    value_set: Optional[ValueSetResponse] = Field(
        default=None,
        description="The value set bound to this field, if one exists",
    )
    message: str = Field(description="Human-readable explanation of the validation result")


# ── Request schemas (POST bodies) ─────────────────────────────────────────────


class LookupRequest(BaseModel):
    """Request body for POST /terminology/lookup."""

    model_config = ConfigDict(extra="forbid")

    system: str = Field(
        description="Canonical URL of the code system (e.g. 'http://snomed.info/sct')",
        examples=["http://snomed.info/sct"],
    )
    code: str = Field(
        description="The concept code to look up (e.g. '73211009')",
        examples=["73211009"],
    )


class LookupBatchItem(BaseModel):
    """A single system+code pair within a batch lookup request."""

    model_config = ConfigDict(extra="forbid")

    system: str = Field(description="Canonical URL of the code system")
    code: str = Field(description="The concept code to look up")


class LookupBatchRequest(BaseModel):
    """Request body for POST /terminology/lookup-batch."""

    model_config = ConfigDict(extra="forbid")

    items: List[LookupBatchItem] = Field(
        description="List of system+code pairs to look up (max 100 items)",
        min_length=1,
    )


class ValidateRequest(BaseModel):
    """Request body for POST /terminology/validate."""

    model_config = ConfigDict(extra="forbid")

    resource: str = Field(
        description="FHIR resource type to validate against (e.g. 'Condition')",
        examples=["Condition"],
    )
    field: str = Field(
        description="Field name on the resource (e.g. 'clinicalStatus')",
        examples=["clinicalStatus"],
    )
    system: str = Field(
        description="Canonical URL of the code system the code belongs to",
        examples=["http://terminology.hl7.org/CodeSystem/condition-clinical"],
    )
    code: str = Field(
        description="The code to validate",
        examples=["active"],
    )
