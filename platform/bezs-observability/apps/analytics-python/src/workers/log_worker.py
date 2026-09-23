"""
Worker — LogWorker.

Consumes application log events from stream:log (info, warn, error, debug
messages from backend services, frontend applications, and background jobs).
"""

from src.workers.base import BaseWorker


class LogWorker(BaseWorker):
    """Processes application log events from stream:log."""
    stream_topic = "stream:log"
    group_name = "cg:log"
