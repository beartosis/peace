"""CLI tool to ingest ORDER data into the PEACE database."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.database import Base
from backend.models import (
    ArbiterEvent,
    Handoff,
    PullRequest,
    Run,
    Step,
    Transition,
)
from backend.parser.handoffs import parse_handoffs
from backend.parser.logs import parse_run_logs, parse_step_logs
from backend.parser.structured import parse_structured

logger = logging.getLogger(__name__)


def ingest(order_dir: Path, project: str, db_path: Path) -> dict:
    """Ingest all ORDER data into the database. Returns summary counts."""
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()

    try:
        return _ingest(session, order_dir, project)
    finally:
        session.close()


def _ingest(session: Session, order_dir: Path, project: str) -> dict:
    counts = {
        "steps": 0,
        "transitions": 0,
        "prs": 0,
        "handoffs": 0,
        "arbiter_events": 0,
        "runs": 0,
    }

    # Step 1: Parse handoffs → create Step + Handoff records
    handoff_records = parse_handoffs(order_dir)
    step_map: dict[int, Step] = {}  # step_number -> Step ORM object

    for h in handoff_records:
        step = Step(
            step_number=h.step_number,
            title=h.title,
            phase=h.phase,
            status=h.status or "completed",
            tasks_completed=h.tasks_completed,
            prs_merged=json.dumps(h.prs_merged_numbers) if h.prs_merged_numbers else None,
            handoff_file=h.file_path,
        )
        session.add(step)
        session.flush()
        step_map[h.step_number] = step

        handoff = Handoff(
            step_id=step.id,
            step_number=h.step_number,
            key_decisions=h.key_decisions,
            tradeoffs=h.tradeoffs,
            known_risks=h.known_risks,
            learnings=h.learnings,
            followups=h.followups,
            next_step_number=h.next_step_number,
            next_step_title=h.next_step_title,
        )
        session.add(handoff)
        counts["handoffs"] += 1

    # Step 2: Parse structured data → enrich Steps, create PRs + Transitions
    structured = parse_structured(order_dir)

    # Create Step records for steps not already in step_map
    for sn in sorted(structured.step_numbers):
        if sn not in step_map:
            step = Step(step_number=sn, status="completed")
            session.add(step)
            session.flush()
            step_map[sn] = step

    # Create Transition records from history.jsonl
    for t in structured.transitions:
        transition = Transition(
            timestamp=t.timestamp,
            from_state=t.from_state,
            to_state=t.to_state,
            note=t.note,
            is_self_transition=t.is_self_transition,
        )
        session.add(transition)
        counts["transitions"] += 1

    # Create PullRequest records
    for pr in structured.prs:
        step = step_map.get(pr.step_number) if pr.step_number else None
        pull_request = PullRequest(
            step_id=step.id if step else None,
            pr_number=pr.pr_number,
            task_id=pr.task_id,
            title=pr.title,
            status=pr.status,
            merged_at=pr.merged_at,
        )
        session.add(pull_request)
        counts["prs"] += 1

    session.flush()

    # Step 3: Parse step logs → enrich Steps, add more transitions + arbiter events
    step_log_data = parse_step_logs(order_dir)
    for sld in step_log_data:
        step = step_map.get(sld.step_number)
        if not step:
            step = Step(step_number=sld.step_number, status="completed")
            session.add(step)
            session.flush()
            step_map[sld.step_number] = step

        # Enrich step with log data
        if sld.title and not step.title:
            step.title = sld.title
        if sld.started_at:
            step.started_at = sld.started_at
        if sld.ended_at:
            step.ended_at = sld.ended_at
        if sld.final_state:
            step.final_state = sld.final_state
        if sld.final_verdict:
            step.final_verdict = sld.final_verdict
        if sld.completed:
            step.status = "completed"

        # Add transitions from log
        for lt in sld.transitions:
            transition = Transition(
                step_id=step.id,
                timestamp=lt.timestamp,
                from_state=lt.from_state,
                to_state=lt.to_state,
                verdict=lt.verdict,
                log_level=lt.log_level,
                message=lt.message,
                is_self_transition=lt.is_self_transition,
            )
            session.add(transition)
            counts["transitions"] += 1

        # Match dispatches to log-derived transitions (same step_id)
        step_transitions = [
            t for t in session.query(Transition).filter(
                Transition.step_id == step.id,
            ).order_by(Transition.timestamp).all()
            if t.timestamp is not None
        ]
        for d in sld.dispatches:
            if d.duration_secs is not None and d.started_at:
                for trans in step_transitions:
                    if trans.dispatch_skill is None:
                        try:
                            # Make both naive for comparison
                            t1 = d.started_at.replace(tzinfo=None)
                            t2 = trans.timestamp.replace(tzinfo=None) if trans.timestamp else None
                            if t2 and abs((t1 - t2).total_seconds()) < 600:
                                trans.dispatch_skill = d.skill
                                trans.dispatch_duration_secs = d.duration_secs
                                trans.dispatch_content = d.content
                                break
                        except (TypeError, AttributeError):
                            continue

        # Add arbiter events
        for ae in sld.arbiter_events:
            arbiter = ArbiterEvent(
                step_id=step.id,
                attempt=ae.attempt,
                max_attempts=ae.max_attempts,
                verdict=ae.verdict,
                pr_number=ae.pr_number,
            )
            session.add(arbiter)
            counts["arbiter_events"] += 1

    session.flush()

    # Step 4: Parse order-run logs → create Run records
    run_records = parse_run_logs(order_dir)
    for rr in run_records:
        run = Run(
            project=project,
            log_file=rr.log_file,
            started_at=rr.started_at,
            ended_at=rr.ended_at,
            status=rr.status,
        )
        session.add(run)
        session.flush()

        # Associate steps with this run by timestamp overlap
        if rr.started_at and rr.ended_at:
            for sn, step in step_map.items():
                if step.started_at and step.run_id is None:
                    if rr.started_at <= step.started_at <= rr.ended_at:
                        step.run_id = run.id

        # Also associate by step numbers found in log
        for sn in rr.step_numbers:
            step = step_map.get(sn)
            if step and step.run_id is None:
                step.run_id = run.id

        counts["runs"] += 1

    # Step 5: Assign orphaned steps to the nearest preceding run
    runs_by_start = sorted(
        session.query(Run).filter(Run.started_at.isnot(None)).all(),
        key=lambda r: r.started_at.replace(tzinfo=None),
    )
    for sn, step in step_map.items():
        if step.run_id is None and step.started_at:
            step_ts = step.started_at.replace(tzinfo=None)
            best = None
            for run in runs_by_start:
                if run.started_at.replace(tzinfo=None) <= step_ts:
                    best = run
                else:
                    break
            if best is not None:
                step.run_id = best.id

    # Step 6: Compute run aggregates
    for run in session.query(Run).all():
        steps = session.query(Step).filter(Step.run_id == run.id).all()
        run.steps_attempted = len(steps)
        run.steps_completed = sum(1 for s in steps if s.status == "completed")
        run.steps_failed = sum(1 for s in steps if s.status in ("failed", "halted"))

    counts["steps"] = len(step_map)
    session.commit()
    return counts


class IngestWatcher:
    """Poll ORDER directory for changes and trigger re-ingest.

    Computes a fingerprint from key file sizes/counts.  When the fingerprint
    changes, runs a full delete-then-reingest in one transaction so readers
    see old data until the commit completes.
    """

    def __init__(
        self,
        order_dir: Path,
        project: str,
        session_factory,
        poll_interval: float = 30.0,
    ) -> None:
        self._order_dir = order_dir
        self._project = project
        self._session_factory = session_factory
        self._poll_interval = poll_interval
        self._running: bool = False
        self._last_fingerprint: Optional[tuple] = None

    def _compute_fingerprint(self) -> tuple:
        """Return a tuple representing the current state of ORDER data files."""

        def _safe_size(p: Path) -> int:
            try:
                return p.stat().st_size if p.exists() else 0
            except OSError:
                return 0

        history_size = _safe_size(self._order_dir / "history.jsonl")
        history_prs_size = _safe_size(self._order_dir / "history-prs.jsonl")

        logs_dir = self._order_dir / "logs"
        log_count = 0
        log_total_size = 0
        if logs_dir.is_dir():
            try:
                for f in logs_dir.iterdir():
                    if f.suffix == ".log":
                        log_count += 1
                        try:
                            log_total_size += f.stat().st_size
                        except OSError:
                            pass
            except OSError:
                pass

        handoffs_dir = self._order_dir / "handoffs"
        handoff_count = 0
        if handoffs_dir.is_dir():
            try:
                handoff_count = sum(
                    1 for f in handoffs_dir.iterdir() if f.suffix in (".yml", ".yaml")
                )
            except OSError:
                pass

        return (history_size, history_prs_size, log_count, log_total_size, handoff_count)

    async def start(self) -> None:
        """Start watching. Meant to run as an asyncio task."""
        self._running = True
        self._last_fingerprint = self._compute_fingerprint()
        logger.info(
            "IngestWatcher started for %s (poll every %.0fs)",
            self._order_dir,
            self._poll_interval,
        )
        while self._running:
            await asyncio.sleep(self._poll_interval)
            if not self._running:
                break
            await self._check()

    def stop(self) -> None:
        """Signal the watcher to stop."""
        self._running = False

    async def _check(self) -> None:
        """Compare fingerprint and trigger re-ingest if changed."""
        current = self._compute_fingerprint()
        if current == self._last_fingerprint:
            return

        logger.info("ORDER data changed, re-ingesting...")
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._do_reingest)
            self._last_fingerprint = current
            logger.info("Re-ingest completed successfully")
        except Exception:
            logger.exception("Re-ingest failed")

    def _do_reingest(self) -> None:
        """Run full re-ingest in a single transaction (called from executor)."""
        session = self._session_factory()
        try:
            # Delete children first to respect FK order
            session.query(ArbiterEvent).delete()
            session.query(Transition).delete()
            session.query(PullRequest).delete()
            session.query(Handoff).delete()
            session.query(Step).delete()
            session.query(Run).delete()
            session.flush()

            _ingest(session, self._order_dir, self._project)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


def main():
    parser = argparse.ArgumentParser(description="Ingest ORDER data into PEACE database")
    parser.add_argument("order_dir", type=Path, help="Path to ORDER data directory")
    parser.add_argument("--project", type=str, default=None, help="Project name (default: parent dir name)")
    parser.add_argument("--db", type=Path, default=Path("peace.db"), help="Database file path")
    args = parser.parse_args()

    if not args.order_dir.exists():
        print(f"Error: {args.order_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    project = args.project or args.order_dir.resolve().parent.parent.parent.name
    print(f"Ingesting ORDER data from {args.order_dir}")
    print(f"Project: {project}")
    print(f"Database: {args.db}")

    # Remove existing DB to start fresh
    if args.db.exists():
        args.db.unlink()

    counts = ingest(args.order_dir, project, args.db)

    print(f"\nIngested:")
    print(f"  Runs:            {counts['runs']}")
    print(f"  Steps:           {counts['steps']}")
    print(f"  Transitions:     {counts['transitions']}")
    print(f"  Pull Requests:   {counts['prs']}")
    print(f"  Handoffs:        {counts['handoffs']}")
    print(f"  Arbiter Events:  {counts['arbiter_events']}")


if __name__ == "__main__":
    main()
