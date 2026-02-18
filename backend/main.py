"""FastAPI application for the PEACE API."""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import config, stats_service
from backend.database import SessionLocal, create_tables
from backend.event_stream import (
    EventFileWatcher,
    broadcaster,
    event_stream_generator,
)
from backend.ingest import IngestWatcher
from backend.models import (
    ArbiterEvent,
    Handoff,
    PullRequest,
    Run,
    Step,
    Transition,
)
from backend.schemas import (
    DurationTrendItem,
    EnhancedStatsOverview,
    FailureBreakdown,
    HandoffOut,
    RecentFailureItem,
    RunSummary,
    StateDurationStats,
    StatsOverview,
    StepDetail,
    StepSummary,
    TransitionOut,
)

logger = logging.getLogger(__name__)

_watcher: EventFileWatcher | None = None
_watcher_task: asyncio.Task | None = None
_ingest_watcher: IngestWatcher | None = None
_ingest_watcher_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _watcher, _watcher_task, _ingest_watcher, _ingest_watcher_task

    order_dir = config.require_order_dir()

    events_path = Path(config.EVENTS_FILE) if config.EVENTS_FILE else order_dir / "events.jsonl"
    _watcher = EventFileWatcher(events_path)
    _watcher_task = asyncio.create_task(_watcher.start())
    logger.info("Event file watcher started for %s", events_path)

    project = order_dir.resolve().parent.parent.parent.name
    _ingest_watcher = IngestWatcher(order_dir, project, SessionLocal)
    _ingest_watcher_task = asyncio.create_task(_ingest_watcher.start())
    logger.info("Ingest watcher started for %s", order_dir)

    yield

    _ingest_watcher.stop()
    _ingest_watcher_task.cancel()
    try:
        await _ingest_watcher_task
    except asyncio.CancelledError:
        pass
    logger.info("Ingest watcher stopped")

    _watcher.stop()
    _watcher_task.cancel()
    try:
        await _watcher_task
    except asyncio.CancelledError:
        pass
    logger.info("Event file watcher stopped")


