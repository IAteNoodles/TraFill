"""Entry point script to launch the FastAPI backend with basic logging."""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Sequence

import uvicorn

APP_IMPORT_PATH = "backend.app:app"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 5000


# Ensure the project root is on sys.path so "backend" imports resolve even when
# this script is executed from within the backend directory itself.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
_path_added = False
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
    _path_added = True


def configure_logging() -> None:
    """Configure root logger for consistent console output."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )
    if _path_added:
        logging.debug("Added project root to sys.path: %s", PROJECT_ROOT)


def launch_backend(argv: Sequence[str]) -> None:
    """Start the FastAPI backend and log the provided CLI arguments."""
    logging.info("Starting backend server")
    if argv:
        logging.info("Received CLI arguments: %s", " ".join(argv))
    else:
        logging.info("No CLI arguments provided")

    # Delegates to uvicorn to run the FastAPI application.
    uvicorn.run(APP_IMPORT_PATH, host=DEFAULT_HOST, port=DEFAULT_PORT, log_level="info")


if __name__ == "__main__":
    configure_logging()
    launch_backend(sys.argv[1:])
