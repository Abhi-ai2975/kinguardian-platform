"""
Lightweight data model representing the authenticated user for the current request.

AuthUser is constructed from the decoded JWT payload and passed into service and
client layers so they can attach actor identity to every write operation sent to
the FHIR server (audit trail: who created/updated/deleted a resource).
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class AuthUser:
    """
    Immutable snapshot of the authenticated caller's identity for a single request.

    Fields are populated directly from JWT claims after successful token validation
    (see app.auth.dependencies.get_current_user).

    Attributes:
        sub:    The JWT `sub` (subject) claim — a globally unique user identifier
                issued by the IAM provider. Used as `user_id` and `created_by` /
                `updated_by` in all FHIR server write requests.
        org_id: The organization the user is currently acting on behalf of.
                Comes from a custom `org_id` claim in the JWT. Optional because
                super-admin tokens may not be scoped to a specific organization.
    """

    # JWT subject — the unique, stable identifier for this user across all services.
    sub: str

    # Active organization context — used to scope all FHIR resource reads and writes
    # to the tenant the user is currently operating under. None for org-less tokens.
    org_id: Optional[str]
