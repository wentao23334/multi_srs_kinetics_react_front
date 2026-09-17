from __future__ import annotations

import asyncio
import math
import shutil
import sys
from tempfile import TemporaryDirectory
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import (
    RUNS_DIR,
    _kinetics_model,
    _save_spectral_heatmap_figure,
    _subtract_spectral_baselines,
    export_svg_figures,
    fit_kinetics,
    integrate,
    subtract_background,
)


async def main() -> None:
    corrected = _subtract_spectral_baselines(
        np.asarray([1000, 1100, 1200, 1300, 1400], dtype=float),
        np.asarray([[10, 12, 20, 30, 40], [20, 22, 30, 40, 50]], dtype=float),
        (0, 5000),
    )
    assert np.allclose(corrected, [[-4, -2, 6, 16, 26], [-4, -2, 6, 16, 26]])

    integration = await integrate(
        {
            "wavenumbers": [1000, 1100, 1200],
            "time": [0, 1],
            "spectra": [[1, 2, 4], [2, 3, 5]],
            "start": 1000,
            "end": 1200,
            "baseline_mode": "none",
        }
    )
    assert integration["time"] == [0.0, 1.0]
    assert integration["window"] == [1000.0, 1200.0]
    assert np.allclose(integration["areas"], [450.0, 650.0])

    x = np.linspace(0, 5, 12)
    y = _kinetics_model(x, 0.2, 1.5, 0.0, 2.0)
    fit = await fit_kinetics({"x": x.tolist(), "y": y.tolist()})

    assert len(fit["x_sorted"]) == len(x)
    assert len(fit["y_fit"]) == len(x)
    assert math.isfinite(fit["params"]["Tau"])
    assert fit["params"]["Tau"] > 0
    assert fit["metrics"]["r2"] > 0.99

    background_run_id = "backend_smoke_subtract_background"
    background_run_dir = RUNS_DIR / background_run_id
    background_run_dir.mkdir(parents=True, exist_ok=True)
    original_text = "\t1000\t1100\t1200\n0\t1\t2\t3\n1\t4\t6\t8\n2\t9\t12\t15\n"
    try:
        (background_run_dir / "sample.txt").write_text(original_text, encoding="utf-8")
        with TemporaryDirectory() as source_dir:
            result = await subtract_background(
                {
                    "run_id": background_run_id,
                    "filename": "sample.srs",
                    "source_folder": source_dir,
                    "background_time": 0.9,
                }
            )
            assert result["filename"] == "sample_sub_1.txt"
            assert result["background_time"] == 1.0
            assert Path(result["source_path"]).is_file()
            derived = np.loadtxt(
                background_run_dir / result["filename"],
                delimiter="\t",
                skiprows=1,
            )
            assert np.allclose(derived[:, 1:], [[-3, -4, -5], [0, 0, 0], [5, 6, 7]])
            assert (background_run_dir / "sample.txt").read_text(encoding="utf-8") == original_text
    finally:
        shutil.rmtree(background_run_dir, ignore_errors=True)

    with TemporaryDirectory() as tmpdir:
        target = Path(tmpdir) / "heatmap.png"
        _save_spectral_heatmap_figure(
            target,
            {
                "x": [1000, 1100, 1200],
                "y": [0, 1, 2],
                "z": [[0, 1, 2], [1, 2, 3], [2, 3, 4]],
                "color_scale": "viridis",
                "overlap": {
                    "enabled": True,
                    "times": [0, 2],
                    "scale": 0.1,
                    "color": "black",
                },
            },
            {"global": {"dpi": 80, "width_cm": 4, "height_cm": 3, "font_size": 12}},
        )
        assert target.is_file()
        assert target.stat().st_size > 0

    run_id = "backend_smoke_svg"
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    try:
        (run_dir / "sample.txt").write_text(
            "\t1000\t1100\t1200\n0\t0\t1\t2\n1\t1\t2\t3\n",
            encoding="utf-8",
        )
        with TemporaryDirectory() as tmpdir:
            result = await export_svg_figures(
                {
                    "run_id": run_id,
                    "source_folder": tmpdir,
                    "filename": "sample.srs",
                    "series": [
                        {
                            "label": "sample",
                            "color": "#000000",
                            "full_time": [0, 1],
                            "full_areas": [1, 2],
                            "x_fit": [0, 1],
                            "y_fit": [1, 2],
                            "x_raw": [0, 1],
                            "y_raw": [0, 1],
                            "y_fit_norm": [0, 1],
                        }
                    ],
                    "traces": [
                        {
                            "x": [1000, 1100, 1200],
                            "y": [0, 1, 2],
                            "color": "#000000",
                            "label": "t=0",
                        }
                    ],
                    "heatmap": {"color_scale": "viridis", "time_range": [0, 1]},
                    "fit_figure_settings": {
                        "global": {"dpi": 80, "width_cm": 4, "height_cm": 3, "font_size": 12},
                        "overlay": {},
                        "normalized": {"marker_size": 30, "enhance_fit": True},
                    },
                    "spectral_figure_settings": {
                        "global": {"dpi": 80, "width_cm": 4, "height_cm": 3, "font_size": 12},
                        "xlabel": "Wavenumber",
                        "ylabel": "Intensity",
                        "xlim": None,
                        "ylim": None,
                    },
                }
            )
            assert len(result["files"]) == 4
            for exported in result["files"]:
                exported_path = Path(exported)
                assert exported_path.suffix == ".svg"
                assert exported_path.is_file()
                assert exported_path.stat().st_size > 0
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
