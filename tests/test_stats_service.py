"""Unit tests for the stats service layer."""

import pytest

from backend.models import Step, Transition
from backend.stats_service import (
    _percentile,
    get_overview,
    get_state_durations,
)


def test_percentile_empty_list():
    assert _percentile([], 50) == 0.0
    assert _percentile([], 95) == 0.0


def test_percentile_single_value():
    assert _percentile([42.0], 50) == 42.0
    assert _percentile([42.0], 95) == 42.0


def test_percentile_known_values():
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    assert _percentile(values, 50) == 3.0
    assert _percentile(values, 95) == pytest.approx(4.8)
    assert _percentile(values, 0) == 1.0
    assert _percentile(values, 100) == 5.0


def test_percentile_two_values():
    values = [10.0, 20.0]
    assert _percentile(values, 50) == 15.0


def test_get_overview_empty_db(db):
    result = get_overview(db)
    assert result["total_steps"] == 0
    assert result["completed"] == 0
    assert result["failed"] == 0
    assert result["pass_rate"] == 0.0
    assert result["avg_step_duration_secs"] is None
    assert result["total_prs_merged"] == 0
    assert result["total_arbiter_interventions"] == 0
    assert result["arbiter_success_rate"] == 0.0
    assert result["total_self_transitions"] == 0


def test_get_state_durations_no_transitions(db):
    result = get_state_durations(db)
    for state in [
        "CREATE_SPEC",
        "REVIEW_SPEC",
        "PLAN_WORK",
        "EXECUTE_TASKS",
        "MERGE_PRS",
        "VERIFY_COMPLETION",
        "HANDOFF",
    ]:
        assert state in result
        assert result[state] == {"avg": 0.0, "p50": 0.0, "p95": 0.0}


def test_get_state_durations_with_data(db):
    step = Step(step_number=1, title="Test", status="completed")
    db.add(step)
    db.flush()

    db.add_all(
        [
            Transition(
                step_id=step.id,
                from_state="INIT",
                to_state="CREATE_SPEC",
                duration_secs=100.0,
                is_self_transition=False,
            ),
            Transition(
                step_id=step.id,
                from_state="CREATE_SPEC",
                to_state="CREATE_SPEC",
                duration_secs=50.0,
                is_self_transition=True,
            ),
            Transition(
                step_id=step.id,
                from_state="CREATE_SPEC",
                to_state="REVIEW_SPEC",
                duration_secs=80.0,
                is_self_transition=False,
            ),
        ]
    )
    db.commit()

    result = get_state_durations(db)
    # Self-transition should be excluded
    assert result["CREATE_SPEC"]["avg"] == 100.0
    assert result["REVIEW_SPEC"]["avg"] == 80.0
