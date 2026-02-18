"""Parse ORDER structured data files: state.json, history.jsonl, history-prs.jsonl."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from dateutil.parser import isoparse

STEP_TASK_RE = re.compile(r"^step-(\d+)-task-\d+$")


@dataclass
class TransitionRecord:
    from_state: str
    to_state: str
    timestamp: datetime
    note: Optional[str] = None
    is_self_transition: bool = False


@dataclass
class PRRecord:
    pr_number: int
    task_id: Optional[str] = None
    step_number: Optional[int] = None
    title: Optional[str] = None
    status: str = "merged"
    merged_at: Optional[datetime] = None


@dataclass
class StructuredData:
    transitions: list[TransitionRecord] = field(default_factory=list)
    prs: list[PRRecord] = field(default_factory=list)
    step_numbers: set[int] = field(default_factory=set)
    completed_tasks: list[str] = field(default_factory=list)
    current_state: Optional[str] = None
    current_step: Optional[int] = None


def extract_step_number(task_id: str) -> Optional[int]:
    """Extract step number from a task ID like 'step-85-task-1'."""
    m = STEP_TASK_RE.match(task_id)
    return int(m.group(1)) if m else None


def parse_history_jsonl(path: Path) -> list[TransitionRecord]:
    """Parse history.jsonl, deduplicating by (from, to, at)."""
    seen: set[tuple[str, str, str]] = set()
    records: list[TransitionRecord] = []

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            key = (data["from"], data["to"], data["at"])
            if key in seen:
                continue
            seen.add(key)
            records.append(TransitionRecord(
                from_state=data["from"],
                to_state=data["to"],
                timestamp=isoparse(data["at"]),
                note=data.get("note"),
                is_self_transition=data["from"] == data["to"],
            ))

    return records


def parse_history_prs(path: Path) -> list[PRRecord]:
    """Parse history-prs.jsonl handling both legacy and new formats.

    Deduplicates by pr_number — the source file contains heavy duplication.
    """
    seen: set[int] = set()
    records: list[PRRecord] = []

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)

            if "key" in data:
                # Legacy: {"key":"104","value":{"task":"...","status":"merged"}}
                pr_number = int(data["key"])
                if pr_number in seen:
                    continue
                seen.add(pr_number)
                task_id = data["value"]["task"]
                records.append(PRRecord(
                    pr_number=pr_number,
                    task_id=task_id,
                    step_number=extract_step_number(task_id),
                    status=data["value"].get("status", "merged"),
                ))
            elif "pr" in data:
                # New: {"step":85,"task":"...","pr":180,"title":"...","merged":"..."}
                pr_number = data["pr"]
                if pr_number in seen:
                    continue
                seen.add(pr_number)
                records.append(PRRecord(
                    pr_number=pr_number,
                    task_id=data["task"],
                    step_number=data.get("step"),
                    title=data.get("title"),
                    status="merged",
                    merged_at=isoparse(data["merged"]) if data.get("merged") else None,
                ))

    return records


def parse_state_json(path: Path) -> tuple[list[PRRecord], list[str], set[int], Optional[str], Optional[int]]:
    """Parse state.json. Returns (prs, completed_tasks, step_numbers, current_state, current_step)."""
    with open(path) as f:
        data = json.load(f)

    prs: list[PRRecord] = []
    for pr_num_str, info in data.get("prs", {}).items():
        task_id = info.get("task", "")
        prs.append(PRRecord(
            pr_number=int(pr_num_str),
            task_id=task_id,
            step_number=extract_step_number(task_id),
            status=info.get("status", "unknown"),
        ))

    completed = data.get("completed", [])

    step_numbers: set[int] = set()
    for task_id in completed:
        sn = extract_step_number(task_id)
        if sn is not None:
            step_numbers.add(sn)

    return (
        prs,
        completed,
        step_numbers,
        data.get("current_state"),
        data.get("step_number"),
    )


def parse_structured(order_dir: Path) -> StructuredData:
    """Parse all structured data files from an ORDER directory."""
    result = StructuredData()

    # history.jsonl
    history_path = order_dir / "history.jsonl"
    if history_path.exists():
        result.transitions = parse_history_jsonl(history_path)

    # history-prs.jsonl
    prs_path = order_dir / "history-prs.jsonl"
    if prs_path.exists():
        result.prs = parse_history_prs(prs_path)

    # state.json
    state_path = order_dir / "state.json"
    if state_path.exists():
        state_prs, completed, step_nums, cur_state, cur_step = parse_state_json(state_path)

        # Merge PRs from state.json (add any not already in history-prs)
        existing_pr_nums = {pr.pr_number for pr in result.prs}
        for pr in state_prs:
            if pr.pr_number not in existing_pr_nums:
                result.prs.append(pr)

        result.completed_tasks = completed
        result.step_numbers = step_nums
        result.current_state = cur_state
        result.current_step = cur_step

    return result
