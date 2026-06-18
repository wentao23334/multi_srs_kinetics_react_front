from __future__ import annotations

import contextlib
import io
import json
import math
import secrets
import shutil
import time
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from scipy.optimize import curve_fit

from .srs_extractor.extract_core import run_extraction

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
DIST_DIR = PROJECT_ROOT / "dist"
RUNS_DIR = BACKEND_DIR / "data" / "runs"
RUNS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Multi SRS Kinetics App")


def _kinetics_model(x: np.ndarray, yb: float, a: float, td: float, tau: float) -> np.ndarray:
    tau = max(float(tau), 1e-9)
    return yb + a * (1.0 - np.exp(-(x - td) / tau))


def _guess_initial(x: np.ndarray, y: np.ndarray) -> tuple[float, float, float, float]:
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    td = float(np.min(x))
    yb = float(y[0])
    a = float(y[-1] - y[0])
    if abs(a) < 1e-12:
        a = float(np.nanmax(y) - np.nanmin(y))
    if abs(a) < 1e-12:
        a = 1.0

    target = yb + 0.632 * a
    idx = int(np.argmin(np.abs(y - target)))
    tau = float(max(x[idx] - td, 1e-6))
    return yb, a, td, tau


def _get_matplotlib():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    return plt


def _resolve_matplotlib_cmap_name(name: str | None) -> str:
    plt = _get_matplotlib()
    requested = str(name or "viridis").strip()
    if not requested:
        return "viridis"

    available = list(plt.colormaps())
    if requested in available:
        return requested

    lowered = requested.lower()
    for candidate in available:
        if candidate.lower() == lowered:
            return candidate

    return "viridis"


def _style_axes(ax: Any, xlabel: str, ylabel: str) -> None:
    ax.set_xlabel(xlabel, fontsize=11, fontname="Arial")
    ax.set_ylabel(ylabel, fontsize=11, fontname="Arial")
    ax.tick_params(
        axis="both",
        direction="out",
        labelsize=10,
        width=0.8,
        length=4,
        top=False,
        right=False,
    )
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        label.set_fontname("Arial")
    for spine in ax.spines.values():
        spine.set_linewidth(0.8)
        spine.set_edgecolor("black")
    ax.grid(False)


def _resolve_export_settings(figure_settings: dict[str, Any] | None) -> tuple[float, float, int]:
    figure_settings = figure_settings or {}
    global_settings = figure_settings.get("global", {}) if isinstance(figure_settings, dict) else {}

    try:
        width_cm = float(global_settings.get("width_cm", 10))
    except Exception:
        width_cm = 10.0
    try:
        height_cm = float(global_settings.get("height_cm", 8))
    except Exception:
        height_cm = 8.0
    try:
        dpi = int(global_settings.get("dpi", 300))
    except Exception:
        dpi = 300

    width_cm = width_cm if math.isfinite(width_cm) and width_cm > 0 else 10.0
    height_cm = height_cm if math.isfinite(height_cm) and height_cm > 0 else 8.0
    dpi = dpi if dpi > 0 else 300
    return width_cm, height_cm, dpi


def _should_reverse_wavenumber_axis(figure_settings: dict[str, Any] | None) -> bool:
    figure_settings = figure_settings or {}
    if not isinstance(figure_settings, dict):
        return False
    if isinstance(figure_settings.get("reverse_wavenumber_axis"), bool):
        return bool(figure_settings.get("reverse_wavenumber_axis"))
    global_settings = figure_settings.get("global", {}) if isinstance(figure_settings, dict) else {}
    return bool(global_settings.get("reverse_wavenumber_axis", False))


def _coerce_axis_range(values: Any) -> tuple[float, float] | None:
    if not isinstance(values, (list, tuple)) or len(values) != 2:
        return None
    try:
        lo = float(values[0])
        hi = float(values[1])
    except Exception:
        return None
    if not (math.isfinite(lo) and math.isfinite(hi)):
        return None
    return (lo, hi) if lo <= hi else (hi, lo)


def _coerce_float(value: Any) -> float | None:
    try:
        number = float(value)
    except Exception:
        return None
    return number if math.isfinite(number) else None


