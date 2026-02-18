"""Stats computation service for the PEACE dashboard."""

from __future__ import annotations

import math
from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models import ArbiterEvent, PullRequest, Step, Transition

TARGET_STATES = [
    "CREATE_SPEC",
    "REVIEW_SPEC",
    "PLAN_WORK",
    "EXECUTE_TASKS",
    "MERGE_PRS",
    "VERIFY_COMPLETION",
    "HANDOFF",
]


def _percentile(sorted_values: list[float], pct: float) -> float:
    """Compute the pct-th percentile from a pre-sorted list using linear interpolation."""
    if not sorted_values:
        return 0.0
    k = (len(sorted_values) - 1) * (pct / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_values[int(k)]
    return sorted_values[f] * (c - k) + sorted_values[c] * (k - f)


def get_overview(db: Session) -> dict:
    total_steps = db.query(func.count(Step.id)).scalar() or 0
    completed = (
        db.query(func.count(Step.id)).filter(Step.status == "completed").scalar() or 0
    )
    failed = (
        db.query(func.count(Step.id))
        .filter(Step.status.in_(["failed", "halted"]))
        .scalar()
        or 0
    )

    pass_rate = completed / total_steps if total_steps > 0 else 0.0

    steps_with_times = (
        db.query(Step.started_at, Step.ended_at)
        .filter(Step.started_at.isnot(None), Step.ended_at.isnot(None))
        .all()
    )
    if steps_with_times:
        durations = [
            (s.ended_at - s.started_at).total_seconds() for s in steps_with_times
        ]
        avg_step_duration_secs = sum(durations) / len(durations)
    else:
        avg_step_duration_secs = None

    total_prs_merged = (
        db.query(func.count(func.distinct(PullRequest.pr_number)))
        .filter(PullRequest.status == "merged")
        .scalar()
        or 0
    )

    total_arbiter = db.query(func.count(ArbiterEvent.id)).scalar() or 0
    total_self = (
        db.query(func.count(Transition.id))
        .filter(Transition.is_self_transition == True)  # noqa: E712
        .scalar()
        or 0
    )

    ARBITER_SUCCESS_VERDICTS = {
        "FIXED", "FIXED.",
        "TASKS_COMPLETE", "TASKS_COMPLETE.",
        "HANDOFF_WRITTEN", "HANDOFF_WRITTEN.",
    }
    arbiter_resolved = (
        db.query(func.count(ArbiterEvent.id))
        .filter(ArbiterEvent.verdict.in_(ARBITER_SUCCESS_VERDICTS))
        .scalar()
        or 0
    )
    arbiter_success_rate = arbiter_resolved / total_arbiter if total_arbiter > 0 else 0.0

    avg_dispatch = (
        db.query(func.avg(Transition.dispatch_duration_secs))
        .filter(Transition.dispatch_duration_secs.isnot(None))
        .scalar()
    )

    return {
        "total_steps": total_steps,
        "completed": completed,
        "failed": failed,
        "pass_rate": round(pass_rate, 4),
        "avg_step_duration_secs": (
            round(avg_step_duration_secs, 1)
            if avg_step_duration_secs is not None
            else None
        ),
        "avg_dispatch_duration_secs": (
            round(avg_dispatch, 1) if avg_dispatch is not None else None
        ),
        "total_prs_merged": total_prs_merged,
        "total_arbiter_interventions": total_arbiter,
        "arbiter_success_rate": round(arbiter_success_rate, 4),
        "total_self_transitions": total_self,
    }


def get_duration_trend(db: Session) -> list[dict]:
    steps = (
        db.query(
            Step.step_number, Step.title, Step.started_at, Step.ended_at, Step.status
        )
        .order_by(Step.step_number)
        .all()
    )
    result = []
    for s in steps:
        if s.started_at and s.ended_at:
            duration = (s.ended_at - s.started_at).total_seconds()
        else:
            duration = None
        result.append(
            {
                "step": s.step_number,
                "title": s.title,
                "duration_secs": (
                    round(duration, 1) if duration is not None else None
                ),
                "status": s.status,
            }
        )
    return result


def get_state_durations(db: Session) -> dict[str, dict]:
    transitions = (
        db.query(Transition.to_state, Transition.duration_secs)
        .filter(
            Transition.to_state.in_(TARGET_STATES),
            Transition.duration_secs.isnot(None),
            Transition.is_self_transition == False,  # noqa: E712
        )
        .all()
    )

    by_state: dict[str, list[float]] = defaultdict(list)
    for t in transitions:
        by_state[t.to_state].append(t.duration_secs)

    result = {}
    for state in TARGET_STATES:
        values = sorted(by_state.get(state, []))
        if values:
            avg = sum(values) / len(values)
            result[state] = {
                "avg": round(avg, 1),
                "p50": round(_percentile(values, 50), 1),
                "p95": round(_percentile(values, 95), 1),
            }
        else:
            result[state] = {"avg": 0.0, "p50": 0.0, "p95": 0.0}
    return result


def get_failure_breakdown(db: Session) -> dict:
    failed_steps = (
        db.query(Step.id, Step.final_state, Step.final_verdict, Step.status)
        .filter(Step.status.in_(["failed", "halted"]))
        .all()
    )

    by_state: dict[str, int] = defaultdict(int)
    by_verdict: dict[str, int] = defaultdict(int)
    for s in failed_steps:
        if s.final_state:
            by_state[s.final_state] += 1
        if s.final_verdict:
            by_verdict[s.final_verdict] += 1

    self_transitions = (
        db.query(Transition.to_state, func.count(Transition.id))
        .filter(Transition.is_self_transition == True)  # noqa: E712
        .group_by(Transition.to_state)
        .all()
    )
    self_transitions_by_state = {row[0]: row[1] for row in self_transitions if row[0]}

    total_arbiter = db.query(func.count(ArbiterEvent.id)).scalar() or 0
    arbiter_step_ids = [
        row[0]
        for row in db.query(ArbiterEvent.step_id).distinct().all()
        if row[0] is not None
    ]

    if arbiter_step_ids:
        resolved = (
            db.query(func.count(Step.id))
            .filter(Step.id.in_(arbiter_step_ids), Step.status == "completed")
            .scalar()
            or 0
        )
        halted = (
            db.query(func.count(Step.id))
            .filter(
                Step.id.in_(arbiter_step_ids),
                Step.status.in_(["failed", "halted"]),
            )
            .scalar()
            or 0
        )
    else:
        resolved = 0
        halted = 0

    return {
        "by_state": dict(by_state),
        "by_verdict": dict(by_verdict),
        "self_transitions_by_state": self_transitions_by_state,
        "arbiter_interventions": total_arbiter,
        "arbiter_resolved": resolved,
        "arbiter_halted": halted,
    }


def get_recent_failures(db: Session, limit: int = 20) -> list[dict]:
    failed_steps = (
        db.query(Step)
        .filter(Step.status.in_(["failed", "halted"]))
        .order_by(Step.ended_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for step in failed_steps:
        arbiter_count = (
            db.query(func.count(ArbiterEvent.id))
            .filter(ArbiterEvent.step_id == step.id)
            .scalar()
            or 0
        )
        result.append(
            {
                "step": step.step_number,
                "title": step.title,
                "state": step.final_state,
                "verdict": step.final_verdict,
                "arbiter_attempts": arbiter_count,
                "timestamp": step.ended_at,
            }
        )
    return result
