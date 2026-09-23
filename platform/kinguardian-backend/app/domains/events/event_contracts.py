"""
Domain Event vs. Audit Event Architectural Separation.

Clear architectural contracts:
1. Domain Event (Application Behavior):
   - Used to drive business behavior, reactive workflows, state machines, notifications, and analytics.
   - Dispatched to event bus / message brokers / domain subscribers.
   - Ephemeral or stored in transactional outbox for reliable delivery.

2. Audit Event (Compliance & Forensics):
   - Used to record WHO did WHAT, WHEN, FROM WHERE, and to WHICH resource.
   - Immutable historical record for HIPAA / DPDP compliance and forensic logging.
   - Preserves dual-timezone representation (Parent local time vs Coordinator local time).

3. Dual-Generation:
   - A single business action (e.g. submitting check-in, taking medication, granting consent)
     frequently generates BOTH a Domain Event (to trigger workflows) and an Audit Event (to record governance).
"""

from typing import Dict, Any, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# 1. Audit Event (Who did What, When, and to Which Resource)
# ==============================================================================

class AuditEvent(BaseModel):
    """
    Standardized Compliance & Forensic Audit Event.
    Answers: Who (actor) performed What (action) on Which Resource (resource),
    in what Tenant Context (family/subject), with what Outcome (status) and Traceability (request_id).
    """
    model_config = ConfigDict(from_attributes=True)

    audit_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    actor_profile_id: uuid.UUID = Field(..., description="Who performed the action")
    actor_role: str = Field(default="user", description="Role of the actor at execution time")
    action: str = Field(..., description="Specific action performed e.g. 'checkin.created', 'consent.granted', 'medication.dose_confirmed'")
    target_resource_type: str = Field(..., description="Resource category e.g. 'care_subject', 'consent', 'medication_adherence'")
    target_resource_id: str = Field(..., description="Unique ID of the affected resource")
    family_id: uuid.UUID = Field(..., description="Care circle tenant boundary")
    subject_id: Optional[uuid.UUID] = Field(None, description="Impacted care subject profile")
    
    # Forensic context
    status: Literal["SUCCESS", "FAILURE", "DENIED"] = Field(default="SUCCESS")
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    changes_diff: Dict[str, Any] = Field(default_factory=dict, description="Before/after changes or audit payload")
    
    # Timestamps
    utc_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    parent_local_time: Optional[str] = None
    coordinator_local_time: Optional[str] = None

    def to_audit_dict(self) -> Dict[str, Any]:
        return {
            "audit_id": str(self.audit_id),
            "actor_profile_id": str(self.actor_profile_id),
            "actor_role": self.actor_role,
            "action": self.action,
            "target_resource_type": self.target_resource_type,
            "target_resource_id": self.target_resource_id,
            "family_id": str(self.family_id),
            "subject_id": str(self.subject_id) if self.subject_id else None,
            "status": self.status,
            "request_id": self.request_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "changes_diff": self.changes_diff,
            "utc_timestamp": self.utc_timestamp.isoformat(),
            "parent_local_time": self.parent_local_time,
            "coordinator_local_time": self.coordinator_local_time
        }
