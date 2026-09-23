# Public surface of the SDK — only Client needs to be imported by application developers.
from watcher_sdk.client import Client, EVENT_TYPE_AI

__all__ = ["Client", "EVENT_TYPE_AI"]
