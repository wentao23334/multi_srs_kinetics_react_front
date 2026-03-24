import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { NumericRange, IntegrationCacheEntry } from '../../types/workflow';
import { usePlotly } from '../../hooks/usePlotly';

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
  const { plotly, errorMessage } = usePlotly();
  const [draftRange, setDraftRange] = useState<NumericRange | null>(fitRange);
  const [axisMeta, setAxisMeta] = useState<{ offset: number; length: number; l2p: (value: number) => number; p2l: (value: number) => number } | null>(null);

  useEffect(() => {
    setDraftRange(fitRange);
    rangeRef.current = fitRange;
  }, [fitRange?.start, fitRange?.end]);

  const emitFitRangeChange = useEffectEvent((nextRange: NumericRange) => {
    if (!filename) return;
    onFitRangeChange(filename, nextRange);
  });

  useEffect(() => {
    if (!plotly || !plotRef.current || !filename || !integrationData) return;

    const tMin = Math.min(...integrationData.time);
    const tMax = Math.max(...integrationData.time);
    const resolvedRange = fitRange ?? { start: tMin, end: tMax };

    plotly
      .newPlot(
        plotRef.current,
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
        plotDiv?.removeAllListeners?.('plotly_relayout');
        plotDiv?.on?.('plotly_relayout', (eventData: Record<string, number>) => {
          let newStart = resolvedRange.start;
          let newEnd = resolvedRange.end;
          let changed = false;

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
            emitFitRangeChange({
              start: Math.min(newStart, newEnd),
              end: Math.max(newStart, newEnd),
            });
          }
        });
      })
      .catch(() => {});

    return () => {
      const plotDiv = plotRef.current as any;
      plotDiv?.removeAllListeners?.('plotly_relayout');
      setAxisMeta(null);
    };
  }, [filename, fitRange, integrationData, plotly]);

  const currentRange = draftRange ?? fitRange;

  const updateLine = (nextRange: NumericRange) => {
    if (!plotly || !plotRef.current) return;
    plotly.relayout(plotRef.current, {
      'shapes[0].x0': nextRange.start,
      'shapes[0].x1': nextRange.start,
      'shapes[1].x0': nextRange.end,
      'shapes[1].x1': nextRange.end,
    }).catch(() => {});
  };

  const startDrag = (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!axisMeta || !currentRange || !plotRef.current || !filename) return;
    event.preventDefault();
    event.stopPropagation();

    const plotDiv = plotRef.current;

    const onMove = (moveEvent: PointerEvent) => {
      const rect = plotDiv.getBoundingClientRect();
      const pixel = moveEvent.clientX - rect.left - axisMeta.offset;
      const clamped = Math.max(0, Math.min(axisMeta.length, pixel));
      const value = Number(axisMeta.p2l(clamped));
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
      setDraftRange(nextRange);
      rangeRef.current = nextRange;
      updateLine(nextRange);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const finalRange = rangeRef.current ?? currentRange;
      if (finalRange) {
        emitFitRangeChange(finalRange);
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
                className="absolute top-0 bottom-0 z-20 w-4 -translate-x-1/2 cursor-col-resize"
              style={{ left }}
              onPointerDown={startDrag(handle)}
            >
                <div className="mx-auto h-full border-l-2 border-dashed border-purple-400" />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
