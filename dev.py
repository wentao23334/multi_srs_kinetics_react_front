from __future__ import annotations

import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def _terminate(proc: subprocess.Popen[bytes] | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


def main() -> None:
    backend = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=ROOT,
    )
    frontend = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=ROOT,
    )

    def handle_signal(signum: int, _frame: object) -> None:
        _terminate(frontend)
        _terminate(backend)
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        while True:
            if backend.poll() is not None:
                _terminate(frontend)
                raise SystemExit(backend.returncode or 0)
            if frontend.poll() is not None:
                _terminate(backend)
                raise SystemExit(frontend.returncode or 0)
            time.sleep(0.5)
    finally:
        _terminate(frontend)
        _terminate(backend)


if __name__ == "__main__":
    main()
