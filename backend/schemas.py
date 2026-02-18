"""Pydantic response models for the PEACE API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class RunSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project: Optional[str]
    log_file: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    steps_attempted: int
    steps_completed: int
    steps_failed: int
    status: Optional[str]


class StepSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: Optional[int]
    step_number: int
    title: Optional[str]
    phase: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    final_state: Optional[str]
    final_verdict: Optional[str]
    status: Optional[str]
    tasks_total: int
    tasks_completed: int
    prs_opened: Optional[str]
    prs_merged: Optional[str]
    handoff_file: Optional[str]


class TransitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    step_id: Optional[int]
    timestamp: Optional[datetime]
    from_state: Optional[str]
    to_state: Optional[str]
    verdict: Optional[str]
    duration_secs: Optional[float]
    log_level: Optional[str]
    message: Optional[str]
    note: Optional[str]
    dispatch_skill: Optional[str]
    dispatch_duration_secs: Optional[float]
    dispatch_content: Optional[str]
    is_self_transition: bool


class HandoffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    step_id: Optional[int]
    step_number: Optional[int]
    key_decisions: Optional[str]
    tradeoffs: Optional[str]
    known_risks: Optional[str]
    learnings: Optional[str]
    followups: Optional[str]
    next_step_number: Optional[int]
    next_step_title: Optional[str]


class ArbiterEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    step_id: Optional[int]
    transition_id: Optional[int]
    attempt: Optional[int]
    max_attempts: Optional[int]
    verdict: Optional[str]
    pr_number: Optional[int]
    ci_failure_file: Optional[str]


class StepDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: Optional[int]
    step_number: int
    title: Optional[str]
    phase: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    final_state: Optional[str]
    final_verdict: Optional[str]
    status: Optional[str]
    tasks_total: int
    tasks_completed: int
    prs_opened: Optional[str]
    prs_merged: Optional[str]
    handoff_file: Optional[str]
    transitions: list[TransitionOut]
    arbiter_events: list[ArbiterEventOut]


class StatsOverview(BaseModel):
    total_steps: int
    completed: int
    failed: int
    total_prs: int
    total_transitions: int
    total_self_transitions: int
    total_arbiter_events: int
    total_handoffs: int
    total_runs: int


class EnhancedStatsOverview(BaseModel):
    total_steps: int
    completed: int
    failed: int
    pass_rate: float
    avg_step_duration_secs: Optional[float]
    avg_dispatch_duration_secs: Optional[float]
    total_prs_merged: int
    total_arbiter_interventions: int
    arbiter_success_rate: float
    total_self_transitions: int


class DurationTrendItem(BaseModel):
    step: int
    title: Optional[str]
    duration_secs: Optional[float]
    status: Optional[str]


class StateDurationStats(BaseModel):
    avg: float
    p50: float
    p95: float


class FailureBreakdown(BaseModel):
    by_state: dict[str, int]
    by_verdict: dict[str, int]
    self_transitions_by_state: dict[str, int]
    arbiter_interventions: int
    arbiter_resolved: int
    arbiter_halted: int


class RecentFailureItem(BaseModel):
    step: int
    title: Optional[str]
    state: Optional[str]
    verdict: Optional[str]
    arbiter_attempts: int
    timestamp: Optional[datetime]
