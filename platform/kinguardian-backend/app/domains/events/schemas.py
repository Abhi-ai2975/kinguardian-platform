"""
Event Schemas and Serialization Models.
"""

from datetime import datetime
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class DomainEventSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type: str
    event_version: int = 1
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    occurred_at: datetime
    aggregate_type: str
    aggregate_id: str
    family_id: Optional[uuid.UUID] = None
    actor_profile_id: Optional[uuid.UUID] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class EventLogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    care_circle_id: Optional[uuid.UUID] = None
    event_type: str
    event_version: int = 1
    aggregate_type: Optional[str] = None
    aggregate_id: Optional[str] = None
    actor_profile_id: Optional[uuid.UUID] = None
    payload: dict = {}


class EventLogCreate(EventLogBase):
    pass


class EventLogResponse(EventLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utc_timestamp: datetime
    parent_timezone_timestamp: Optional[str] = None
    coordinator_timezone_timestamp: Optional[str] = None
