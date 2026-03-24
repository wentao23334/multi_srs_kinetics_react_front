import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GetDatasetResponse } from '../../types/api';
import type { NumericRange } from '../../types/workflow';
import { usePlotly } from '../../hooks/usePlotly';
import {
  formatRangeInput,
  getSortedTimeAxis,
  parseRangeInput,
  sampleColors,
  sampleIndices,
} from '../../lib/workflowUtils';

interface WaterfallPlotProps {
  dataset: GetDatasetResponse | null;
  integrationRange: [number, number];
  gap: number;
  maxLines: number;
  timeRangeInput: string;
  colorScheme: string;
  onVisibleTimeRangeChange: (filename: string, range: NumericRange) => void;
  onIntegrationRangeChange: (range: [number, number], shouldDebounce: boolean) => void;
}

export function WaterfallPlot({
  dataset,
  integrationRange,
  gap,
  maxLines,
  timeRangeInput,
  colorScheme,
  onVisibleTimeRangeChange,
  onIntegrationRangeChange,
}: WaterfallPlotProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<[number, number]>(integrationRange);
  const { plotly, errorMessage } = usePlotly();
  const [draftRange, setDraftRange] = useState<[number, number]>(integrationRange);
  const [axisMeta, setAxisMeta] = useState<{ offset: number; length: number; l2p: (value: number) => number; p2l: (value: number) => number } | null>(null);

  useEffect(() => {
    setDraftRange(integrationRange);
    rangeRef.current = integrationRange;
  }, [integrationRange[0], integrationRange[1]]);

  const emitVisibleTimeRangeChange = useEffectEvent((filename: string, range: NumericRange) => {
    onVisibleTimeRangeChange(filename, range);
  });

  const emitIntegrationRangeChange = useEffectEvent(
    (range: [number, number], shouldDebounce: boolean) => {
      onIntegrationRangeChange(range, shouldDebounce);
    },
  );

  useEffect(() => {
    if (!plotly || !plotRef.current || !dataset) return;

    const totalFrames = dataset.spectra.length;
    const order = Array.from({ length: totalFrames }, (_, i) => i).sort(
      (a, b) => dataset.time[a] - dataset.time[b],
    );

    const axis = getSortedTimeAxis(dataset.time);
    const parsedRange = parseRangeInput(timeRangeInput);
    const resolvedRange = parsedRange ?? {
      start: axis[0],
      end: axis[axis.length - 1],
    };
    const filteredOrder = order.filter(
      (idx) =>
        dataset.time[idx] >= resolvedRange.start &&
        dataset.time[idx] <= resolvedRange.end,
    );
    const safeOrder = filteredOrder.length ? filteredOrder : order;
    const safeMaxLines = Math.max(1, Math.min(maxLines || 15, safeOrder.length));
    const frameIdx = sampleIndices(safeOrder.length, safeMaxLines).map((k) => safeOrder[k]);

    const visibleRange = {
      start: Math.min(...frameIdx.map((idx) => dataset.time[idx])),
      end: Math.max(...frameIdx.map((idx) => dataset.time[idx])),
    };
    emitVisibleTimeRangeChange(dataset.filename, visibleRange);

    const waterfallColors = sampleColors(colorScheme || 'None', Math.max(frameIdx.length, 1));
    const traces = frameIdx.map((idx, stackIdx) => ({
      x: dataset.wavenumbers,
      y: dataset.spectra[idx].map((value) => value + stackIdx * gap),
      mode: 'lines',
      line: { width: 1.1, color: waterfallColors[stackIdx % waterfallColors.length] },
      name: `t=${dataset.time[idx].toFixed(4)}`,
    }));

    const [start, end] = integrationRange;

    plotly
      .react(
        plotRef.current,
        traces,
        {
          title: {
            text: `SRS Waterfall — ${dataset.filename} (Gap=${gap.toPrecision(4)}, Time=${formatRangeInput(visibleRange.start, visibleRange.end)})`,
            font: { color: '#eeeeee' },
          },
          xaxis: {
            title: 'Wavenumber (cm⁻¹)',
            gridcolor: '#333',
            zerolinecolor: '#444',
            tickfont: { color: '#ccc' },
            titlefont: { color: '#ccc' },
          },
          yaxis: {
            title: 'Intensity + Offset',
            gridcolor: '#333',
            zerolinecolor: '#444',
            tickfont: { color: '#ccc' },
            titlefont: { color: '#ccc' },
          },
          margin: { l: 60, r: 20, t: 52, b: 50 },
          plot_bgcolor: 'transparent',
          paper_bgcolor: 'transparent',
          showlegend: false,
          dragmode: false,
          shapes: [
            {
              type: 'line',
              x0: start,
              x1: start,
              y0: 0,
              y1: 1,
              yref: 'paper',
              line: { color: 'rgba(0,0,0,0)', width: 0 },
              editable: false,
            },
            {
              type: 'line',
              x0: end,
              x1: end,
              y0: 0,
              y1: 1,
              yref: 'paper',
              line: { color: 'rgba(0,0,0,0)', width: 0 },
              editable: false,
            },
          ],
        },
        {
          responsive: true,
          editable: true,
          edits: {
            shapePosition: false,
            annotationPosition: false,
            annotationTail: false,
            annotationText: false,
            axisTitleText: false,
            colorbarPosition: false,
            colorbarTitleText: false,
            legendPosition: false,
            legendText: false,
            shapeText: false,
            titleText: false,
          },
          displaylogo: false,
          scrollZoom: false,
          modeBarButtonsToRemove: [
            'select2d',
            'lasso2d',
            'zoom2d',
            'pan2d',
            'zoomIn2d',
            'zoomOut2d',
            'autoScale2d',
            'resetScale2d',
          ],
        },
      )
      .then(() => {
        const plotDiv = plotRef.current as any;
        const axis = plotDiv?._fullLayout?.xaxis;
        if (axis) {
          setAxisMeta({
            offset: axis._offset,
            length: axis._length,
            l2p: axis.l2p.bind(axis),
            p2l: axis.p2l.bind(axis),
          });
        }
        plotDiv?.removeAllListeners?.('plotly_relayout');
        plotDiv?.on?.('plotly_relayout', (eventData: Record<string, number>) => {
          let changed = false;
          let newStart = integrationRange[0];
          let newEnd = integrationRange[1];

          if (eventData['shapes[0].x0'] !== undefined) {
            newStart = Number(eventData['shapes[0].x0']);
            changed = true;
          } else if (eventData['shapes[0].x1'] !== undefined) {
            newStart = Number(eventData['shapes[0].x1']);
            changed = true;
          }

          if (eventData['shapes[1].x0'] !== undefined) {
            newEnd = Number(eventData['shapes[1].x0']);
            changed = true;
          } else if (eventData['shapes[1].x1'] !== undefined) {
            newEnd = Number(eventData['shapes[1].x1']);
            changed = true;
          }

          if (changed) {
            emitIntegrationRangeChange(
              [Math.min(newStart, newEnd), Math.max(newStart, newEnd)],
              true,
            );
          }
        });
      })
      .catch(() => {});

    return () => {
      const plotDiv = plotRef.current as any;
      plotDiv?.removeAllListeners?.('plotly_relayout');
      setAxisMeta(null);
    };
  }, [colorScheme, dataset, gap, integrationRange, maxLines, plotly, timeRangeInput]);

  const updateLine = (nextRange: [number, number]) => {
    if (!plotly || !plotRef.current) return;
    plotly.relayout(plotRef.current, {
      'shapes[0].x0': nextRange[0],
      'shapes[0].x1': nextRange[0],
      'shapes[1].x0': nextRange[1],
      'shapes[1].x1': nextRange[1],
    }).catch(() => {});
  };

  const startDrag = (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!axisMeta || !plotRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const plotDiv = plotRef.current;

    const onMove = (moveEvent: PointerEvent) => {
      const rect = plotDiv.getBoundingClientRect();
      const pixel = moveEvent.clientX - rect.left - axisMeta.offset;
      const clamped = Math.max(0, Math.min(axisMeta.length, pixel));
      const value = Number(axisMeta.p2l(clamped));
      const baseRange = rangeRef.current;
      const nextRange = handle === 'start'
        ? [Math.min(value, baseRange[1]), Math.max(value, baseRange[1])] as [number, number]
        : [Math.min(baseRange[0], value), Math.max(baseRange[0], value)] as [number, number];
      setDraftRange(nextRange);
      rangeRef.current = nextRange;
      updateLine(nextRange);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      emitIntegrationRangeChange(rangeRef.current, true);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-slate-400">
        Failed to load waterfall plot: {errorMessage}
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Extract files and select one to render the waterfall.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={plotRef} className="h-full w-full" />
      {axisMeta &&
        (['start', 'end'] as const).map((handle) => {
          const value = handle === 'start' ? draftRange[0] : draftRange[1];
          const left = axisMeta.offset + axisMeta.l2p(value);
          return (
            <div
              key={handle}
              className="absolute top-0 bottom-0 z-20 w-4 -translate-x-1/2 cursor-col-resize"
              style={{ left }}
              onPointerDown={startDrag(handle)}
            >
              <div className="mx-auto h-full border-l-2 border-dashed border-orange-400" />
            </div>
          );
        })}
    </div>
  );
}
