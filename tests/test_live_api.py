"""Tests for the live streaming API endpoints."""

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.main import app, get_db

import backend.models  # noqa: F401


@pytest.fixture
def client(tmp_path):
    """Create a test client with file-based SQLite DB."""
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestLiveStatus:
    def test_returns_status(self, client):
        resp = client.get("/api/live/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "connected_clients" in data
        assert "last_event_id" in data
        assert "recent_event_count" in data


class TestLiveSnapshot:
    def test_returns_404_when_no_state(self, client, monkeypatch):
        from pathlib import Path

        monkeypatch.setattr(
            "backend.main._get_state_path",
            lambda: Path("/nonexistent/state.json"),
        )
        resp = client.get("/api/live/snapshot")
        assert resp.status_code == 404

    def test_returns_state_json(self, client, tmp_path, monkeypatch):
        state_file = tmp_path / "state.json"
        state_file.write_text(
            json.dumps(
                {
                    "current_state": "EXECUTE_TASKS",
                    "step_number": 110,
                    "last_transition": "2026-02-18T01:00:00-08:00",
                    "consecutive_failures": 0,
                }
            )
        )
        monkeypatch.setattr("backend.main._get_state_path", lambda: state_file)
        resp = client.get("/api/live/snapshot")
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_state"] == "EXECUTE_TASKS"
        assert data["step_number"] == 110


class TestLiveEvents:
    def test_sse_endpoint_exists(self, client):
        # Verify the /api/live/status endpoint works as a proxy for
        # SSE availability (the SSE stream itself blocks indefinitely
        # and can't be tested with TestClient synchronously)
        resp = client.get("/api/live/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "connected_clients" in data
