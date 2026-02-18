# PEACE

**Performance Evaluation & Analytics for CHAOS Execution**

Observability dashboard for autonomous AI agent workflows. Built to monitor [ORDER](https://github.com/bear/order), the lifecycle orchestrator behind CHAOS, which autonomously parses roadmaps, creates specs, writes code, opens PRs, fixes CI failures, and hands off between steps — producing 190+ PRs across multiple projects.

When ORDER runs for hours unsupervised and something breaks at 3am, understanding what happened means reading thousands of log lines across dozens of files. PEACE ingests that execution data and presents it as visual dashboards with failure analysis, duration trends, and drill-down views into every phase of every step.

## Features

- **Run Timeline** — Browse all ORDER runs with collapsible step cards showing state transitions, verdicts, and durations
- **Aggregate Dashboard** — Pass rate, average durations, PR merge stats, and arbiter success rate at a glance
- **Charts & Analytics** — Duration trend lines, state duration distributions (avg/p50/p95), failure breakdown donuts
- **Step Detail View** — Horizontal state flow pipeline, dispatch content viewer with syntax highlighting, self-transition tracking
- **Handoff Insights** — Parsed key decisions, tradeoffs, risks, learnings, and follow-ups per step
- **Live Monitoring** — Real-time ORDER event streaming via SSE with connection status, event log, and pipeline visualization
- **Dark Mode** — Full dark theme toggle

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python + FastAPI |
| Database | SQLite via SQLAlchemy |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Charts | Recharts |
| State | TanStack React Query |
| Build | Vite |
| Testing | Pytest + Vitest |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+

### Setup

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt          # production deps
pip install -r requirements-dev.txt      # + test deps (pytest, httpx)

# Frontend
cd frontend
npm install
cd ..
```

### Ingest Data

Point the ingester at an ORDER project directory:

```bash
ORDER_DIR="/path/to/project/.chaos/framework/order"
python -m backend.ingest "$ORDER_DIR"
```

### Run

```bash
# All-in-one (ingest + backend + frontend)
./start.sh

# Or separately:
python -m backend.main           # http://localhost:8000
cd frontend && npm run dev       # http://localhost:5173
```

Set `ORDER_DIR` before running. See `.env.example` for all available configuration.

## Project Structure

```
peace/
├── backend/
│   ├── main.py              # FastAPI app and routes
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic response models
│   ├── ingest.py            # CLI data ingestion tool
│   ├── event_stream.py      # SSE broadcaster + file watcher
│   ├── stats_service.py     # Aggregation and analytics
│   ├── database.py          # Engine and session factory
│   └── parser/
│       ├── logs.py          # Log file parser
│       ├── structured.py    # JSON/JSONL/YAML parser
│       └── handoffs.py      # Handoff YAML parser
├── frontend/src/
│   ├── pages/               # Dashboard, RunDetail, StepDetail, Live
│   ├── components/          # UI components (30+)
│   ├── api/                 # API client, hooks, SSE
│   └── types.ts             # TypeScript interfaces
├── tests/                   # Pytest backend tests
├── start.sh                 # Startup script
├── requirements.txt         # Production dependencies
└── requirements-dev.txt     # Test dependencies
```

## Data Flow

```
ORDER Project Directory
  ├── state.json
  ├── history.jsonl
  ├── history-prs.jsonl
  ├── logs/*.log
  ├── handoffs/*.yml
  └── events.jsonl (live)
         │
         ▼
    backend/ingest.py ──▶ peace.db (SQLite)
         │
         ├── REST API ──────▶ Dashboard, Run Timeline, Step Detail
         └── SSE Stream ────▶ Live Monitor
```

## API

### Runs & Steps

| Endpoint | Description |
|----------|-------------|
| `GET /api/runs` | List all runs |
| `GET /api/runs/{id}` | Run details |
| `GET /api/runs/{id}/steps` | Steps in a run |
| `GET /api/runs/{id}/steps/{n}/transitions` | State transitions for a step |
| `GET /api/runs/{id}/steps/{n}/handoff` | Handoff data for a step |

### Stats

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats/overview` | Pass rate, durations, PR stats |
| `GET /api/stats/duration-trend` | Step-by-step duration series |
| `GET /api/stats/state-durations` | Avg/p50/p95 per state |
| `GET /api/stats/failure-breakdown` | Failures by state and verdict |
| `GET /api/stats/recent-failures` | Recent failure table |

### Live

| Endpoint | Description |
|----------|-------------|
| `GET /api/live/events` | SSE event stream |
| `GET /api/live/snapshot` | Current ORDER state |
| `GET /api/live/status` | Connection and subscriber info |

## Testing

```bash
# Backend
pytest

# Frontend
cd frontend && npm test
```

## License

[MIT](LICENSE)