def _coerce_label_offset(values: Any) -> tuple[float, float]:
    if not isinstance(values, (list, tuple)) or len(values) != 2:
        return 0.0, 0.0
    try:
        dx = float(values[0]) / 100.0
        dy = float(values[1]) / 100.0
    except Exception:
        return 0.0, 0.0
    return dx, dy


def _add_curve_labels(ax: Any, default_loc: str, offset_values: Any) -> None:
    dx, dy = _coerce_label_offset(offset_values)
    anchor_map = {
        "upper right": (1.0, 1.0),
        "lower right": (1.0, 0.0),
        "upper left": (0.0, 1.0),
        "lower left": (0.0, 0.0),
    }
    base_x, base_y = anchor_map.get(default_loc, (1.0, 1.0))
    ax.legend(
        loc=default_loc,
        bbox_to_anchor=(base_x + dx, base_y - dy),
        frameon=False,
        fontsize=9,
        handlelength=1.5,
        labelspacing=0.3,
        borderaxespad=0.0,
        prop={"family": "Arial"},
    )


def _save_fit_overlay_figure(target_path: Path, series: list[dict[str, Any]], figure_settings: dict[str, Any] | None = None) -> None:
    plt = _get_matplotlib()
    figure_settings = figure_settings or {}
    width_cm, height_cm, dpi = _resolve_export_settings(figure_settings)
    fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54), dpi=dpi, facecolor="white")

    for item in series:
        color = str(item["color"])
        label = str(item["label"])
        x_full = np.asarray(item["full_time"], dtype=float)
        y_full = np.asarray(item["full_areas"], dtype=float)
        x_fit = np.asarray(item["x_fit"], dtype=float)
        y_fit = np.asarray(item["y_fit"], dtype=float)
        ax.plot(x_full, y_full, color=color, linewidth=1.3, label=label)
        ax.plot(x_fit, y_fit, color=color, linewidth=1.3, linestyle="--")

    _style_axes(
        ax,
        str(figure_settings.get("xlabel") or "Time / Potential"),
        str(figure_settings.get("ylabel") or "Peak Area"),
    )
    xlim = _coerce_axis_range(figure_settings.get("xlim"))
    ylim = _coerce_axis_range(figure_settings.get("ylim"))
    if xlim:
        ax.set_xlim(*xlim)
    if ylim:
        ax.set_ylim(*ylim)
    if figure_settings.get("show_labels", True):
        _add_curve_labels(ax, "upper right", figure_settings.get("label_offset"))
    fig.subplots_adjust(left=0.18, right=0.93, bottom=0.15, top=0.90)
    fig.savefig(target_path, dpi=dpi, bbox_inches=None, pad_inches=0.1, facecolor=fig.get_facecolor(), transparent=False)
    plt.close(fig)


def _save_fit_normalized_figure(target_path: Path, series: list[dict[str, Any]], figure_settings: dict[str, Any] | None = None) -> None:
    plt = _get_matplotlib()
    figure_settings = figure_settings or {}
    width_cm, height_cm, dpi = _resolve_export_settings(figure_settings)
    fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54), dpi=dpi, facecolor="white")

    for item in series:
        color = str(item["color"])
        label = str(item["label"])
        x_raw = np.asarray(item["x_raw"], dtype=float)
        y_raw = np.asarray(item["y_raw"], dtype=float)
        x_fit = np.asarray(item["x_fit"], dtype=float)
        y_fit = np.asarray(item["y_fit"], dtype=float)
        if x_raw.size:
            x_origin = float(x_raw[0])
            x_raw = x_raw - x_origin
            x_fit = x_fit - x_origin
        ax.scatter(
            x_raw,
            y_raw,
            s=20,
            facecolors="none",
            edgecolors=color,
            linewidths=1.3,
            label=label,
        )
        ax.plot(x_fit, y_fit, color=color, linewidth=1.3)

    _style_axes(
        ax,
        str(figure_settings.get("xlabel") or "Time / Potential"),
        str(figure_settings.get("ylabel") or "Normalized Peak Area"),
    )
    xlim = _coerce_axis_range(figure_settings.get("xlim"))
    ylim = _coerce_axis_range(figure_settings.get("ylim"))
    if xlim:
        ax.set_xlim(*xlim)
    if ylim:
        ax.set_ylim(*ylim)
    if figure_settings.get("show_labels", True):
        _add_curve_labels(ax, "lower right", figure_settings.get("label_offset"))
    fig.subplots_adjust(left=0.18, right=0.93, bottom=0.15, top=0.90)
    fig.savefig(target_path, dpi=dpi, bbox_inches=None, pad_inches=0.1, facecolor=fig.get_facecolor(), transparent=False)
    plt.close(fig)


