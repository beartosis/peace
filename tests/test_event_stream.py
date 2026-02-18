"""Tests for the event streaming module."""

import asyncio
import json
from pathlib import Path

import pytest

from backend.event_stream import EventBroadcaster, EventFileWatcher


@pytest.fixture
def fresh_broadcaster():
    """Return a fresh EventBroadcaster for testing."""
    return EventBroadcaster(buffer_size=10)


class TestEventBroadcaster:
    def test_subscribe_creates_queue(self, fresh_broadcaster):
        q = fresh_broadcaster.subscribe()
        assert fresh_broadcaster.subscriber_count == 1
        fresh_broadcaster.unsubscribe(q)
        assert fresh_broadcaster.subscriber_count == 0

    def test_publish_delivers_to_subscriber(self, fresh_broadcaster):
        async def run():
            q = fresh_broadcaster.subscribe()
            event = {"type": "state_transition", "seq": 1, "ts": "2026-01-01T00:00:00"}
            await fresh_broadcaster.publish(event)
            result = q.get_nowait()
            assert result == event

        asyncio.run(run())

    def test_publish_updates_last_event_id(self, fresh_broadcaster):
        async def run():
            assert fresh_broadcaster.last_event_id == 0
            await fresh_broadcaster.publish({"seq": 5})
            assert fresh_broadcaster.last_event_id == 5
            await fresh_broadcaster.publish({"seq": 10})
            assert fresh_broadcaster.last_event_id == 10

        asyncio.run(run())

    def test_ring_buffer_limits_size(self, fresh_broadcaster):
        async def run():
            for i in range(15):
                await fresh_broadcaster.publish({"seq": i + 1})
            assert fresh_broadcaster.recent_event_count == 10

        asyncio.run(run())

    def test_replay_on_subscribe(self, fresh_broadcaster):
        async def run():
            for i in range(5):
                await fresh_broadcaster.publish({"seq": i + 1, "type": "test"})
            q = fresh_broadcaster.subscribe(last_event_id=3)
            items = []
            while not q.empty():
                items.append(q.get_nowait())
            assert len(items) == 2
            assert items[0]["seq"] == 4
            assert items[1]["seq"] == 5

        asyncio.run(run())

    def test_full_queue_drops_subscriber(self, fresh_broadcaster):
        async def run():
            fresh_broadcaster.subscribe()
            for i in range(257):
                await fresh_broadcaster.publish({"seq": i + 1})
            assert fresh_broadcaster.subscriber_count == 0

        asyncio.run(run())

    def test_multiple_subscribers(self, fresh_broadcaster):
        async def run():
            q1 = fresh_broadcaster.subscribe()
            q2 = fresh_broadcaster.subscribe()
            await fresh_broadcaster.publish({"seq": 1, "type": "test"})
            assert q1.get_nowait()["seq"] == 1
            assert q2.get_nowait()["seq"] == 1

        asyncio.run(run())


class TestEventFileWatcher:
    def test_reads_new_lines(self, tmp_path):
        async def run():
            events_file = tmp_path / "events.jsonl"
            events_file.write_text("")

            test_broadcaster = EventBroadcaster()
            watcher = EventFileWatcher(events_file)

            event = {"type": "test", "seq": 1, "ts": "2026-01-01T00:00:00"}
            events_file.write_text(json.dumps(event) + "\n")

            import backend.event_stream as es
            original = es.broadcaster
            es.broadcaster = test_broadcaster
            try:
                q = test_broadcaster.subscribe()
                await watcher._check_for_new_lines()
                result = q.get_nowait()
                assert result["type"] == "test"
                assert result["seq"] == 1
            finally:
                es.broadcaster = original

        asyncio.run(run())

    def test_handles_missing_file(self, tmp_path):
        async def run():
            events_file = tmp_path / "nonexistent.jsonl"
            watcher = EventFileWatcher(events_file)
            await watcher._check_for_new_lines()

        asyncio.run(run())

    def test_handles_truncation(self, tmp_path):
        async def run():
            events_file = tmp_path / "events.jsonl"
            events_file.write_text('{"seq":1}\n{"seq":2}\n')

            watcher = EventFileWatcher(events_file)
            watcher._offset = events_file.stat().st_size

            events_file.write_text('{"seq":100}\n')

            import backend.event_stream as es
            original = es.broadcaster
            test_broadcaster = EventBroadcaster()
            es.broadcaster = test_broadcaster
            try:
                q = test_broadcaster.subscribe()
                await watcher._check_for_new_lines()
                result = q.get_nowait()
                assert result["seq"] == 100
            finally:
                es.broadcaster = original

        asyncio.run(run())

    def test_skips_malformed_lines(self, tmp_path):
        async def run():
            events_file = tmp_path / "events.jsonl"
            events_file.write_text('not json\n{"seq":1}\n')

            watcher = EventFileWatcher(events_file)

            import backend.event_stream as es
            original = es.broadcaster
            test_broadcaster = EventBroadcaster()
            es.broadcaster = test_broadcaster
            try:
                q = test_broadcaster.subscribe()
                await watcher._check_for_new_lines()
                result = q.get_nowait()
                assert result["seq"] == 1
                assert q.empty()
            finally:
                es.broadcaster = original

        asyncio.run(run())
