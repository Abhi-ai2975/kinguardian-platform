"""
Adapter — Redis Streams consumer implementing the StreamConsumer port.

Uses redis-py to interact with Redis Streams via consumer groups.
Consumer groups give us:
  - At-least-once delivery (messages stay pending until ACK'd)
  - Parallel processing (multiple workers share the group)
  - Crash recovery (claim_pending reclaims unACK'd messages on restart)
"""

from __future__ import annotations

import logging

import redis

from src.ports.consumer import StreamConsumer, StreamMessage

logger = logging.getLogger(__name__)


class RedisStreamConsumer(StreamConsumer):
    """
    Implements StreamConsumer using Redis Streams (XREADGROUP / XACK / XAUTOCLAIM).

    Each instance is bound to one stream topic and one consumer group.
    Multiple instances with the same group_name share the workload —
    Redis distributes messages across all active consumers in the group.
    """

    def __init__(
        self,
        client: redis.Redis,
        stream: str,
        group_name: str,
        consumer_name: str,
    ) -> None:
        """
        Args:
            client: A connected redis-py client.
            stream: The Redis stream key (e.g. "stream:audit").
            group_name: Consumer group name (e.g. "cg:audit").
            consumer_name: Unique name for this consumer instance (e.g. "worker-1").
        """
        self._client = client
        self._stream = stream
        self._group = group_name
        self._consumer = consumer_name

        # Ensure the consumer group exists. MKSTREAM creates the stream if it
        # doesn't exist yet — the gateway may not have published to it yet.
        self._ensure_group()

    def _ensure_group(self) -> None:
        """
        Creates the consumer group if it doesn't exist.
        Using SETID='0' starts from the beginning of the stream — useful
        so workers don't miss events that arrived before they started.
        MKSTREAM creates the stream if it doesn't exist yet.
        """
        try:
            self._client.xgroup_create(
                self._stream,
                self._group,
                id="0",        # read from the beginning
                mkstream=True, # create stream if it doesn't exist
            )
            logger.info("consumer: created group %s on %s", self._group, self._stream)
        except redis.exceptions.ResponseError as e:
            # "BUSYGROUP" means the group already exists — that's fine.
            if "BUSYGROUP" not in str(e):
                raise

    def read_batch(self, batch_size: int, block_ms: int) -> list[StreamMessage]:
        """
        Reads up to batch_size undelivered messages from the stream.
        Blocks for block_ms if the stream is empty.

        Uses ">" as the ID to read only NEW (undelivered) messages.
        """
        response = self._client.xreadgroup(
            groupname=self._group,
            consumername=self._consumer,
            streams={self._stream: ">"},  # ">" = only new messages
            count=batch_size,
            block=block_ms,
        )

        if not response:
            return []

        # response shape: [(stream_name, [(msg_id, {field: value, ...}), ...])]
        messages = []
        for _stream_name, entries in response:
            for msg_id, fields in entries:
                # Redis returns bytes — decode to str
                decoded_fields = {
                    k.decode() if isinstance(k, bytes) else k: v.decode() if isinstance(v, bytes) else v
                    for k, v in fields.items()
                }
                messages.append(StreamMessage(
                    message_id=msg_id.decode() if isinstance(msg_id, bytes) else msg_id,
                    fields=decoded_fields,
                ))

        return messages

    def acknowledge(self, message_ids: list[str]) -> None:
        """
        Sends XACK for all given message IDs, removing them from the PEL.
        Called only after successful ClickHouse insert.
        """
        if message_ids:
            self._client.xack(self._stream, self._group, *message_ids)

    def claim_pending(self, batch_size: int, min_idle_ms: int) -> list[StreamMessage]:
        """
        Claims pending messages that have been idle for at least min_idle_ms.
        Called on startup to recover from a previous crash.

        XAUTOCLAIM transfers ownership of idle PEL entries to this consumer.
        """
        response = self._client.xautoclaim(
            self._stream,
            self._group,
            self._consumer,
            min_idle_time=min_idle_ms,
            start_id="0-0",  # scan from the beginning of the PEL
            count=batch_size,
        )

        if not response:
            return []

        # xautoclaim returns (next_start_id, [(msg_id, fields), ...], [deleted_ids])
        _next_id, entries, _deleted = response

        messages = []
        for msg_id, fields in entries:
            if fields is None:
                # Message was deleted from the stream — skip
                continue
            decoded_fields = {
                k.decode() if isinstance(k, bytes) else k: v.decode() if isinstance(v, bytes) else v
                for k, v in fields.items()
            }
            messages.append(StreamMessage(
                message_id=msg_id.decode() if isinstance(msg_id, bytes) else msg_id,
                fields=decoded_fields,
            ))

        return messages