app = FastAPI(title="PEACE API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Live Streaming Endpoints ────────────────────────────────────


@app.get("/api/live/events")
async def live_event_stream(request: Request, last_event_id: int | None = None):
    """SSE endpoint for live ORDER events."""
    header_id = request.headers.get("Last-Event-ID")
    if last_event_id is None and header_id:
        try:
            last_event_id = int(header_id)
        except ValueError:
            pass

    queue = broadcaster.subscribe(last_event_id)

    return StreamingResponse(
        event_stream_generator(queue, request.is_disconnected),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _get_state_path() -> Path:
    """Return the path to the ORDER state.json file."""
    order_dir = config.require_order_dir()
    return Path(config.STATE_FILE) if config.STATE_FILE else order_dir / "state.json"


@app.get("/api/live/snapshot")
async def live_snapshot():
    """Read current ORDER state.json for live view initialization."""
    state_path = _get_state_path()
    if not state_path.exists():
        raise HTTPException(status_code=404, detail="No active ORDER run")
    try:
        with open(state_path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to read state: {e}")


@app.get("/api/live/status")
async def live_status():
    """Return live stream connection status."""
    return {
        "connected_clients": broadcaster.subscriber_count,
        "last_event_id": broadcaster.last_event_id,
        "recent_event_count": broadcaster.recent_event_count,
    }


# ── Run & Step Endpoints ────────────────────────────────────────


@app.get("/api/runs", response_model=list[RunSummary])
def list_runs(db: Session = Depends(get_db)):
    return db.query(Run).order_by(Run.started_at.desc()).all()


@app.get("/api/runs/{run_id}", response_model=RunSummary)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/api/runs/{run_id}/steps", response_model=list[StepSummary])
def list_run_steps(run_id: int, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return (
        db.query(Step)
        .filter(Step.run_id == run_id)
        .order_by(Step.step_number)
        .all()
    )


@app.get("/api/steps/{step_number}", response_model=StepDetail)
def get_step(step_number: int, db: Session = Depends(get_db)):
    step = db.query(Step).filter(Step.step_number == step_number).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


@app.get("/api/steps/{step_number}/transitions", response_model=list[TransitionOut])
def list_step_transitions(step_number: int, db: Session = Depends(get_db)):
    step = db.query(Step).filter(Step.step_number == step_number).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return (
        db.query(Transition)
        .filter(Transition.step_id == step.id)
        .order_by(Transition.timestamp)
        .all()
    )


@app.get("/api/steps/{step_number}/handoff", response_model=HandoffOut)
def get_step_handoff(step_number: int, db: Session = Depends(get_db)):
    step = db.query(Step).filter(Step.step_number == step_number).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    handoff = db.query(Handoff).filter(Handoff.step_id == step.id).first()
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found for this step")
    return handoff


@app.get("/api/runs/{run_id}/steps/{step_number}", response_model=StepDetail)
def get_run_step(run_id: int, step_number: int, db: Session = Depends(get_db)):
    step = (
        db.query(Step)
        .filter(Step.run_id == run_id, Step.step_number == step_number)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


@app.get("/api/runs/{run_id}/steps/{step_number}/transitions", response_model=list[TransitionOut])
def list_run_step_transitions(run_id: int, step_number: int, db: Session = Depends(get_db)):
    step = (
        db.query(Step)
        .filter(Step.run_id == run_id, Step.step_number == step_number)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return (
        db.query(Transition)
        .filter(Transition.step_id == step.id)
        .order_by(Transition.timestamp)
        .all()
    )


@app.get("/api/runs/{run_id}/steps/{step_number}/handoff", response_model=HandoffOut)
def get_run_step_handoff(run_id: int, step_number: int, db: Session = Depends(get_db)):
    step = (
        db.query(Step)
        .filter(Step.run_id == run_id, Step.step_number == step_number)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    handoff = db.query(Handoff).filter(Handoff.step_id == step.id).first()
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found for this step")
    return handoff


# ── Stats Endpoints ─────────────────────────────────────────────


@app.get("/api/stats", response_model=StatsOverview)
def get_stats(db: Session = Depends(get_db)):
    total_steps = db.query(func.count(Step.id)).scalar() or 0
    completed = db.query(func.count(Step.id)).filter(Step.status == "completed").scalar() or 0
    failed = db.query(func.count(Step.id)).filter(Step.status.in_(["failed", "halted"])).scalar() or 0
    total_prs = db.query(func.count(PullRequest.id)).scalar() or 0
    total_transitions = db.query(func.count(Transition.id)).scalar() or 0
    total_self = db.query(func.count(Transition.id)).filter(Transition.is_self_transition == True).scalar() or 0  # noqa: E712
    total_arbiter = db.query(func.count(ArbiterEvent.id)).scalar() or 0
    total_handoffs = db.query(func.count(Handoff.id)).scalar() or 0
    total_runs = db.query(func.count(Run.id)).scalar() or 0

    return StatsOverview(
        total_steps=total_steps,
        completed=completed,
        failed=failed,
        total_prs=total_prs,
        total_transitions=total_transitions,
        total_self_transitions=total_self,
        total_arbiter_events=total_arbiter,
        total_handoffs=total_handoffs,
        total_runs=total_runs,
    )


@app.get("/api/stats/overview", response_model=EnhancedStatsOverview)
def get_stats_overview(db: Session = Depends(get_db)):
    return stats_service.get_overview(db)


@app.get("/api/stats/duration-trend", response_model=list[DurationTrendItem])
def get_duration_trend(db: Session = Depends(get_db)):
    return stats_service.get_duration_trend(db)


@app.get("/api/stats/state-durations", response_model=dict[str, StateDurationStats])
def get_state_durations(db: Session = Depends(get_db)):
    return stats_service.get_state_durations(db)


@app.get("/api/stats/failure-breakdown", response_model=FailureBreakdown)
def get_failure_breakdown(db: Session = Depends(get_db)):
    return stats_service.get_failure_breakdown(db)


@app.get("/api/stats/recent-failures", response_model=list[RecentFailureItem])
def get_recent_failures(db: Session = Depends(get_db)):
    return stats_service.get_recent_failures(db)


if __name__ == "__main__":
    import backend.models  # noqa: F401
    create_tables()
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