def _save_spectral_figure(
    target_path: Path,
    traces: list[dict[str, Any]],
    figure_settings: dict[str, Any] | None = None,
) -> None:
    plt = _get_matplotlib()
    figure_settings = figure_settings or {}
    width_cm, height_cm, dpi = _resolve_export_settings(figure_settings)
    fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54), dpi=dpi, facecolor="white")

    for item in traces:
        ax.plot(
            np.asarray(item["x"], dtype=float),
            np.asarray(item["y"], dtype=float),
            color=str(item["color"]),
            linewidth=1.1,
        )

    _style_axes(
        ax,
        str(figure_settings.get("xlabel") or r"Wavenumber (cm$^{-1}$)"),
        str(figure_settings.get("ylabel") or "Absorbance (a.u.)"),
    )
    title = str(figure_settings.get("title") or "").strip()
    if title:
        ax.set_title(title, fontsize=11, fontname="Arial", pad=8)
    xlim = _coerce_axis_range(figure_settings.get("xlim"))
    ylim = _coerce_axis_range(figure_settings.get("ylim"))
    if xlim:
        ax.set_xlim(*xlim)
    if ylim:
        ax.set_ylim(*ylim)
    if _should_reverse_wavenumber_axis(figure_settings):
        ax.invert_xaxis()
    fig.subplots_adjust(left=0.18, right=0.93, bottom=0.15, top=0.90)
    fig.savefig(target_path, dpi=dpi, bbox_inches=None, pad_inches=0.1, facecolor=fig.get_facecolor(), transparent=False)
    plt.close(fig)


def _save_spectral_heatmap_figure(
    target_path: Path,
    heatmap: dict[str, Any],
    figure_settings: dict[str, Any] | None = None,
) -> None:
    plt = _get_matplotlib()
    figure_settings = figure_settings or {}
    width_cm, height_cm, dpi = _resolve_export_settings(figure_settings)
    fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54), dpi=dpi, facecolor="white")
    z_values = np.asarray(heatmap["z"], dtype=float)
    finite_values = z_values[np.isfinite(z_values)]
    auto_vmin = float(np.min(finite_values)) if finite_values.size else 0.0
    auto_vmax = float(np.max(finite_values)) if finite_values.size else 0.0
    manual_vmin = _coerce_float(heatmap.get("zmin"))
    manual_vmax = _coerce_float(heatmap.get("zmax"))

    if manual_vmin is not None and manual_vmax is not None:
        vmin, vmax = (manual_vmin, manual_vmax) if manual_vmin <= manual_vmax else (manual_vmax, manual_vmin)
    else:
        vmin = auto_vmin
        vmax = auto_vmax
        if manual_vmin is not None and manual_vmin <= auto_vmax:
            vmin = manual_vmin
        if manual_vmax is not None and manual_vmax >= vmin:
            vmax = manual_vmax

    cmap_name = _resolve_matplotlib_cmap_name(str(heatmap.get("color_scale") or "viridis"))
    image = ax.imshow(
        z_values,
        aspect="auto",
        origin="lower",
        extent=[
            float(np.min(np.asarray(heatmap["x"], dtype=float))),
            float(np.max(np.asarray(heatmap["x"], dtype=float))),
            float(np.min(np.asarray(heatmap["y"], dtype=float))),
            float(np.max(np.asarray(heatmap["y"], dtype=float))),
        ],
        cmap=cmap_name,
        vmin=vmin,
        vmax=vmax,
    )

    _style_axes(
        ax,
        str(figure_settings.get("xlabel") or r"Wavenumber (cm$^{-1}$)"),
        "Time (s)",
    )

    xlim = _coerce_axis_range(figure_settings.get("xlim"))
    if xlim:
        ax.set_xlim(*xlim)
    if _should_reverse_wavenumber_axis(figure_settings):
        ax.invert_xaxis()

    cax = ax.inset_axes([0.7, 1.02, 0.17, 0.035], transform=ax.transAxes)
    cbar = fig.colorbar(image, cax=cax, orientation="horizontal")
    cbar.outline.set_linewidth(0.6)
    cbar.ax.set_xticks([])
    cbar.ax.text(
        -0.06,
        0.5,
        f"{vmin:.2g}",
        transform=cbar.ax.transAxes,
        ha="right",
        va="center",
        fontsize=10,
        fontname="Arial",
        color="black",
    )
    cbar.ax.text(
        1.06,
        0.5,
        f"{vmax:.2g}",
        transform=cbar.ax.transAxes,
        ha="left",
        va="center",
        fontsize=10,
        fontname="Arial",
        color="black",
    )

    fig.subplots_adjust(left=0.18, right=0.93, bottom=0.15, top=0.90)
    fig.savefig(target_path, dpi=dpi, bbox_inches=None, pad_inches=0.1, facecolor=fig.get_facecolor(), transparent=False)
    plt.close(fig)


