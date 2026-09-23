"""
Worker — AIWorker.

Consumes AI agent telemetry events from stream:ai (LLM calls, tool calls,
workflow steps, retrievals, evals, safety checks, and human feedback).
All events share event_type = "ai"; the payload.kind field distinguishes subtypes.
"""

from src.workers.base import BaseWorker


class AIWorker(BaseWorker):
    """Processes AI agent events from stream:ai."""
    stream_topic = "stream:ai"
    group_name = "cg:ai"
