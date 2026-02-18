"""Tests for backend.parser.logs."""

import os
from pathlib import Path

from backend.parser.logs import (
    parse_log_file,
    parse_log_line,
    parse_run_logs,
    parse_step_logs,
)


def test_parse_log_line_basic():
    line = "[2026-02-17T17:08:46-08:00] [INFO] [step:101/INIT] Dispatching: /parse-roadmap"
    result = parse_log_line(line)
    assert result is not None
    ts, level, step_num, state, msg = result
    assert level == "INFO"
    assert step_num == 101
    assert state == "INIT"
    assert "Dispatching" in msg


def test_parse_log_line_unknown_step():
    line = "[2026-02-17T17:08:46-08:00] [INFO] [step:?/?] ORDER Lifecycle Orchestrator v3.0"
    result = parse_log_line(line)
    assert result is not None
    _, _, step_num, state, _ = result
    assert step_num is None
    assert state == "?"


def test_parse_log_line_debug():
    line = "[2026-02-17T17:25:41-08:00] [DEBUG] [step:102/PLAN_WORK] Running post-task hook"
    result = parse_log_line(line)
    assert result is not None
    assert result[1] == "DEBUG"


def test_parse_log_line_error():
    line = "[2026-02-17T14:55:38-08:00] [ERROR] [step:100/MERGE_PRS] Arbiter: HALT (verdict: MERGE_BLOCKED)"
    result = parse_log_line(line)
    assert result is not None
    assert result[1] == "ERROR"
    assert "HALT" in result[4]


def test_parse_log_line_non_log():
    assert parse_log_line("=== Dispatch: /parse-roadmap ===") is None
    assert parse_log_line("Some random text") is None
    assert parse_log_line("") is None


def test_parse_log_file_transitions(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T17:09:23-08:00] [INFO] [step:102/INIT] === Step 102: Combat Replay Storage ===\n"
        "[2026-02-17T17:09:23-08:00] [INFO] [step:102/PARSE_ROADMAP] "
        "──────── PARSE_ROADMAP (verdict: STEP_FOUND) ────\n"
        "[2026-02-17T17:14:28-08:00] [INFO] [step:102/CREATE_SPEC] "
        "──────── CREATE_SPEC (verdict: SPEC_CREATED) ────\n"
    )
    transitions, dispatches, arbiter, first_ts, last_ts, steps, titles = parse_log_file(p)
    assert len(transitions) == 2
    assert transitions[0].to_state == "PARSE_ROADMAP"
    assert transitions[0].verdict == "STEP_FOUND"
    assert transitions[1].to_state == "CREATE_SPEC"
    assert 102 in steps
    assert titles[102] == "Combat Replay Storage"


def test_parse_log_file_dispatch_blocks(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T17:09:23-08:00] [INFO] [step:102/PARSE_ROADMAP] Dispatching: /create-spec 102\n"
        "\n"
        "=== Dispatch: /create-spec 102 ===\n"
        "## Spec Contract Created\n"
        "Some content here\n"
        "=== End Dispatch ===\n"
        "\n"
        "[2026-02-17T17:14:27-08:00] [INFO] [step:102/PARSE_ROADMAP] Dispatch OK (304s): /create-spec 102\n"
    )
    _, dispatches, _, _, _, _, _ = parse_log_file(p)
    assert len(dispatches) == 1
    assert dispatches[0].skill == "/create-spec"
    assert dispatches[0].duration_secs == 304.0
    assert "Spec Contract Created" in dispatches[0].content


def test_parse_log_file_work_blocks(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T17:20:52-08:00] [INFO] [step:102/PLAN_WORK] Dispatching /work step-102-task-1\n"
        "\n"
        "=== /work step-102-task-1 (exit: 0, 289s) ===\n"
        "Task output here\n"
        "=== End /work (full log: path/to/log) ===\n"
        "\n"
        "[2026-02-17T17:25:41-08:00] [INFO] [step:102/PLAN_WORK] /work step-102-task-1 completed (289s)\n"
    )
    _, dispatches, _, _, _, _, _ = parse_log_file(p)
    assert len(dispatches) == 1
    assert dispatches[0].skill == "/work"
    assert dispatches[0].duration_secs == 289.0
    assert "Task output here" in dispatches[0].content