def _parse_timeseries_txt(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        header_line = f.readline().rstrip("\n")
    if not header_line.startswith("\t"):
        raise ValueError("Invalid timeseries txt header format.")
    wn = np.array([float(v) for v in header_line.split("\t")[1:] if v], dtype=float)
    data = np.loadtxt(path, delimiter="\t", skiprows=1)
    if data.ndim == 1:
        data = data.reshape(1, -1)
    time_axis = data[:, 0].astype(float)
    spectra = data[:, 1:].astype(float)
    if spectra.shape[1] != wn.shape[0]:
        raise ValueError("Wavenumber count and spectra width mismatch.")
    return {
        "wavenumbers": wn.tolist(),
        "time": time_axis.tolist(),
        "spectra": spectra.tolist(),
    }


def _apply_wavenumber_crop(parsed: dict[str, Any], crop_range: tuple[float, float] | None) -> dict[str, Any]:
    if not crop_range:
        return parsed

    wn = np.asarray(parsed["wavenumbers"], dtype=float)
    spectra = np.asarray(parsed["spectra"], dtype=float)
    lo, hi = crop_range
    mask = (wn >= lo) & (wn <= hi)
    if np.count_nonzero(mask) < 2:
        raise HTTPException(status_code=400, detail="Crop range needs at least 2 wavenumber points")

    cropped_wn = wn[mask]
    cropped_spectra = spectra[:, mask]
    return {
        "wavenumbers": cropped_wn.tolist(),
        "time": parsed["time"],
        "spectra": cropped_spectra.tolist(),
    }


def _load_run_dataset(
    run_id: str,
    filename: str,
    crop_range: tuple[float, float] | None = None,
) -> dict[str, Any]:
    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="run_id not found")

    stem = Path(filename).stem
    ts_path = run_dir / f"{stem}.txt"
    if not ts_path.exists():
        raise HTTPException(status_code=404, detail=f"Extracted file not found: {stem}.txt")

    try:
        parsed = _parse_timeseries_txt(ts_path)
        return _apply_wavenumber_crop(parsed, crop_range)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to parse dataset: {e}") from e


def _build_heatmap_payload(run_id: str, filename: str, heatmap_settings: dict[str, Any]) -> dict[str, Any]:
    crop_range = _coerce_axis_range(heatmap_settings.get("crop_range"))
    parsed = _load_run_dataset(run_id, filename, crop_range)
    wn = np.asarray(parsed["wavenumbers"], dtype=float)
    time_axis = np.asarray(parsed["time"], dtype=float)
    spectra = np.asarray(parsed["spectra"], dtype=float)

    if spectra.ndim != 2 or spectra.shape[0] != time_axis.size or spectra.shape[1] != wn.size:
        raise HTTPException(status_code=400, detail="spectra/time/wavenumber shape mismatch")

    time_range = _coerce_axis_range(heatmap_settings.get("time_range"))
    if time_range:
        start, end = time_range
        indices = np.where((time_axis >= start) & (time_axis <= end))[0]
        if indices.size:
            time_axis = time_axis[indices]
            spectra = spectra[indices]

    return {
        "x": wn.tolist(),
        "y": time_axis.tolist(),
        "z": spectra.tolist(),
        "color_scale": heatmap_settings.get("color_scale"),
        "crop_range": heatmap_settings.get("crop_range"),
        "zmin": heatmap_settings.get("zmin"),
        "zmax": heatmap_settings.get("zmax"),
    }


