import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GetDatasetResponse } from '../../types/api';
import type { NumericRange } from '../../types/workflow';
import { usePlotly } from '../../hooks/usePlotly';
import {
  buildWaterfallTracePayload,
  formatRangeInput,
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
  const draggingRef = useRef(false);
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
    const { traces: waterfallTraces, visibleRange } = buildWaterfallTracePayload(
      dataset,
      gap,
      maxLines,
      timeRangeInput,
      colorScheme,
    );
    emitVisibleTimeRangeChange(dataset.filename, visibleRange);

    const [start, end] = integrationRange;

    plotly
      .react(
        plotRef.current,
        waterfallTraces.map((trace) => ({
          x: trace.x,
          y: trace.y,
          mode: 'lines',
          line: { width: 1.1, color: trace.color },
          name: trace.label,
        })),
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
        if (
          axis &&
          typeof axis._offset === 'number' &&
          typeof axis._length === 'number' &&
          typeof axis.l2p === 'function' &&
          typeof axis.p2l === 'function'
        ) {
          setAxisMeta({
            offset: axis._offset,
            length: axis._length,
            l2p: axis.l2p.bind(axis),
            p2l: axis.p2l.bind(axis),
          });
        }
      })
      .catch(() => {});

    return () => {
      setAxisMeta(null);
    };
  }, [colorScheme, dataset, gap, integrationRange, maxLines, plotly, timeRangeInput]);

  const startDrag = (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!axisMeta || !plotRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingRef.current = true;

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
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      draggingRef.current = false;
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
