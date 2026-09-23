from app.fhir.mappers.location.fhir import (
    fhir_location_endpoint,
    fhir_location_hours_of_operation,
    fhir_location_identifier,
    fhir_location_telecom,
    fhir_location_type,
    to_fhir_location,
)
from app.fhir.mappers.location.plain import (
    plain_location_alias,
    plain_location_endpoint,
    plain_location_hours_of_operation,
    plain_location_identifier,
    plain_location_telecom,
    plain_location_type,
    to_plain_location,
)

__all__ = [
    "to_fhir_location",
    "to_plain_location",
    "fhir_location_identifier",
    "fhir_location_type",
    "fhir_location_telecom",
    "fhir_location_hours_of_operation",
    "fhir_location_endpoint",
    "plain_location_identifier",
    "plain_location_alias",
    "plain_location_type",
    "plain_location_telecom",
    "plain_location_hours_of_operation",
    "plain_location_endpoint",
]