def _prune_temp_runs(max_keep: int = 5) -> None:
    temp_dirs = [p for p in RUNS_DIR.glob("*") if p.is_dir() and (p / ".temp").exists()]
    temp_dirs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    for stale_dir in temp_dirs[max_keep:]:
        try:
            shutil.rmtree(stale_dir)
        except Exception:
            pass


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _set_run_keep_record(run_dir: Path, keep_record: bool) -> None:
    temp_marker = run_dir / ".temp"
    if keep_record:
        if temp_marker.exists():
            temp_marker.unlink()
    else:
        temp_marker.touch(exist_ok=True)


def _run_extraction_capture_output(
    srs_path: str,
    mode: str,
    outdir: str,
    start_wn: float,
    end_wn: float,
) -> str:
    """Run the legacy extractor without depending on the server stdout pipe."""
    output = io.StringIO()
    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
        run_extraction(
            srs_path=srs_path,
            mode=mode,
            outdir=outdir,
            start_wn=start_wn,
            end_wn=end_wn,
        )
    return output.getvalue()


def _format_extraction_error(exc: Exception, captured_output: str = "") -> str:
    message = str(exc) or exc.__class__.__name__
    lines = [line.strip() for line in captured_output.splitlines() if line.strip()]
    if lines:
        tail = " | ".join(lines[-6:])
        return f"{message}; extractor output: {tail}"
    return message


