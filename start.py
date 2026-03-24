from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DIST_DIR = ROOT / "dist"
SRC_DIR = ROOT / "src"


def _latest_mtime(path: Path) -> float:
    if path.is_file():
        return path.stat().st_mtime
    latest = 0.0
    for item in path.rglob("*"):
        if item.is_file():
            latest = max(latest, item.stat().st_mtime)
    return latest


def _frontend_needs_build() -> bool:
    index_html = DIST_DIR / "index.html"
    if not index_html.is_file():
        return True

    source_candidates = [
        ROOT / "index.html",
        ROOT / "package.json",
        ROOT / "vite.config.ts",
        ROOT / "tsconfig.app.json",
        ROOT / "tsconfig.json",
        ROOT / "tsconfig.node.json",
        ROOT / "eslint.config.js",
        ROOT / "src",
    ]
    latest_source = max(_latest_mtime(path) for path in source_candidates if path.exists())
    latest_dist = _latest_mtime(DIST_DIR)
    return latest_source > latest_dist


def _run_frontend_build() -> None:
    if not (ROOT / "node_modules").is_dir():
        raise SystemExit("Missing node_modules. Run `npm install` in this folder first.")

    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)


def main() -> None:
    if _frontend_needs_build():
        print("Frontend bundle missing or outdated. Running `npm run build`...")
        _run_frontend_build()

    os.execvp(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            os.environ.get("PORT", "8000"),
        ],
    )


if __name__ == "__main__":
    main()
