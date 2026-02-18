"""Parse ORDER log files: order-run-*.log and step-N-*.log."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from dateutil.parser import isoparse

# Log line: [timestamp] [LEVEL] [step:N/STATE] message
LOG_LINE_RE = re.compile(
    r"\[([^\]]+)\]\s+"  # timestamp
    r"\[(INFO|WARN|ERROR|DEBUG)\]\s+"  # level
    r"\[step:([^\]]+)\]\s+"  # step context
    r"(.*)"  # message
)

# Step context: "102/MERGE_PRS" or "?/?"
STEP_CTX_RE = re.compile(r"(\d+|\?)/(.+)")

# State separator: ──── STATE_NAME (verdict: VERDICT) ────
# or ──── STATE_NAME ────
SEPARATOR_RE = re.compile(r"─+\s+(\S+)(?:\s+\(verdict:\s+(\S+)\))?\s*─*$")

# Step title from === Step N: Title ===
STEP_TITLE_RE = re.compile(r"=== Step (\d+): (.+?) ===")

# Step complete marker
STEP_COMPLETE_RE = re.compile(r"─+\s+Step\s+(\d+)\s+Complete\s*─*$")

# Dispatch blocks
DISPATCH_START_RE = re.compile(r"^=== Dispatch: (/\S+)(.*?) ===$")
WORK_START_RE = re.compile(r"^=== /work (\S+) \(exit: (\d+), (\d+)s\) ===$")
DISPATCH_END_RE = re.compile(r"^=== End Dispatch ===$")
WORK_END_RE = re.compile(r"^=== End /work")

# Dispatch OK timing: Dispatch OK (Ns): /skill
DISPATCH_OK_RE = re.compile(r"Dispatch OK \((\d+)s\): (/\S+)")

# Arbiter patterns
FIX_ATTEMPT_RE = re.compile(
    r"(?:Arbiter fix attempt|Fix attempt) (\d+)/(\d+) for PR #(\d+)"
)
ARBITER_INVOKE_RE = re.compile(
    r"(?:Dispatching CI-fix arbiter|Invoking arbiter) \(attempt (\d+)/(\d+)\)"
)
ARBITER_HALT_RE = re.compile(r"Arbiter: HALT \(verdict: (\S+)\)")
ARBITER_VERDICT_RE = re.compile(r"Arbiter: (\S+)")
ARBITER_EMPTY_RE = re.compile(r"Arbiter returned empty/null verdict for PR #(\d+)")

# Run filename: order-run-YYYYMMDDTHHMMSS.log
RUN_FILENAME_RE = re.compile(r"order-run-(\d{8}T\d{6})\.log$")

# Step filename: step-N-title-YYYYMMDDTHHMMSS.log
STEP_FILENAME_RE = re.compile(r"step-(\d+)-(.+?)-(\d{8}T\d{6})\.log$")


@dataclass
class LogTransition:
    timestamp: datetime
    step_number: Optional[int]
    from_state: Optional[str]
    to_state: str
    verdict: Optional[str] = None
    log_level: str = "INFO"
    message: str = ""
    is_self_transition: bool = False


@dataclass
class DispatchBlock:
    skill: str
    step_number: Optional[int] = None
    duration_secs: Optional[float] = None
    started_at: Optional[datetime] = None
    content: str = ""


@dataclass
class ArbiterRecord:
    step_number: Optional[int] = None
    attempt: Optional[int] = None
    max_attempts: Optional[int] = None
    verdict: Optional[str] = None
    pr_number: Optional[int] = None
    timestamp: Optional[datetime] = None


@dataclass
class RunRecord:
    log_file: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: str = "completed"
    step_numbers: list[int] = field(default_factory=list)


@dataclass
class StepLogData:
    step_number: int
    title: Optional[str] = None
    log_file: str = ""
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    transitions: list[LogTransition] = field(default_factory=list)
    dispatches: list[DispatchBlock] = field(default_factory=list)
    arbiter_events: list[ArbiterRecord] = field(default_factory=list)
    final_state: Optional[str] = None
    final_verdict: Optional[str] = None
    completed: bool = False


def parse_log_line(line: str) -> Optional[tuple[datetime, str, Optional[int], str, str]]:
    """Parse a log line. Returns (timestamp, level, step_number, state, message) or None."""
    m = LOG_LINE_RE.match(line)
    if not m:
        return None
    ts_str, level, ctx, message = m.groups()
    timestamp = isoparse(ts_str)

    step_number = None
    state = "?"
    cm = STEP_CTX_RE.match(ctx)
    if cm:
        sn, st = cm.groups()
        step_number = int(sn) if sn != "?" else None
        state = st if st != "?" else "?"

    return timestamp, level, step_number, state, message


def parse_log_file(path: Path) -> tuple[
    list[LogTransition], list[DispatchBlock], list[ArbiterRecord],
    Optional[datetime], Optional[datetime], set[int], dict[int, str]
]:
    """Parse a single log file. Returns transitions, dispatches, arbiter events,
    first timestamp, last timestamp, step numbers seen, and step titles found."""
    transitions: list[LogTransition] = []
    dispatches: list[DispatchBlock] = []
    arbiter_events: list[ArbiterRecord] = []
    step_numbers: set[int] = set()
    step_titles: dict[int, str] = {}

    first_ts: Optional[datetime] = None
    last_ts: Optional[datetime] = None
    prev_state: Optional[str] = None
    current_step: Optional[int] = None

    in_dispatch = False
    dispatch_content_lines: list[str] = []
    current_dispatch: Optional[DispatchBlock] = None

    with open(path, errors="replace") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")

            # Check for dispatch block boundaries first (these aren't log-formatted)
            if not in_dispatch:
                dm = DISPATCH_START_RE.match(line)
                wm = WORK_START_RE.match(line)
                if dm:
                    in_dispatch = True
                    dispatch_content_lines = []
                    current_dispatch = DispatchBlock(
                        skill=dm.group(1),
                        step_number=current_step,
                    )
                    continue
                elif wm:
                    in_dispatch = True
                    dispatch_content_lines = []
                    current_dispatch = DispatchBlock(
                        skill="/work",
                        step_number=current_step,
                        duration_secs=float(wm.group(3)),
                    )
                    continue
            else:
                if DISPATCH_END_RE.match(line) or WORK_END_RE.match(line):
                    if current_dispatch:
                        current_dispatch.content = "\n".join(dispatch_content_lines)
                        dispatches.append(current_dispatch)
                    in_dispatch = False
                    current_dispatch = None
                    dispatch_content_lines = []
                    continue
                else:
                    dispatch_content_lines.append(line)
                    continue

            # Parse structured log lines
            parsed = parse_log_line(line)
            if not parsed:
                # Check for step title in non-log lines
                tm = STEP_TITLE_RE.search(line)
                if tm:
                    step_titles[int(tm.group(1))] = tm.group(2)
                continue

            timestamp, level, step_number, state, message = parsed

            if first_ts is None:
                first_ts = timestamp
            last_ts = timestamp

            if step_number is not None:
                step_numbers.add(step_number)
                current_step = step_number

            # Check for step title in message
            tm = STEP_TITLE_RE.search(message)
            if tm:
                step_titles[int(tm.group(1))] = tm.group(2)

            # Check for state separator
            sm = SEPARATOR_RE.search(message)
            if sm:
                new_state = sm.group(1)
                verdict = sm.group(2)

                # Skip "Step N Complete" markers and "PR #N" markers
                if STEP_COMPLETE_RE.search(message) or re.match(r"PR #\d+", new_state):
                    continue

                transitions.append(LogTransition(
                    timestamp=timestamp,
                    step_number=step_number,
                    from_state=prev_state,
                    to_state=new_state,
                    verdict=verdict,
                    log_level=level,
                    message=message,
                    is_self_transition=(prev_state == new_state),
                ))
                prev_state = new_state
                continue

            # Check for dispatch timing
            dok = DISPATCH_OK_RE.search(message)
            if dok and dispatches:
                dur = float(dok.group(1))
                skill = dok.group(2)
                # Match to most recent dispatch with same skill
                for d in reversed(dispatches):
                    if d.skill == skill and d.duration_secs is None:
                        d.duration_secs = dur
                        d.started_at = timestamp
                        break

            # Check for arbiter events
            fa = FIX_ATTEMPT_RE.search(message)
            if fa:
                arbiter_events.append(ArbiterRecord(
                    step_number=step_number,
                    attempt=int(fa.group(1)),
                    max_attempts=int(fa.group(2)),
                    pr_number=int(fa.group(3)),
                    timestamp=timestamp,
                ))

            ai = ARBITER_INVOKE_RE.search(message)
            if ai:
                arbiter_events.append(ArbiterRecord(
                    step_number=step_number,
                    attempt=int(ai.group(1)),
                    max_attempts=int(ai.group(2)),
                    timestamp=timestamp,
                ))

            ah = ARBITER_HALT_RE.search(message)
            if ah:
                # Update the most recent arbiter event with the verdict
                if arbiter_events:
                    arbiter_events[-1].verdict = ah.group(1)

            ae = ARBITER_EMPTY_RE.search(message)
            if ae:
                if arbiter_events:
                    arbiter_events[-1].verdict = "EMPTY"
                    arbiter_events[-1].pr_number = int(ae.group(1))

            av = ARBITER_VERDICT_RE.search(message)
            if av and not ah and not ae:
                if arbiter_events and arbiter_events[-1].verdict is None:
                    arbiter_events[-1].verdict = av.group(1)

    return transitions, dispatches, arbiter_events, first_ts, last_ts, step_numbers, step_titles


def parse_run_logs(order_dir: Path) -> list[RunRecord]:
    """Parse all order-run-*.log files into RunRecords."""
    logs_dir = order_dir / "logs"
    if not logs_dir.exists():
        return []

    runs: list[RunRecord] = []
    for path in sorted(logs_dir.glob("order-run-*.log")):
        _, _, _, first_ts, last_ts, step_nums, _ = parse_log_file(path)

        # Determine status from last lines
        status = "completed"
        try:
            with open(path, errors="replace") as f:
                lines = f.readlines()
            for line in reversed(lines[-20:]):
                if "HALT" in line or "MERGE_BLOCKED" in line:
                    status = "halted"
                    break
        except Exception:
            pass

        runs.append(RunRecord(
            log_file=path.name,
            started_at=first_ts,
            ended_at=last_ts,
            status=status,
            step_numbers=sorted(step_nums),
        ))

    return runs


def parse_step_logs(order_dir: Path) -> list[StepLogData]:
    """Parse all step-N-*.log files into StepLogData."""
    logs_dir = order_dir / "logs"
    if not logs_dir.exists():
        return []

    # Group by step number — if multiple logs per step, use the latest
    step_files: dict[int, Path] = {}
    for path in sorted(logs_dir.glob("step-*.log")):
        m = STEP_FILENAME_RE.match(path.name)
        if m:
            sn = int(m.group(1))
            step_files[sn] = path  # sorted order means latest wins

    results: list[StepLogData] = []
    for step_number, path in sorted(step_files.items()):
        transitions, dispatches, arbiter_events, first_ts, last_ts, _, step_titles = parse_log_file(path)

        title = step_titles.get(step_number)

        # Determine final state and verdict from last transition
        final_state = None
        final_verdict = None
        completed = False
        if transitions:
            final_state = transitions[-1].to_state
            final_verdict = transitions[-1].verdict

        # Check for step complete marker
        try:
            with open(path, errors="replace") as f:
                content = f.read()
            if re.search(rf"Step\s+{step_number}\s+Complete", content):
                completed = True
        except Exception:
            pass

        results.append(StepLogData(
            step_number=step_number,
            title=title,
            log_file=path.name,
            started_at=first_ts,
            ended_at=last_ts,
            transitions=transitions,
            dispatches=dispatches,
            arbiter_events=arbiter_events,
            final_state=final_state,
            final_verdict=final_verdict,
            completed=completed,
        ))

    return results
