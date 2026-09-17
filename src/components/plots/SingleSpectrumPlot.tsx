import { useEffect, useRef } from 'react';
import { usePlotly } from '../../hooks/usePlotly';
import { getNearestValueFromAxis, subtractSpectrumBaseline } from '../../lib/workflowUtils';
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
        line: { width: 1.5, color: '#ef4444' },
        name: `t=${resolvedTime.toFixed(4)}`,
      }],
      {
        title: {
          text: `Single Spectrum — ${dataset.filename} — t=${resolvedTime.toFixed(4)}`,
          font: { color: '#eeeeee', size: 12 },
        },
        xaxis: {
          title: 'Wavenumber (cm⁻¹)',
          gridcolor: '#333',
          zerolinecolor: '#444',
          tickfont: { color: '#ccc' },
          titlefont: { color: '#ccc' },
        },
        yaxis: {
          title: 'Intensity',
          gridcolor: '#333',
          zerolinecolor: '#444',
          tickfont: { color: '#ccc' },
          titlefont: { color: '#ccc' },
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
      <div className="flex h-full items-center justify-center px-4 text-sm text-slate-400">
        Failed to load single spectrum plot: {errorMessage}
      </div>
    );
  }

  if (!dataset || !spectrum || resolvedTime === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a kinetics file to view its single spectrum.
      </div>
    );
  }

  return <div ref={plotRef} className="h-full w-full" />;
}
