"""
Worker — AuditWorker.

Consumes events from stream:audit (audit log events like user logins,
permission changes, data access, billing modifications).

Audit events have strict at-least-once delivery requirements — missing
an audit event is a compliance failure. The base worker's pending recovery
ensures no audit events are lost on crash.
"""

from src.workers.base import BaseWorker


class AuditWorker(BaseWorker):
    """Processes audit telemetry events from stream:audit."""
    stream_topic = "stream:audit"
    group_name = "cg:audit"
