"""
Worker — TraceWorker.

Consumes distributed trace spans from stream:trace (request spans,
service dependencies, database calls, external API calls).
"""

from src.workers.base import BaseWorker


class TraceWorker(BaseWorker):
    """Processes distributed trace spans from stream:trace."""
    stream_topic = "stream:trace"
    group_name = "cg:trace"
