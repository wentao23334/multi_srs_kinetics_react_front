import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { NumericRange, IntegrationCacheEntry } from '../../types/workflow';
import { usePlotly } from '../../hooks/usePlotly';
import { getSnappedRange } from '../../lib/workflowUtils';

type PlotlyAxis = {
  _offset?: unknown;
  _length?: unknown;
  range?: unknown;
  l2p?: unknown;
  p2l?: unknown;
};

type PlotlyDiv = HTMLDivElement & {
  _fullLayout?: {
    xaxis?: PlotlyAxis;
  };
  on?: (eventName: string, handler: () => void) => void;
  off?: (eventName: string, handler: () => void) => void;
};

type AxisMeta = {
  offset: number;
  length: number;
  rangeKey: string;
  l2p: (value: number) => number;
  p2l: (value: number) => number;
};

type DraftRangeState = {
  sourceKey: string;
  range: NumericRange;
};

interface KineticsPlotProps {
  filename: string | null;
  integrationData: IntegrationCacheEntry | null;
  fitRange: NumericRange | null;
  onFitRangeChange: (filename: string, range: NumericRange) => void;
}

export function KineticsPlot({
  filename,
  integrationData,
  fitRange,
  onFitRangeChange,
}: KineticsPlotProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<NumericRange | null>(fitRange);
  const axisMetaRef = useRef<AxisMeta | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const { plotly, errorMessage } = usePlotly();
  const fitRangeKey = `${filename ?? ''}:${fitRange?.start ?? 'null'}|${fitRange?.end ?? 'null'}`;
  const [draftRange, setDraftRange] = useState<DraftRangeState | null>(null);
  const [axisMeta, setAxisMeta] = useState<AxisMeta | null>(null);

  useEffect(() => {
    rangeRef.current = fitRange;
  }, [filename, fitRange]);

  const captureAxisMeta = useCallback(() => {
    const plotDiv = plotRef.current as PlotlyDiv | null;
    const axis = plotDiv?._fullLayout?.xaxis;
    if (
      axis &&
      typeof axis._offset === 'number' &&
      typeof axis._length === 'number' &&
      typeof axis.l2p === 'function' &&
      typeof axis.p2l === 'function'
    ) {
      const rangeKey = Array.isArray(axis.range) ? axis.range.map((value: unknown) => String(value)).join('|') : '';
      const l2p = axis.l2p as (value: number) => number;
      const p2l = axis.p2l as (value: number) => number;
      const nextMeta: AxisMeta = {
        offset: axis._offset,
        length: axis._length,
        rangeKey,
        l2p: l2p.bind(axis),
        p2l: p2l.bind(axis),
      };
      const previousMeta = axisMetaRef.current;
      axisMetaRef.current = nextMeta;
      if (
        !previousMeta ||
        previousMeta.offset !== nextMeta.offset ||
        previousMeta.length !== nextMeta.length ||
        previousMeta.rangeKey !== nextMeta.rangeKey
      ) {
        setAxisMeta(nextMeta);
      }
      return nextMeta;
    }
    return null;
  }, []);

  const emitFitRangeChange = useCallback((nextRange: NumericRange) => {
    if (!filename) return;
    onFitRangeChange(filename, nextRange);
  }, [filename, onFitRangeChange]);

  useEffect(() => {
    if (!plotly || !plotRef.current || !filename || !integrationData) return;

    const tMin = Math.min(...integrationData.time);
    const tMax = Math.max(...integrationData.time);
    const resolvedRange = fitRange ?? { start: tMin, end: tMax };
    const plotDiv = plotRef.current as PlotlyDiv;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;
    const syncAxisMeta = () => {
      if (!disposed) {
        captureAxisMeta();
      }
    };

    const scheduleAxisSync = () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        if (!plotRef.current || disposed) return;

        const resizeResult = plotly?.Plots?.resize?.(plotRef.current);
        if (resizeResult && typeof resizeResult.then === 'function') {
          resizeResult.then(syncAxisMeta).catch(syncAxisMeta);
          return;
        }
        syncAxisMeta();
      });
    };

    plotly
      .newPlot(
        plotDiv,
        [
          {
            x: integrationData.time,
            y: integrationData.areas,
            mode: 'lines+markers',
            marker: { size: 5, color: '#3dc19e' },
            line: { color: '#3dc19e' },
            name: 'Integrated Area',
          },
        ],
        {
          title: {
            text: `Area–Time [${integrationData.window[0].toFixed(0)}, ${integrationData.window[1].toFixed(0)}] cm⁻¹  —  ${filename}`,
            font: { color: '#eeeeee', size: 12 },
          },
          xaxis: {
            title: 'Time / Potential',
            gridcolor: '#333',
            zerolinecolor: '#444',
            tickfont: { color: '#ccc' },
            titlefont: { color: '#ccc' },
          },
          yaxis: {
            title: 'Integrated Area',
            gridcolor: '#333',
            zerolinecolor: '#444',
            tickfont: { color: '#ccc' },
            titlefont: { color: '#ccc' },
          },
          margin: { l: 60, r: 20, t: 52, b: 50 },
          plot_bgcolor: 'transparent',
          paper_bgcolor: 'transparent',
          shapes: [
            {
              type: 'line',
              x0: resolvedRange.start,
              x1: resolvedRange.start,
              y0: 0,
              y1: 1,
              yref: 'paper',
              line: { color: 'rgba(0,0,0,0)', width: 0 },
              editable: false,
            },
            {
              type: 'line',
              x0: resolvedRange.end,
              x1: resolvedRange.end,
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
          displaylogo: false,
          scrollZoom: false,
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
        if (disposed) return;
        syncAxisMeta();

        plotDiv.on?.('plotly_afterplot', syncAxisMeta);
        plotDiv.on?.('plotly_relayout', syncAxisMeta);
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(scheduleAxisSync);
          resizeObserver.observe(plotDiv);
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      setAxisMeta(null);
      axisMetaRef.current = null;
      plotDiv.off?.('plotly_afterplot', syncAxisMeta);
      plotDiv.off?.('plotly_relayout', syncAxisMeta);
      if (plotly && plotDiv && typeof plotly.purge === 'function') {
        plotly.purge(plotDiv);
      }
    };
  }, [captureAxisMeta, filename, fitRange, integrationData, plotly]);

  const currentRange = draftRange?.sourceKey === fitRangeKey ? draftRange.range : fitRange;

  const startDrag = (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeAxisMeta = captureAxisMeta() ?? axisMetaRef.current ?? axisMeta;
    if (!activeAxisMeta || !currentRange || !plotRef.current || !filename || !integrationData) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingRef.current = true;

    const plotDiv = plotRef.current;

    const onMove = (moveEvent: PointerEvent) => {
      const currentAxisMeta = axisMetaRef.current ?? activeAxisMeta;
      const rect = plotDiv.getBoundingClientRect();
      const pixel = moveEvent.clientX - rect.left - currentAxisMeta.offset;
      const clamped = Math.max(0, Math.min(currentAxisMeta.length, pixel));
      const value = Number(currentAxisMeta.p2l(clamped));
      const baseRange = rangeRef.current ?? currentRange;
      if (!baseRange) return;
      const nextRange = handle === 'start'
        ? {
            start: Math.min(value, baseRange.end),
            end: Math.max(value, baseRange.end),
          }
        : {
            start: Math.min(baseRange.start, value),
            end: Math.max(baseRange.start, value),
          };
      setDraftRange({ sourceKey: fitRangeKey, range: nextRange });
      rangeRef.current = nextRange;
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      draggingRef.current = false;
      const finalRange = rangeRef.current ?? currentRange;
      if (finalRange) {
        const axis = Array.from(new Set(integrationData.time.slice().sort((a, b) => a - b)));
        const snappedRange = getSnappedRange(axis, finalRange.start, finalRange.end);
        setDraftRange({ sourceKey: fitRangeKey, range: snappedRange });
        rangeRef.current = snappedRange;
        emitFitRangeChange(snappedRange);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-slate-400">
        Failed to load kinetics plot: {errorMessage}
      </div>
    );
  }

  if (!filename || !integrationData) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Integrate a file to render the kinetics plot.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={plotRef} className="h-full w-full" />
      {axisMeta && currentRange && (
        <>
          {(['start', 'end'] as const).map((handle) => {
            const value = handle === 'start' ? currentRange.start : currentRange.end;
            const left = axisMeta.offset + axisMeta.l2p(value);
            return (
              <div
                key={handle}
                className="absolute top-0 bottom-0 z-20 flex w-4 -translate-x-1/2 cursor-col-resize justify-center"
              style={{ left }}
              onPointerDown={startDrag(handle)}
            >
                <div className="h-full w-0 border-l-2 border-dashed border-purple-400" />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
