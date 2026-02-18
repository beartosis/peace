"""Tests for the IngestWatcher class."""

import asyncio
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.ingest import IngestWatcher

import backend.models  # noqa: F401 — ensure models registered with Base


@pytest.fixture
def watcher_env(tmp_path):
    """Create a minimal ORDER directory and in-memory DB session factory."""
    order_dir = tmp_path / "order"
    order_dir.mkdir()
    (order_dir / "logs").mkdir()
    (order_dir / "handoffs").mkdir()
    (order_dir / "history.jsonl").write_text("")
    (order_dir / "history-prs.jsonl").write_text("")

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine)

    return order_dir, factory


class TestFingerprint:
    def test_same_state_gives_same_fingerprint(self, watcher_env):
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        assert watcher._compute_fingerprint() == watcher._compute_fingerprint()

    def test_changes_on_history_growth(self, watcher_env):
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        fp1 = watcher._compute_fingerprint()
        (order_dir / "history.jsonl").write_text('{"event": 1}\n')
        fp2 = watcher._compute_fingerprint()
        assert fp1 != fp2

    def test_changes_on_history_prs_growth(self, watcher_env):
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        fp1 = watcher._compute_fingerprint()
        (order_dir / "history-prs.jsonl").write_text('{"pr": 1}\n')
        fp2 = watcher._compute_fingerprint()
        assert fp1 != fp2

    def test_changes_on_new_handoff(self, watcher_env):
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        fp1 = watcher._compute_fingerprint()
        (order_dir / "handoffs" / "step-001_HANDOFF.yml").write_text("title: test")
        fp2 = watcher._compute_fingerprint()
        assert fp1 != fp2

    def test_changes_on_new_log(self, watcher_env):
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        fp1 = watcher._compute_fingerprint()
        (order_dir / "logs" / "order-run-test.log").write_text("log data")
        fp2 = watcher._compute_fingerprint()
        assert fp1 != fp2

    def test_handles_missing_subdirs(self, tmp_path):
        order_dir = tmp_path / "empty_order"
        order_dir.mkdir()
        watcher = IngestWatcher(order_dir, "test", None)
        fp = watcher._compute_fingerprint()
        assert fp == (0, 0, 0, 0, 0)


class TestCheck:
    def test_no_reingest_when_unchanged(self, watcher_env):
        """_check should be a no-op when fingerprint hasn't changed."""
        order_dir, factory = watcher_env
        watcher = IngestWatcher(order_dir, "test", factory)
        watcher._last_fingerprint = watcher._compute_fingerprint()

        # If _do_reingest were called it would fail on the empty ORDER
        # dir (no real data to parse), so a clean run means it was skipped.
        asyncio.run(watcher._check())
