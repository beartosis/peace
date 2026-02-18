"""Tests for the PEACE FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.main import app, get_db
from backend.models import Handoff, Run, Step, Transition

import backend.models  # noqa: F401


@pytest.fixture
def client(tmp_path):
    """Create a test client with a file-based SQLite DB to avoid thread issues."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    # Seed data
    session = TestSession()
    run = Run(project="testproject", log_file="order-run-test.log", status="completed",
              steps_attempted=2, steps_completed=1, steps_failed=1)
    session.add(run)
    session.flush()

    step1 = Step(run_id=run.id, step_number=1, title="First Step", status="completed",
                 final_state="HANDOFF", final_verdict="HANDOFF_WRITTEN")
    step2 = Step(run_id=run.id, step_number=2, title="Second Step", status="failed",
                 final_state="MERGE_PRS", final_verdict="MERGE_BLOCKED")
    session.add_all([step1, step2])
    session.flush()

    t1 = Transition(step_id=step1.id, from_state="INIT", to_state="PARSE_ROADMAP",
                     verdict="STEP_FOUND", is_self_transition=False,
                     dispatch_skill="/parse-roadmap", dispatch_content="Parsed roadmap OK")
    t2 = Transition(step_id=step1.id, from_state="PARSE_ROADMAP", to_state="PARSE_ROADMAP",
                     is_self_transition=True)
    session.add_all([t1, t2])

    handoff = Handoff(step_id=step1.id, step_number=1,
                      key_decisions='[{"decision":"test"}]',
                      tradeoffs='["tradeoff1"]',
                      known_risks='[]', learnings='[]', followups='[]',
                      next_step_number=2, next_step_title="Second Step")
    session.add(handoff)
    session.commit()
    session.close()

    def override_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_runs(client):
    resp = client.get("/api/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["project"] == "testproject"
    assert data[0]["steps_attempted"] == 2


def test_get_run(client):
    resp = client.get("/api/runs/1")
    assert resp.status_code == 200
    assert resp.json()["project"] == "testproject"


def test_get_run_not_found(client):
    resp = client.get("/api/runs/999")
    assert resp.status_code == 404


def test_list_run_steps(client):
    resp = client.get("/api/runs/1/steps")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["step_number"] == 1
    assert data[1]["step_number"] == 2


def test_get_step(client):
    resp = client.get("/api/steps/1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "First Step"
    assert data["final_state"] == "HANDOFF"
    # Should include transitions
    assert len(data["transitions"]) == 2
    # First transition has dispatch content
    assert data["transitions"][0]["dispatch_content"] == "Parsed roadmap OK"
    # Second transition has no dispatch content
    assert data["transitions"][1]["dispatch_content"] is None


def test_get_step_not_found(client):
    resp = client.get("/api/steps/999")
    assert resp.status_code == 404


def test_list_step_transitions(client):
    resp = client.get("/api/steps/1/transitions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["to_state"] == "PARSE_ROADMAP"
    assert data[0]["dispatch_content"] == "Parsed roadmap OK"
    assert data[1]["is_self_transition"] is True


def test_get_step_handoff(client):
    resp = client.get("/api/steps/1/handoff")
    assert resp.status_code == 200
    data = resp.json()
    assert data["next_step_number"] == 2
    assert '"decision"' in data["key_decisions"]


def test_get_step_handoff_not_found(client):
    resp = client.get("/api/steps/2/handoff")
    assert resp.status_code == 404


def test_get_run_step(client):
    resp = client.get("/api/runs/1/steps/1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "First Step"
    assert data["final_state"] == "HANDOFF"
    assert len(data["transitions"]) == 2


def test_get_run_step_wrong_run(client):
    resp = client.get("/api/runs/999/steps/1")
    assert resp.status_code == 404


def test_get_run_step_wrong_step(client):
    resp = client.get("/api/runs/1/steps/999")
    assert resp.status_code == 404


def test_list_run_step_transitions(client):
    resp = client.get("/api/runs/1/steps/1/transitions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["to_state"] == "PARSE_ROADMAP"


def test_get_run_step_handoff(client):
    resp = client.get("/api/runs/1/steps/1/handoff")
    assert resp.status_code == 200
    data = resp.json()
    assert data["next_step_number"] == 2


def test_get_run_step_handoff_not_found(client):
    resp = client.get("/api/runs/1/steps/2/handoff")
    assert resp.status_code == 404


def test_get_stats(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_steps"] == 2
    assert data["completed"] == 1
    assert data["failed"] == 1
    assert data["total_transitions"] == 2
    assert data["total_self_transitions"] == 1
    assert data["total_handoffs"] == 1
    assert data["total_runs"] == 1
