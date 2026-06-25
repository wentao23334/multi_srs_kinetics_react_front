from __future__ import annotations

import asyncio
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.main import _kinetics_model, fit_kinetics, integrate


async def main() -> None:
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


if __name__ == "__main__":
    asyncio.run(main())
