# Pure data that the application passes to the SDK.
# No I/O, no dependencies — only what we know at capture time.
# The gateway adds org context, enrichment metadata, and ingestion timestamp.
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class EventInput:
    """Everything the SDK needs to build one telemetry event."""

    event_type: str   # audit | log | trace | metric | event
    severity: str     # debug | info | warn | error | critical
    message: str
    user_id: str = ""
    session_id: str = ""
    trace_id: str = ""
    span_id: str = ""
    parent_span_id: str = ""
    payload: dict[str, Any] = field(default_factory=dict)
