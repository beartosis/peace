"""Tests for backend.parser.structured."""

import os
from pathlib import Path

from backend.parser.structured import (
    extract_step_number,
    parse_history_jsonl,
    parse_history_prs,
    parse_state_json,
    parse_structured,
)


def test_extract_step_number():
    assert extract_step_number("step-85-task-1") == 85
    assert extract_step_number("step-8-task-3") == 8
    assert extract_step_number("scaffold-react-project") is None
    assert extract_step_number("seed-character-templates") is None


def test_parse_history_jsonl_dedup(tmp_path):
    p = tmp_path / "history.jsonl"
    p.write_text(
        '{"from":"A","to":"B","at":"2026-02-13T20:47:00-08:00","note":"first"}\n'
        '{"from":"B","to":"B","at":"2026-02-13T21:00:00-08:00"}\n'
        '{"from":"A","to":"B","at":"2026-02-13T20:47:00-08:00","note":"duplicate"}\n'
    )
    records = parse_history_jsonl(p)
    assert len(records) == 2
    assert records[0].note == "first"
    assert records[1].is_self_transition is True


def test_parse_history_jsonl_empty_lines(tmp_path):
    p = tmp_path / "history.jsonl"
    p.write_text(
        '{"from":"A","to":"B","at":"2026-02-13T20:47:00-08:00"}\n'
        "\n"
        '{"from":"B","to":"C","at":"2026-02-13T21:00:00-08:00"}\n'
    )
    records = parse_history_jsonl(p)
    assert len(records) == 2


def test_parse_history_jsonl_microsecond_timestamps(tmp_path):
    p = tmp_path / "history.jsonl"
    p.write_text(
        '{"from":"X","to":"Y","at":"2026-02-16T17:27:44.535238-08:00"}\n'
    )
    records = parse_history_jsonl(p)
    assert len(records) == 1
    assert records[0].timestamp.microsecond == 535238


def test_parse_history_prs_legacy_format(tmp_path):
    p = tmp_path / "history-prs.jsonl"
    p.write_text(
        '{"key":"104","value":{"task":"seed-character-templates","status":"merged"}}\n'
    )
    records = parse_history_prs(p)
    assert len(records) == 1
    assert records[0].pr_number == 104
    assert records[0].task_id == "seed-character-templates"
    assert records[0].step_number is None  # can't extract from non-step task
    assert records[0].title is None
    assert records[0].merged_at is None


def test_parse_history_prs_new_format(tmp_path):
    p = tmp_path / "history-prs.jsonl"
    p.write_text(
        '{"step":85,"task":"step-85-task-1","pr":180,'
        '"title":"feat(character): add rarity","merged":"2026-02-17T01:16:35Z"}\n'
    )
    records = parse_history_prs(p)
    assert len(records) == 1
    assert records[0].pr_number == 180
    assert records[0].step_number == 85
    assert records[0].title == "feat(character): add rarity"
    assert records[0].merged_at is not None


def test_parse_history_prs_mixed(tmp_path):
    p = tmp_path / "history-prs.jsonl"
    p.write_text(
        '{"key":"104","value":{"task":"seed-character-templates","status":"merged"}}\n'
        '{"step":85,"task":"step-85-task-1","pr":180,"title":"feat","merged":"2026-02-17T01:16:35Z"}\n'
    )
    records = parse_history_prs(p)
    assert len(records) == 2


def test_parse_history_prs_legacy_with_step_task(tmp_path):
    p = tmp_path / "history-prs.jsonl"
    p.write_text(
        '{"key":"109","value":{"task":"step-54-task-1","status":"merged"}}\n'
    )
    records = parse_history_prs(p)
    assert records[0].step_number == 54


def test_parse_state_json(tmp_path):
    p = tmp_path / "state.json"
    p.write_text(
        '{"current_state":"MERGE_PRS","step_number":103,'
        '"prs":{"197":{"task":"step-92-task-1","status":"merged"},'
        '"215":{"task":"step-103-task-1","status":"ready"}},'
        '"completed":["step-8-task-1","step-8-task-2","scaffold-react-project"],'
        '"last_transition":"2026-02-17T18:02:47-08:00","transition_history":[],'
        '"failed":[],"consecutive_failures":0,"current_task":null,"queue":[]}'
    )
    prs, completed, step_nums, cur_state, cur_step = parse_state_json(p)
    assert len(prs) == 2
    assert prs[0].pr_number == 197
    assert prs[0].step_number == 92
    assert prs[1].status == "ready"
    assert len(completed) == 3
    assert 8 in step_nums
    assert cur_state == "MERGE_PRS"
    assert cur_step == 103


def test_parse_structured_merges_prs(tmp_path):
    # history-prs has PR 104, state.json has PR 197
    (tmp_path / "history.jsonl").write_text("")
    (tmp_path / "history-prs.jsonl").write_text(
        '{"key":"104","value":{"task":"seed-character-templates","status":"merged"}}\n'
    )
    (tmp_path / "state.json").write_text(
        '{"current_state":"INIT","step_number":1,'
        '"prs":{"104":{"task":"seed-character-templates","status":"merged"},'
        '"197":{"task":"step-92-task-1","status":"merged"}},'
        '"completed":["step-92-task-1"],'
        '"last_transition":"2026-02-17T18:02:47-08:00","transition_history":[],'
        '"failed":[],"consecutive_failures":0,"current_task":null,"queue":[]}'
    )
    data = parse_structured(tmp_path)
    pr_nums = {pr.pr_number for pr in data.prs}
    assert pr_nums == {104, 197}  # merged, no duplicate for 104


def test_parse_structured_missing_files(tmp_path):
    """Should handle missing files gracefully."""
    data = parse_structured(tmp_path)
    assert data.transitions == []
    assert data.prs == []
    assert data.step_numbers == set()


REAL_ORDER_DIR = Path(os.environ.get("ORDER_DIR", "/tmp/order-test-data"))


def test_parse_real_history_jsonl():
    if not (REAL_ORDER_DIR / "history.jsonl").exists():
        return
    records = parse_history_jsonl(REAL_ORDER_DIR / "history.jsonl")
    # 123 lines with duplicates -> should be fewer after dedup
    assert len(records) < 123
    assert len(records) > 50
    # All should have timestamps
    for r in records:
        assert r.timestamp is not None


def test_parse_real_structured():
    if not REAL_ORDER_DIR.exists():
        return
    data = parse_structured(REAL_ORDER_DIR)
    assert len(data.prs) > 15  # 14 from history-prs + extras from state.json
    assert len(data.step_numbers) > 50
    assert data.current_state is not None
