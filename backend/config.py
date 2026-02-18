"""Centralized configuration loaded from environment variables."""

import os
import sys
from pathlib import Path

ORDER_DIR: str | None = os.environ.get("ORDER_DIR")

DB_PATH: str = os.environ.get("DB_PATH", "peace.db")
HOST: str = os.environ.get("HOST", "127.0.0.1")
PORT: int = int(os.environ.get("PORT", "8000"))
CORS_ORIGINS: list[str] = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

# Derived from ORDER_DIR — available when ORDER_DIR is set
EVENTS_FILE: str | None = os.environ.get(
    "EVENTS_FILE",
    str(Path(ORDER_DIR) / "events.jsonl") if ORDER_DIR else None,
)
STATE_FILE: str | None = os.environ.get(
    "STATE_FILE",
    str(Path(ORDER_DIR) / "state.json") if ORDER_DIR else None,
)


def require_order_dir() -> Path:
    """Return ORDER_DIR as a Path, or exit with an error if not set."""
    if not ORDER_DIR:
        print(
            "Error: ORDER_DIR is not set. "
            "Point it at an ORDER project directory, e.g.:\n"
            '  export ORDER_DIR="/path/to/project/.chaos/framework/order"',
            file=sys.stderr,
        )
        sys.exit(1)
    return Path(ORDER_DIR)
