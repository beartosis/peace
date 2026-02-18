"""Integration tests for backend.ingest against real ORDER data."""

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.ingest import ingest
from backend.models import (
    ArbiterEvent,
    Handoff,
    PullRequest,
    Run,
    Step,
    Transition,
)

REAL_ORDER_DIR = Path(os.environ.get("ORDER_DIR", "/tmp/order-test-data"))


@pytest.fixture
def ingested_db(tmp_path):
    """Run full ingestion against real data into a temp DB."""
    if not REAL_ORDER_DIR.exists():
        pytest.skip("Real ORDER data not available")
    db_path = tmp_path / "test.db"
    counts = ingest(REAL_ORDER_DIR, "my-project", db_path)
    engine = create_engine(f"sqlite:///{db_path}")
    session = sessionmaker(bind=engine)()
    yield session, counts
    session.close()


def test_ingest_counts(ingested_db):
    session, counts = ingested_db
    assert counts["steps"] >= 90
    assert counts["runs"] >= 40
    assert counts["transitions"] > 100
    assert counts["prs"] >= 15
    assert counts["handoffs"] >= 70
    assert counts["arbiter_events"] > 0


def test_steps_have_numbers(ingested_db):
    session, _ = ingested_db
    steps = session.query(Step).all()
    for s in steps:
        assert s.step_number > 0


def test_handoffs_linked_to_steps(ingested_db):
    session, _ = ingested_db
    handoffs = session.query(Handoff).all()
    for h in handoffs:
        assert h.step_id is not None
        step = session.get(Step, h.step_id)
        assert step is not None
        assert step.step_number == h.step_number


def test_step_102_details(ingested_db):
    """Spot-check step 102 which we know has specific data."""
    session, _ = ingested_db
    step = session.query(Step).filter(Step.step_number == 102).first()
    assert step is not None
    assert step.title == "Combat Replay Storage"
    assert step.status == "completed"

    # Should have a handoff
    handoff = session.query(Handoff).filter(Handoff.step_id == step.id).first()
    assert handoff is not None
    assert handoff.next_step_number == 103


def test_runs_have_timestamps(ingested_db):
    session, _ = ingested_db
    runs = session.query(Run).all()
    for r in runs:
        assert r.started_at is not None
        assert r.project == "my-project"


def test_prs_have_numbers(ingested_db):
    session, _ = ingested_db
    prs = session.query(PullRequest).all()
    for pr in prs:
        assert pr.pr_number > 0


def test_arbiter_events_linked(ingested_db):
    session, _ = ingested_db
    events = session.query(ArbiterEvent).all()
    for e in events:
        assert e.step_id is not None


def test_dispatch_content_stored(ingested_db):
    """Transitions matched to dispatch blocks should have content populated."""
    session, _ = ingested_db
    with_content = session.query(Transition).filter(
        Transition.dispatch_content.isnot(None),
        Transition.dispatch_content != "",
    ).all()
    assert len(with_content) > 0
    for t in with_content:
        assert t.dispatch_skill is not None
