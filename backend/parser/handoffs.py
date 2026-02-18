"""Parse ORDER handoff YAML files (handoffs/step-N_HANDOFF.yml)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

HANDOFF_RE = re.compile(r"step-(\d+)_HANDOFF\.yml$")


@dataclass
class HandoffRecord:
    step_number: int
    title: Optional[str] = None
    phase: Optional[str] = None
    phase_number: Optional[int] = None
    status: Optional[str] = None
    tasks_completed: int = 0
    prs_merged_numbers: list[int] = field(default_factory=list)
    key_decisions: str = "[]"  # JSON
    tradeoffs: str = "[]"  # JSON
    known_risks: str = "[]"  # JSON
    learnings: str = "[]"  # JSON
    followups: str = "[]"  # JSON
    next_step_number: Optional[int] = None
    next_step_title: Optional[str] = None
    file_path: Optional[str] = None


def parse_handoff_file(path: Path) -> Optional[HandoffRecord]:
    """Parse a single handoff YAML file."""
    m = HANDOFF_RE.search(path.name)
    if not m:
        return None

    step_number = int(m.group(1))

    with open(path) as f:
        data = yaml.safe_load(f)

    if not data:
        return None

    step_info = data.get("step_completed", {})
    exec_summary = data.get("execution_summary", {})
    prs_merged = exec_summary.get("prs_merged", {})
    next_step = data.get("next_step", {})

    # Normalize status
    raw_status = step_info.get("status", "")
    status = "completed" if raw_status == "COMPLETE" else raw_status.lower() if raw_status else None

    return HandoffRecord(
        step_number=step_number,
        title=step_info.get("title"),
        phase=step_info.get("phase"),
        phase_number=step_info.get("phase_number"),
        status=status,
        tasks_completed=exec_summary.get("tasks_completed", 0),
        prs_merged_numbers=prs_merged.get("numbers", []),
        key_decisions=json.dumps(data.get("key_decisions", [])),
        tradeoffs=json.dumps(data.get("tradeoffs", [])),
        known_risks=json.dumps(data.get("known_risks", [])),
        learnings=json.dumps(data.get("learnings", [])),
        followups=json.dumps(data.get("followups", [])),
        next_step_number=next_step.get("number"),
        next_step_title=next_step.get("title"),
        file_path=str(path),
    )


def parse_handoffs(order_dir: Path) -> list[HandoffRecord]:
    """Parse all handoff files from an ORDER directory."""
    handoff_dir = order_dir / "handoffs"
    if not handoff_dir.exists():
        return []

    records: list[HandoffRecord] = []
    for path in sorted(handoff_dir.glob("step-*_HANDOFF.yml")):
        record = parse_handoff_file(path)
        if record:
            records.append(record)

    return records