def test_parse_log_file_arbiter_events(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T14:55:32-08:00] [INFO] [step:100/MERGE_PRS] Fix attempt 2/3 for PR #209 (tier: arbiter)\n"
        "[2026-02-17T14:55:36-08:00] [INFO] [step:100/MERGE_PRS] Dispatching CI-fix arbiter (attempt 1/2)\n"
        "[2026-02-17T14:55:38-08:00] [ERROR] [step:100/MERGE_PRS] Arbiter: HALT (verdict: MERGE_BLOCKED)\n"
    )
    _, _, arbiter_events, _, _, _, _ = parse_log_file(p)
    assert len(arbiter_events) >= 2
    # The Fix attempt should have PR number
    fix = arbiter_events[0]
    assert fix.attempt == 2
    assert fix.max_attempts == 3
    assert fix.pr_number == 209


def test_parse_log_file_self_transition(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-16T16:32:23-08:00] [INFO] [step:84/PARSE_ROADMAP] "
        "──────── PARSE_ROADMAP (verdict: STEP_FOUND) ────\n"
        "[2026-02-16T16:37:13-08:00] [INFO] [step:84/CREATE_SPEC] "
        "──────── CREATE_SPEC (verdict: SPEC_CREATED) ────\n"
        "[2026-02-16T16:38:38-08:00] [INFO] [step:84/REVIEW_SPEC] "
        "──────── REVIEW_SPEC (verdict: READY) ────\n"
    )
    transitions, _, _, _, _, _, _ = parse_log_file(p)
    assert len(transitions) == 3
    # First one has no prev_state
    assert transitions[0].from_state is None
    assert transitions[0].is_self_transition is False
    # Second from PARSE_ROADMAP -> CREATE_SPEC
    assert transitions[1].from_state == "PARSE_ROADMAP"
    assert transitions[1].to_state == "CREATE_SPEC"


def test_parse_log_file_timestamps(tmp_path):
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T17:08:46-08:00] [INFO] [step:?/?] ORDER Lifecycle Orchestrator v3.0\n"
        "[2026-02-17T17:46:33-08:00] [INFO] [step:102/HANDOFF] last line\n"
    )
    _, _, _, first_ts, last_ts, _, _ = parse_log_file(p)
    assert first_ts is not None
    assert last_ts is not None
    assert first_ts < last_ts


def test_parse_log_file_skip_pr_separator(tmp_path):
    """PR #214 separator line should not create a transition."""
    p = tmp_path / "test.log"
    p.write_text(
        "[2026-02-17T17:25:44-08:00] [INFO] [step:102/MERGE_PRS] "
        "──────── MERGE_PRS ────\n"
        "[2026-02-17T17:25:45-08:00] [INFO] [step:102/MERGE_PRS] "
        "──────── PR #214 ────\n"
    )
    transitions, _, _, _, _, _, _ = parse_log_file(p)
    # Should only have 1 transition (MERGE_PRS), not one for PR #214
    assert len(transitions) == 1
    assert transitions[0].to_state == "MERGE_PRS"


REAL_ORDER_DIR = Path(os.environ.get("ORDER_DIR", "/tmp/order-test-data"))


def test_parse_real_step_logs():
    if not REAL_ORDER_DIR.exists():
        return
    results = parse_step_logs(REAL_ORDER_DIR)
    assert len(results) > 10
    # Each result should have a step number
    for r in results:
        assert r.step_number > 0
        assert r.started_at is not None


def test_parse_real_run_logs():
    if not REAL_ORDER_DIR.exists():
        return
    runs = parse_run_logs(REAL_ORDER_DIR)
    assert len(runs) > 20
    for r in runs:
        assert r.started_at is not None
        assert r.log_file.startswith("order-run-")