def _write_run_record(run_dir: Path, keep_record: bool, record: dict[str, Any]) -> Path:
    payload = dict(record)
    payload["run_id"] = run_dir.name
    payload["keep_record"] = keep_record
    payload["saved_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    record_path = run_dir / "run_record.json"
    record_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return record_path


def _resolve_dist_path(relative_path: str) -> Path:
    if not relative_path:
        relative_path = "index.html"
    target = (DIST_DIR / relative_path).resolve()
    dist_root = DIST_DIR.resolve()
    if target != dist_root and dist_root not in target.parents:
        raise HTTPException(status_code=404, detail="File not found")
    return target


def _serve_dist_file(relative_path: str = "index.html") -> FileResponse:
    if not DIST_DIR.is_dir():
        raise HTTPException(
            status_code=503,
            detail="Frontend bundle not found. Run `npm run build` or `python3 start.py` first.",
        )

    target = _resolve_dist_path(relative_path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(target))


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def index() -> FileResponse:
    return _serve_dist_file("index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/list_folder")
async def list_folder(payload: dict[str, str]) -> dict[str, Any]:
    folder_path = payload.get("folder_path", "").strip()
    if not folder_path:
        raise HTTPException(status_code=400, detail="Missing folder_path")

    path_obj = Path(folder_path)
    if not path_obj.exists() or not path_obj.is_dir():
        raise HTTPException(status_code=400, detail="Path does not exist or is not a directory")

    srs_files: list[str] = []
    try:
        for item in path_obj.iterdir():
            if item.is_file() and ".srs" in item.name.lower():
                srs_files.append(item.name)
        srs_files.sort()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading directory: {e}")

    return {"folder_path": str(path_obj), "files": srs_files}


@app.post("/api/extract_all")
async def extract_all(payload: dict[str, Any]) -> dict[str, Any]:
    """Extract a batch of selected SRS files from a folder.

    Payload:
        folder_path: absolute path to the source folder
        files: ordered list of filenames to extract
        mode: 'fast' or 'realtime'
        start: start wavenumber
        end: end wavenumber
    """
    folder_path = str(payload.get("folder_path", "")).strip()
    files: list[str] = list(payload.get("files", []))
    mode = str(payload.get("mode", "realtime")).strip().lower()
    start = float(payload.get("start", 1150))
    end = float(payload.get("end", 4000))
    keep_record = _as_bool(payload.get("keep_record", False))

    if not folder_path or not files:
        raise HTTPException(status_code=400, detail="folder_path and files are required")
    if mode not in {"fast", "realtime"}:
        raise HTTPException(status_code=400, detail="mode must be 'fast' or 'realtime'")

    source_dir = Path(folder_path)
    if not source_dir.is_dir():
        raise HTTPException(status_code=400, detail="folder_path is not a valid directory")

    # Create a run directory; temporary runs are marked for later cleanup.
    run_id = secrets.token_hex(8)
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    _set_run_keep_record(run_dir, keep_record)

    _prune_temp_runs(max_keep=5)

    succeeded: list[str] = []
    failed: dict[str, str] = {}

    for filename in files:
        srs_src = source_dir / filename
        if not srs_src.is_file():
            failed[filename] = "File not found in folder"
            continue
        # Copy to run dir so the extractor can work there
        dest = run_dir / filename
        extraction_output = ""
        try:
            shutil.copy2(str(srs_src), str(dest))
            extraction_output = _run_extraction_capture_output(
                srs_path=str(dest),
                mode=mode,
                outdir=str(run_dir),
                start_wn=start,
                end_wn=end,
            )
            # Verify the txt was produced
            stem = Path(filename).stem
            if (run_dir / f"{stem}.txt").exists():
                succeeded.append(filename)
            else:
                failed[filename] = "Extraction produced no output"
        except Exception as e:
            failed[filename] = _format_extraction_error(e, extraction_output)

    if not succeeded:
        raise HTTPException(status_code=500, detail=f"All extractions failed: {failed}")

    return {
        "run_id": run_id,
        "succeeded": succeeded,
        "failed": failed,
        "keep_record": keep_record,
    }


@app.post("/api/get_dataset")
async def get_dataset(payload: dict[str, Any]) -> dict[str, Any]:
    """Return the parsed timeseries data for a single extracted file."""
    run_id = str(payload.get("run_id", "")).strip()
    filename = str(payload.get("filename", "")).strip()

    if not run_id or not filename:
        raise HTTPException(status_code=400, detail="run_id and filename are required")

    crop_range = _coerce_axis_range(payload.get("crop_range"))
    parsed = _load_run_dataset(run_id, filename, crop_range)
    return {"filename": filename, **parsed}


def _trapz_area(x: np.ndarray, y: np.ndarray) -> float:
    if x.size < 2 or y.size < 2:
        return float("nan")
    return float(np.trapz(y, x))


@app.post("/api/integrate")
async def integrate(payload: dict[str, Any]) -> dict[str, Any]:
    """Integrate the area under the spectrum between two wavenumber limits.

    Payload:
        wavenumbers, time, spectra: dataset arrays
        start: lower wavenumber bound
        end: upper wavenumber bound
        baseline_mode: 'none' or 'linear'
    """
    baseline_mode = str(payload.get("baseline_mode", "none"))
    try:
        start = float(payload["start"])
        end = float(payload["end"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid integration window: {e}") from e

    if "wavenumbers" in payload and "time" in payload and "spectra" in payload:
        try:
            wn = np.asarray(payload["wavenumbers"], dtype=float)
            time_axis = np.asarray(payload["time"], dtype=float)
            spectra = np.asarray(payload["spectra"], dtype=float)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {e}") from e
    else:
        run_id = str(payload.get("run_id", "")).strip()
        filename = str(payload.get("filename", "")).strip()
        if not run_id or not filename:
            raise HTTPException(
                status_code=400,
                detail="Provide either dataset arrays or run_id + filename for integration",
            )
        crop_range = _coerce_axis_range(payload.get("crop_range"))
        parsed = _load_run_dataset(run_id, filename, crop_range)
        wn = np.asarray(parsed["wavenumbers"], dtype=float)
        time_axis = np.asarray(parsed["time"], dtype=float)
        spectra = np.asarray(parsed["spectra"], dtype=float)

    if spectra.ndim != 2 or spectra.shape[0] != time_axis.size or spectra.shape[1] != wn.size:
        raise HTTPException(status_code=400, detail="spectra/time/wavenumber shape mismatch")

    lo, hi = (start, end) if start <= end else (end, start)
    mask = (wn >= lo) & (wn <= hi)
    if np.count_nonzero(mask) < 2:
        raise HTTPException(status_code=400, detail="Integration window needs at least 2 wavenumber points")

    x_sel = wn[mask]
    areas = []
    for row in spectra:
        y_sel = row[mask].astype(float)
        if baseline_mode == "linear":
            baseline = np.interp(x_sel, [x_sel[0], x_sel[-1]], [y_sel[0], y_sel[-1]])
            y_sel = y_sel - baseline
        areas.append(_trapz_area(x_sel, y_sel))

    return {"time": time_axis.tolist(), "areas": areas, "window": [lo, hi], "baseline_mode": baseline_mode}


@app.post("/api/fit-kinetics")
async def fit_kinetics(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        x = np.asarray(payload["x"], dtype=float)
        y = np.asarray(payload["y"], dtype=float)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid x/y payload: {e}") from e

    if x.size < 4 or y.size < 4 or x.size != y.size:
        raise HTTPException(status_code=400, detail="x/y must have same length and >= 4")
    if not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)):
        raise HTTPException(status_code=400, detail="x/y contains non-finite values")

    order = np.argsort(x)
    x = x[order]
    y = y[order]
    p0 = _guess_initial(x, y)

    tau_upper = float(max(np.ptp(x) * 100.0, 1.0))
    bounds = (
        [-math.inf, -math.inf, float(np.min(x)), 1e-9],
        [math.inf, math.inf, float(np.max(x)), tau_upper],
    )

    try:
        popt, pcov = curve_fit(
            _kinetics_model,
            x,
            y,
            p0=p0,
            bounds=bounds,
            maxfev=400,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"fit failed: {e}") from e

    y_fit = _kinetics_model(x, *popt)
    resid = y - y_fit
    ss_res = float(np.sum(resid ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else float("nan")
    rmse = float(np.sqrt(np.mean(resid ** 2)))

    ci95 = [None] * 4
    if pcov is not None and np.all(np.isfinite(pcov)):
        se = np.sqrt(np.diag(pcov))
        ci95 = [(float(v - 1.96 * s), float(v + 1.96 * s)) for v, s in zip(popt, se)]

    return {
        "params": {"Yb": float(popt[0]), "A": float(popt[1]), "TD": float(popt[2]), "Tau": float(popt[3])},
        "init_guess": {"Yb": float(p0[0]), "A": float(p0[1]), "TD": float(p0[2]), "Tau": float(p0[3])},
        "metrics": {"r2": r2, "rmse": rmse},
        "ci95": {"Yb": ci95[0], "A": ci95[1], "TD": ci95[2], "Tau": ci95[3]},
        "x_sorted": x.tolist(),
        "y_fit": y_fit.tolist(),
        "residuals": resid.tolist(),
    }


@app.post("/api/render-fit-figures")
async def render_fit_figures(payload: dict[str, Any]) -> dict[str, Any]:
    run_id = str(payload.get("run_id", "")).strip()
    series = list(payload.get("series", []))
    figure_settings = payload.get("figure_settings", {})
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    if not series:
        raise HTTPException(status_code=400, detail="series is required")

    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="run_id not found")

    try:
        overlay_series = []
        normalized_series = []
        for item in series:
            overlay_series.append({
                "label": item["label"],
                "color": item["color"],
                "full_time": item["full_time"],
                "full_areas": item["full_areas"],
                "x_fit": item["x_fit"],
                "y_fit": item["y_fit"],
            })
            normalized_series.append({
                "label": item["label"],
                "color": item["color"],
                "x_raw": item["x_raw"],
                "y_raw": item["y_raw"],
                "x_fit": item["x_fit"],
                "y_fit": item["y_fit_norm"],
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid series payload: {e}") from e

    overlay_path = run_dir / "fit_overlay.png"
    normalized_path = run_dir / "fit_normalized.png"

    try:
        overlay_settings = figure_settings.get("overlay", {}) if isinstance(figure_settings, dict) else {}
        normalized_settings = figure_settings.get("normalized", {}) if isinstance(figure_settings, dict) else {}
        _save_fit_overlay_figure(overlay_path, overlay_series, overlay_settings)
        _save_fit_normalized_figure(normalized_path, normalized_series, normalized_settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render fit figures: {e}") from e

    stamp = int(time.time() * 1000)
    return {
        "overlay_url": f"/api/fit-figure/{run_id}/overlay?ts={stamp}",
        "normalized_url": f"/api/fit-figure/{run_id}/normalized?ts={stamp}",
    }


@app.post("/api/render-spectral-figure")
async def render_spectral_figure(payload: dict[str, Any]) -> dict[str, Any]:
    run_id = str(payload.get("run_id", "")).strip()
    filename = str(payload.get("filename", "")).strip()
    traces = list(payload.get("traces", []))
    heatmap = payload.get("heatmap", {})
    figure_settings = payload.get("figure_settings", {})

    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    if not filename:
        raise HTTPException(status_code=400, detail="filename is required")
    if not traces:
        raise HTTPException(status_code=400, detail="traces are required")
    if not isinstance(heatmap, dict) or not heatmap:
        raise HTTPException(status_code=400, detail="heatmap is required")

    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="run_id not found")

    try:
        spectral_path = run_dir / "spectral_waterfall.png"
        spectral_heatmap_path = run_dir / "spectral_heatmap.png"
        heatmap_payload = _build_heatmap_payload(run_id, filename, heatmap if isinstance(heatmap, dict) else {})
        _save_spectral_figure(spectral_path, traces, figure_settings if isinstance(figure_settings, dict) else {})
        _save_spectral_heatmap_figure(spectral_heatmap_path, heatmap_payload, figure_settings if isinstance(figure_settings, dict) else {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render spectral figure: {e}") from e

    stamp = int(time.time() * 1000)
    return {
        "spectral_url": f"/api/fit-figure/{run_id}/spectral?ts={stamp}",
        "spectral_heatmap_url": f"/api/fit-figure/{run_id}/spectral-heatmap?ts={stamp}",
    }


@app.get("/api/fit-figure/{run_id}/{kind}")
async def get_fit_figure(run_id: str, kind: str) -> FileResponse:
    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="run_id not found")

    name_map = {
        "overlay": "fit_overlay.png",
        "normalized": "fit_normalized.png",
        "spectral": "spectral_waterfall.png",
        "spectral-heatmap": "spectral_heatmap.png",
    }
    if kind not in name_map:
        raise HTTPException(status_code=404, detail="Unknown figure kind")

    figure_path = run_dir / name_map[kind]
    if not figure_path.is_file():
        raise HTTPException(status_code=404, detail="Figure not found")

    return FileResponse(str(figure_path), media_type="image/png")


@app.post("/api/save_run_record")
async def save_run_record(payload: dict[str, Any]) -> dict[str, Any]:
    run_id = str(payload.get("run_id", "")).strip()
    keep_record = _as_bool(payload.get("keep_record", False))
    record = payload.get("record", {})

    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    if not isinstance(record, dict):
        raise HTTPException(status_code=400, detail="record must be an object")

    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        raise HTTPException(status_code=404, detail="run_id not found")

    try:
        _set_run_keep_record(run_dir, keep_record)
        record_path = _write_run_record(run_dir, keep_record, record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save run record: {e}") from e

    return {
        "run_id": run_id,
        "keep_record": keep_record,
        "record_path": str(record_path),
    }


@app.post("/api/cleanup")
async def cleanup(payload: dict[str, Any]) -> dict[str, Any]:
    run_id = str(payload.get("run_id", "")).strip()
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    run_dir = RUNS_DIR / run_id
    if run_dir.exists() and run_dir.is_dir():
        shutil.rmtree(run_dir)
    return {"deleted": run_id}


@app.api_route("/assets/{asset_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def frontend_assets(asset_path: str) -> FileResponse:
    return _serve_dist_file(f"assets/{asset_path}")


@app.api_route("/{file_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def spa_fallback(file_path: str) -> FileResponse:
    if not file_path or file_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    try:
        candidate = _resolve_dist_path(file_path)
    except HTTPException:
        return _serve_dist_file("index.html")

    if candidate.is_file():
        return FileResponse(str(candidate))
    return _serve_dist_file("index.html")
