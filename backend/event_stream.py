"""Live event streaming for PEACE observability.

Tails ORDER's events.jsonl file and broadcasts new events to SSE clients.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import AsyncIterator, Optional

logger = logging.getLogger(__name__)


class EventBroadcaster:
    """Fan-out broadcaster for SSE clients.

    Maintains a ring buffer of recent events for reconnection replay
    and a list of subscriber queues for live delivery.
    """

    def __init__(self, buffer_size: int = 200) -> None:
        self._subscribers: list[asyncio.Queue[dict]] = []
        self._last_event_id: int = 0
        self._recent_events: list[dict] = []
        self._buffer_size = buffer_size

    @property
    def last_event_id(self) -> int:
        return self._last_event_id

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    @property
    def recent_event_count(self) -> int:
        return len(self._recent_events)

    def subscribe(self, last_event_id: Optional[int] = None) -> asyncio.Queue[dict]:
        """Create a new subscriber queue, replaying missed events if requested."""
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
        if last_event_id is not None:
            for event in self._recent_events:
                if event.get("seq", 0) > last_event_id:
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        break
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict]) -> None:
        """Remove a subscriber queue."""
        self._subscribers = [q for q in self._subscribers if q is not queue]

    async def publish(self, event: dict) -> None:
        """Broadcast an event to all subscribers."""
        seq = event.get("seq", 0)
        if isinstance(seq, int) and seq > self._last_event_id:
            self._last_event_id = seq

        self._recent_events.append(event)
        if len(self._recent_events) > self._buffer_size:
            self._recent_events = self._recent_events[-self._buffer_size :]

        dead_queues: list[asyncio.Queue[dict]] = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                dead_queues.append(queue)
        for q in dead_queues:
            self._subscribers.remove(q)


# Module-level singleton
broadcaster = EventBroadcaster()


class EventFileWatcher:
    """Tail events.jsonl and publish new lines to the broadcaster.

    Uses simple size-based polling — no external dependencies needed.
    Handles file truncation (new ORDER run) and missing files gracefully.
    """

    def __init__(self, events_path: Path, poll_interval: float = 0.5) -> None:
        self._path = events_path
        self._poll_interval = poll_interval
        self._offset: int = 0
        self._running: bool = False

    async def start(self) -> None:
        """Start watching the events file. Meant to run as an asyncio task."""
        self._running = True
        # Seek to end on startup — don't replay entire history
        if self._path.exists():
            self._offset = self._path.stat().st_size
            logger.info(
                "Event watcher started, seeking to offset %d in %s",
                self._offset,
                self._path,
            )
        else:
            logger.info(
                "Event watcher started, waiting for %s to appear", self._path
            )
        while self._running:
            await self._check_for_new_lines()
            await asyncio.sleep(self._poll_interval)

    def stop(self) -> None:
        """Signal the watcher to stop."""
        self._running = False

    async def _check_for_new_lines(self) -> None:
        if not self._path.exists():
            return

        try:
            size = self._path.stat().st_size
        except OSError:
            return

        # File was truncated (new ORDER run) — reset
        if size < self._offset:
            logger.info("Events file truncated, resetting offset to 0")
            self._offset = 0

        if size == self._offset:
            return

        try:
            with open(self._path, "r") as f:
                f.seek(self._offset)
                new_data = f.read()
                self._offset = f.tell()
        except OSError:
            return

        for line in new_data.strip().split("\n"):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("Skipping malformed event line: %.100s", line)
                continue
            await broadcaster.publish(event)


async def event_stream_generator(
    queue: asyncio.Queue[dict],
    check_disconnected,
    keepalive_secs: float = 30.0,
) -> AsyncIterator[str]:
    """Generate SSE frames from a subscriber queue.

    Yields SSE-formatted strings. Sends keepalive comments on timeout.
    """
    try:
        while True:
            if await check_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=keepalive_secs)
                event_type = event.get("type", "message")
                seq = event.get("seq", 0)
                data = json.dumps(event)
                yield f"id: {seq}\nevent: {event_type}\ndata: {data}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    except asyncio.CancelledError:
        pass
