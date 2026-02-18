from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    project: Mapped[Optional[str]] = mapped_column(Text)
    log_file: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]]
    ended_at: Mapped[Optional[datetime]]
    steps_attempted: Mapped[int] = mapped_column(Integer, default=0)
    steps_completed: Mapped[int] = mapped_column(Integer, default=0)
    steps_failed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[Optional[str]] = mapped_column(Text)

    steps: Mapped[list["Step"]] = relationship(back_populates="run")


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[Optional[int]] = mapped_column(ForeignKey("runs.id"))
    step_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[Optional[str]] = mapped_column(Text)
    phase: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]]
    ended_at: Mapped[Optional[datetime]]
    final_state: Mapped[Optional[str]] = mapped_column(Text)
    final_verdict: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(Text)
    tasks_total: Mapped[int] = mapped_column(Integer, default=0)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    prs_opened: Mapped[Optional[str]] = mapped_column(Text)  # JSON array
    prs_merged: Mapped[Optional[str]] = mapped_column(Text)  # JSON array
    handoff_file: Mapped[Optional[str]] = mapped_column(Text)

    run: Mapped[Optional["Run"]] = relationship(back_populates="steps")
    transitions: Mapped[list["Transition"]] = relationship(back_populates="step")
    arbiter_events: Mapped[list["ArbiterEvent"]] = relationship(back_populates="step")
    pull_requests: Mapped[list["PullRequest"]] = relationship(back_populates="step")
    handoff: Mapped[Optional["Handoff"]] = relationship(back_populates="step", uselist=False)


class Transition(Base):
    __tablename__ = "transitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_id: Mapped[Optional[int]] = mapped_column(ForeignKey("steps.id"))
    timestamp: Mapped[Optional[datetime]]
    from_state: Mapped[Optional[str]] = mapped_column(Text)
    to_state: Mapped[Optional[str]] = mapped_column(Text)
    verdict: Mapped[Optional[str]] = mapped_column(Text)
    duration_secs: Mapped[Optional[float]] = mapped_column(Float)
    log_level: Mapped[Optional[str]] = mapped_column(Text)
    message: Mapped[Optional[str]] = mapped_column(Text)
    note: Mapped[Optional[str]] = mapped_column(Text)
    dispatch_skill: Mapped[Optional[str]] = mapped_column(Text)
    dispatch_duration_secs: Mapped[Optional[float]] = mapped_column(Float)
    dispatch_content: Mapped[Optional[str]] = mapped_column(Text)
    is_self_transition: Mapped[bool] = mapped_column(Boolean, default=False)

    step: Mapped[Optional["Step"]] = relationship(back_populates="transitions")
    arbiter_events: Mapped[list["ArbiterEvent"]] = relationship(back_populates="transition")


class ArbiterEvent(Base):
    __tablename__ = "arbiter_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_id: Mapped[Optional[int]] = mapped_column(ForeignKey("steps.id"))
    transition_id: Mapped[Optional[int]] = mapped_column(ForeignKey("transitions.id"))
    attempt: Mapped[Optional[int]] = mapped_column(Integer)
    max_attempts: Mapped[Optional[int]] = mapped_column(Integer)
    verdict: Mapped[Optional[str]] = mapped_column(Text)
    pr_number: Mapped[Optional[int]] = mapped_column(Integer)
    ci_failure_file: Mapped[Optional[str]] = mapped_column(Text)

    step: Mapped[Optional["Step"]] = relationship(back_populates="arbiter_events")
    transition: Mapped[Optional["Transition"]] = relationship(back_populates="arbiter_events")


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_id: Mapped[Optional[int]] = mapped_column(ForeignKey("steps.id"))
    pr_number: Mapped[Optional[int]] = mapped_column(Integer)
    task_id: Mapped[Optional[str]] = mapped_column(Text)
    title: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(Text)
    merged_at: Mapped[Optional[datetime]]

    step: Mapped[Optional["Step"]] = relationship(back_populates="pull_requests")


class Handoff(Base):
    __tablename__ = "handoffs"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_id: Mapped[Optional[int]] = mapped_column(ForeignKey("steps.id"))
    step_number: Mapped[Optional[int]] = mapped_column(Integer)
    key_decisions: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    tradeoffs: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    known_risks: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    learnings: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    followups: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    next_step_number: Mapped[Optional[int]] = mapped_column(Integer)
    next_step_title: Mapped[Optional[str]] = mapped_column(Text)

    step: Mapped[Optional["Step"]] = relationship(back_populates="handoff")
