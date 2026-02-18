"""Tests for the PEACE stats API endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.main import app, get_db
from backend.models import ArbiterEvent, PullRequest, Run, Step, Transition

import backend.models  # noqa: F401


@pytest.fixture
def stats_client(tmp_path):
    """Test client with seed data for stats endpoint testing."""
    db_path = tmp_path / "test_stats.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    session = TestSession()
    base_time = datetime(2026, 2, 17, 8, 0, 0, tzinfo=timezone.utc)

    run = Run(
        project="testproject",
        status="completed",
        steps_attempted=3,
        steps_completed=2,
        steps_failed=1,
    )
    session.add(run)
    session.flush()

    step1 = Step(
        run_id=run.id,
        step_number=1,
        title="First Step",
        status="completed",
        final_state="HANDOFF",
        final_verdict="HANDOFF_COMPLETE",
        started_at=base_time,
        ended_at=base_time + timedelta(seconds=720),
    )
    step2 = Step(
        run_id=run.id,
        step_number=2,
        title="Second Step",
        status="completed",
        final_state="HANDOFF",
        final_verdict="HANDOFF_COMPLETE",
        started_at=base_time + timedelta(seconds=800),
        ended_at=base_time + timedelta(seconds=1400),
    )
    step3 = Step(
        run_id=run.id,
        step_number=3,
        title="Third Step",
        status="halted",
        final_state="MERGE_PRS",
        final_verdict="MERGE_BLOCKED",
        started_at=base_time + timedelta(seconds=1500),
        ended_at=base_time + timedelta(seconds=1800),
    )
    session.add_all([step1, step2, step3])
    session.flush()

    # Transitions for step 1
    session.add_all(
        [
            Transition(
                step_id=step1.id,
                from_state="INIT",
                to_state="CREATE_SPEC",
                duration_secs=180.0,
                is_self_transition=False,
            ),
            Transition(
                step_id=step1.id,
                from_state="CREATE_SPEC",
                to_state="CREATE_SPEC",
                duration_secs=60.0,
                is_self_transition=True,
            ),
            Transition(
                step_id=step1.id,
                from_state="CREATE_SPEC",
                to_state="REVIEW_SPEC",
                duration_secs=90.0,
                is_self_transition=False,
            ),
            Transition(
                step_id=step1.id,
                from_state="REVIEW_SPEC",
                to_state="EXECUTE_TASKS",
                duration_secs=450.0,
                is_self_transition=False,
            ),
        ]
    )

    # Transitions for step 2
    session.add_all(
        [
            Transition(
                step_id=step2.id,
                from_state="INIT",
                to_state="CREATE_SPEC",
                duration_secs=200.0,
                is_self_transition=False,
            ),
            Transition(
                step_id=step2.id,
                from_state="CREATE_SPEC",
                to_state="MERGE_PRS",
                duration_secs=120.0,
                is_self_transition=False,
            ),
        ]
    )

    # Transitions for step 3
    session.add_all(
        [
            Transition(
                step_id=step3.id,
                from_state="INIT",
                to_state="EXECUTE_TASKS",
                duration_secs=500.0,
                is_self_transition=False,
            ),
            Transition(
                step_id=step3.id,
                from_state="EXECUTE_TASKS",
                to_state="MERGE_PRS",
                duration_secs=200.0,
                is_self_transition=False,
            ),
        ]
    )

    # PRs
    session.add_all(
        [
            PullRequest(step_id=step1.id, pr_number=100, status="merged"),
            PullRequest(step_id=step2.id, pr_number=101, status="merged"),
            PullRequest(step_id=step3.id, pr_number=102, status="open"),
        ]
    )

    # Arbiter events: step2 resolved, step3 halted
    session.add_all(
        [
            ArbiterEvent(
                step_id=step2.id, attempt=1, max_attempts=3, verdict="TASKS_COMPLETE"
            ),
            ArbiterEvent(step_id=step3.id, attempt=1, max_attempts=3, verdict=None),
            ArbiterEvent(
                step_id=step3.id, attempt=2, max_attempts=3, verdict="MERGE_BLOCKED"
            ),
        ]
    )

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


# --- /api/stats/overview ---


def test_stats_overview_totals(stats_client):
    resp = stats_client.get("/api/stats/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_steps"] == 3
    assert data["completed"] == 2
    assert data["failed"] == 1


def test_stats_overview_pass_rate(stats_client):
    data = stats_client.get("/api/stats/overview").json()
    assert data["pass_rate"] == pytest.approx(2 / 3, abs=0.001)


def test_stats_overview_avg_duration(stats_client):
    data = stats_client.get("/api/stats/overview").json()
    # Step durations: 720, 600, 300 -> avg = 540
    assert data["avg_step_duration_secs"] == pytest.approx(540.0, abs=0.5)


def test_stats_overview_prs_merged(stats_client):
    data = stats_client.get("/api/stats/overview").json()
    assert data["total_prs_merged"] == 2


def test_stats_overview_arbiter_success_rate(stats_client):
    data = stats_client.get("/api/stats/overview").json()
    # 3 interventions, 1 with verdict TASKS_COMPLETE -> 1/3
    assert data["arbiter_success_rate"] == pytest.approx(1 / 3, abs=0.001)


def test_stats_overview_self_transitions(stats_client):
    data = stats_client.get("/api/stats/overview").json()
    assert data["total_self_transitions"] == 1


# --- /api/stats/duration-trend ---


def test_duration_trend_order_and_count(stats_client):
    resp = stats_client.get("/api/stats/duration-trend")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    assert data[0]["step"] == 1
    assert data[1]["step"] == 2
    assert data[2]["step"] == 3


def test_duration_trend_values(stats_client):
    data = stats_client.get("/api/stats/duration-trend").json()
    assert data[0]["duration_secs"] == pytest.approx(720.0, abs=0.5)
    assert data[0]["status"] == "completed"
    assert data[0]["title"] == "First Step"
    assert data[2]["status"] == "halted"


# --- /api/stats/state-durations ---


def test_state_durations_all_states_present(stats_client):
    resp = stats_client.get("/api/stats/state-durations")
    assert resp.status_code == 200
    data = resp.json()
    for state in [
        "CREATE_SPEC",
        "REVIEW_SPEC",
        "PLAN_WORK",
        "EXECUTE_TASKS",
        "MERGE_PRS",
        "VERIFY_COMPLETION",
        "HANDOFF",
    ]:
        assert state in data


def test_state_durations_values(stats_client):
    data = stats_client.get("/api/stats/state-durations").json()
    # CREATE_SPEC has 2 non-self transitions: 180, 200 -> avg=190
    assert data["CREATE_SPEC"]["avg"] == pytest.approx(190.0, abs=0.5)


def test_state_durations_excludes_self_transitions(stats_client):
    data = stats_client.get("/api/stats/state-durations").json()
    # Only non-self CREATE_SPEC transitions (180, 200). If self-transition (60)
    # were included, avg would be ~146.7 instead of 190.
    assert data["CREATE_SPEC"]["avg"] == pytest.approx(190.0, abs=0.5)


# --- /api/stats/failure-breakdown ---


def test_failure_breakdown_by_state_and_verdict(stats_client):
    resp = stats_client.get("/api/stats/failure-breakdown")
    assert resp.status_code == 200
    data = resp.json()
    assert data["by_state"] == {"MERGE_PRS": 1}
    assert data["by_verdict"] == {"MERGE_BLOCKED": 1}


def test_failure_breakdown_self_transitions_by_state(stats_client):
    data = stats_client.get("/api/stats/failure-breakdown").json()
    assert data["self_transitions_by_state"]["CREATE_SPEC"] == 1


def test_failure_breakdown_arbiter_counts(stats_client):
    data = stats_client.get("/api/stats/failure-breakdown").json()
    assert data["arbiter_interventions"] == 3
    assert data["arbiter_resolved"] == 1
    assert data["arbiter_halted"] == 1


# --- /api/stats/recent-failures ---


def test_recent_failures_returns_failed_steps(stats_client):
    resp = stats_client.get("/api/stats/recent-failures")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["step"] == 3
    assert data[0]["title"] == "Third Step"
    assert data[0]["state"] == "MERGE_PRS"
    assert data[0]["verdict"] == "MERGE_BLOCKED"
    assert data[0]["arbiter_attempts"] == 2


def test_recent_failures_excludes_completed(stats_client):
    data = stats_client.get("/api/stats/recent-failures").json()
    for item in data:
        assert item["step"] != 1  # Step 1 is completed
        assert item["step"] != 2  # Step 2 is completed
