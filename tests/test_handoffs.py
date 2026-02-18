"""Tests for backend.parser.handoffs."""

import json
import os
from pathlib import Path

from backend.parser.handoffs import parse_handoff_file, parse_handoffs

SAMPLE_HANDOFF = """\
# ORDER Handoff: Step 102 -> Step 103

step_completed:
  number: 102
  title: "Combat Replay Storage"
  phase: "Combat Rewards"
  phase_number: 12
  status: COMPLETE

execution_summary:
  prs_merged:
    count: 1
    numbers: [214]
  tasks_completed: 1

key_decisions:
  - context: "How to store combat replay data"
    decision: "Store as JSONB"
    actor: "order"
    rationale: "Simpler schema"

tradeoffs:
  - "JSONB column rather than separate table"

known_risks:
  - "Large JSONB could impact performance"

learnings:
  - source: "Step 102"
    insight: "JSONB keeps schema simple"

standards_updated: []

followups:
  - "Consider adding GIN index"

next_step:
  number: 103
  title: "Character Experience System"
  phase: "Combat Rewards"
  dependencies: ["102"]
  estimated_complexity: "M"

roadmap_progress:
  completed: 102
  total: 342
  current_phase: "12/49"
"""


def test_parse_handoff_file(tmp_path):
    p = tmp_path / "step-102_HANDOFF.yml"
    p.write_text(SAMPLE_HANDOFF)
    record = parse_handoff_file(p)

    assert record is not None
    assert record.step_number == 102
    assert record.title == "Combat Replay Storage"
    assert record.phase == "Combat Rewards"
    assert record.phase_number == 12
    assert record.status == "completed"
    assert record.tasks_completed == 1
    assert record.prs_merged_numbers == [214]
    assert record.next_step_number == 103
    assert record.next_step_title == "Character Experience System"


def test_handoff_json_fields(tmp_path):
    p = tmp_path / "step-102_HANDOFF.yml"
    p.write_text(SAMPLE_HANDOFF)
    record = parse_handoff_file(p)

    decisions = json.loads(record.key_decisions)
    assert len(decisions) == 1
    assert decisions[0]["decision"] == "Store as JSONB"

    tradeoffs = json.loads(record.tradeoffs)
    assert len(tradeoffs) == 1

    risks = json.loads(record.known_risks)
    assert len(risks) == 1

    learnings = json.loads(record.learnings)
    assert len(learnings) == 1
    assert learnings[0]["source"] == "Step 102"

    followups = json.loads(record.followups)
    assert len(followups) == 1


def test_parse_handoff_bad_filename(tmp_path):
    p = tmp_path / "not-a-handoff.yml"
    p.write_text("foo: bar")
    assert parse_handoff_file(p) is None


def test_parse_handoff_empty_file(tmp_path):
    p = tmp_path / "step-99_HANDOFF.yml"
    p.write_text("")
    assert parse_handoff_file(p) is None


def test_parse_handoffs_dir(tmp_path):
    hdir = tmp_path / "handoffs"
    hdir.mkdir()
    (hdir / "step-102_HANDOFF.yml").write_text(SAMPLE_HANDOFF)
    (hdir / "step-103_HANDOFF.yml").write_text(
        SAMPLE_HANDOFF.replace("102", "103").replace("Combat Replay Storage", "XP System")
    )
    records = parse_handoffs(tmp_path)
    assert len(records) == 2
    assert records[0].step_number < records[1].step_number


def test_parse_handoffs_missing_dir(tmp_path):
    assert parse_handoffs(tmp_path) == []


REAL_ORDER_DIR = Path(os.environ.get("ORDER_DIR", "/tmp/order-test-data"))


def test_parse_real_handoffs():
    if not REAL_ORDER_DIR.exists():
        return
    records = parse_handoffs(REAL_ORDER_DIR)
    assert len(records) > 70
    # Every record should have a step number and title
    for r in records:
        assert r.step_number > 0
        assert r.title is not None
