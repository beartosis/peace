#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$ORDER_DIR" ]; then
    echo "Error: ORDER_DIR is not set. Point it at an ORDER project directory, e.g.:"
    echo '  export ORDER_DIR="/path/to/project/.chaos/framework/order"'
    exit 1
fi

cleanup() {
    echo ""
    echo "Shutting down..."
    kill 0 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Ingest ORDER data
echo "Ingesting ORDER data from $ORDER_DIR ..."
(cd "$DIR" && source .venv/bin/activate && python -m backend.ingest "$ORDER_DIR")

# Backend
echo "Starting backend on http://localhost:8000 ..."
(cd "$DIR" && source .venv/bin/activate && python -m backend.main) &

# Frontend
echo "Starting frontend on http://localhost:5173 ..."
(cd "$DIR/frontend" && npm run dev -- --clearScreen false) &

wait
