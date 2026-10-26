import { useEffect, useRef } from 'react';
import { usePlotly } from '../../hooks/usePlotly';
import { getNearestValueFromAxis, subtractSpectrumBaseline } from '../../lib/workflowUtils';
import { getPlotTheme, plotAxisTheme } from '../../lib/plotTheme';
import type { GetDatasetResponse } from '../../types/api';
import type { NumericRange } from '../../types/workflow';

interface SingleSpectrumPlotProps {
  dataset: GetDatasetResponse | null;
  selectedTime: number | null;
  baselineCorrectionEnabled: boolean;
  baselineXRange: NumericRange | null;
}

export function SingleSpectrumPlot({
  dataset,
  selectedTime,
  baselineCorrectionEnabled,
  baselineXRange,
}: SingleSpectrumPlotProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const { plotly, errorMessage } = usePlotly();
  const plotTheme = getPlotTheme();
  const axisTheme = plotAxisTheme();
  const resolvedTime = dataset && selectedTime !== null
    ? getNearestValueFromAxis(dataset.time, selectedTime)
    : null;
  const spectrumIndex = dataset && resolvedTime !== null
    ? dataset.time.indexOf(resolvedTime)
    : -1;
  const rawSpectrum = spectrumIndex >= 0 ? dataset?.spectra[spectrumIndex] : null;
  const spectrum = dataset && rawSpectrum && baselineCorrectionEnabled
    ? subtractSpectrumBaseline(dataset.wavenumbers, rawSpectrum, baselineXRange)
    : rawSpectrum;

  useEffect(() => {
    const plotDiv = plotRef.current;
    if (!plotly || !plotDiv || !dataset || !spectrum || resolvedTime === null) return;

    plotly.react(
      plotDiv,
      [{
        x: dataset.wavenumbers,
        y: spectrum,
        mode: 'lines',
        line: { width: 1.5, color: plotTheme.accent },
        name: `t=${resolvedTime.toFixed(4)}`,
      }],
      {
        title: {
          text: `Single spectrum, ${dataset.filename}, t = ${resolvedTime.toFixed(4)} s`,
          font: { color: plotTheme.ink2, size: 12, family: plotTheme.fontDisplay },
        },
        xaxis: {
          title: 'Wavenumber (cm⁻¹)',
          ...axisTheme,
        },
        yaxis: {
          title: 'Intensity',
          ...axisTheme,
        },
        margin: { l: 60, r: 20, t: 52, b: 50 },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        showlegend: false,
      },
      {
        responsive: true,
        displaylogo: false,
        scrollZoom: false,
        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      },
    ).catch(() => {});
  }, [dataset, plotly, resolvedTime, spectrum]);

  useEffect(() => {
    const plotDiv = plotRef.current;
    return () => {
      if (plotly && plotDiv && typeof plotly.purge === 'function') {
        plotly.purge(plotDiv);
      }
    };
  }, [plotly]);

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="status-line text-error">Failed to load single spectrum plot: {errorMessage}</p>
      </div>
    );
  }

  if (!dataset || !spectrum || resolvedTime === null) {
    return (
      <p className="plate-empty h-full">Select a kinetics file to view its single spectrum.</p>
    );
  }

  return <div ref={plotRef} className="h-full w-full" />;
}
