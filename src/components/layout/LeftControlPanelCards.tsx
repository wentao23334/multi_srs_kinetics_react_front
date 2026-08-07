import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  buildEvenlySpacedValues,
  formatNumber,
  updateOverlapTimeSelection,
} from '../../lib/workflowUtils';
import type {
  FigurePanelSettings,
  GlobalImageSettings,
  NumericRange,
  SpectralFigureSettings,
} from '../../types/workflow';

function colorKey(color: string) {
  return String(color || '').trim().toLowerCase();
}

export function ManualFitColorPicker({
  colors,
  filenames,
  selectedColors,
  onChange,
}: {
  colors: string[];
  filenames: string[];
  selectedColors: string[];
  onChange: (filename: string, color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draggedFilename, setDraggedFilename] = useState<string | null>(null);
  const selectedByColor = new Map<string, string>();

  filenames.forEach((filename, index) => {
    const color = selectedColors[index];
    if (!color) return;
    selectedByColor.set(colorKey(color), filename);
  });

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-black/30 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      >
        <span>Manual Colors</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
          {colors.map((color, index) => {
            const key = colorKey(color);
            const selectedFilename = selectedByColor.get(key) ?? null;
            const occupiedByOther = Boolean(
              draggedFilename && selectedFilename && selectedFilename !== draggedFilename,
            );

            return (
              <button
                key={`${color}-${index}`}
                type="button"
                aria-label={selectedFilename ? 'Selected fit color' : 'Fit color option'}
                onDragOver={(event) => {
                  if (!draggedFilename || occupiedByOther) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const filename = event.dataTransfer.getData('text/plain') || draggedFilename;
                  if (!filename || occupiedByOther) return;
                  onChange(filename, color);
                }}
                className={`relative aspect-square rounded-md border border-white/10 transition-transform ${
                  occupiedByOther ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'
                }`}
                style={{ background: color }}
              >
                {selectedFilename && (
                  <span
                    draggable
                    onDragStart={(event) => {
                      setDraggedFilename(selectedFilename);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', selectedFilename);
                    }}
                    onDragEnd={() => setDraggedFilename(null)}
                    className="absolute -inset-1 z-10 cursor-grab rounded-lg border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_0_12px_rgba(255,255,255,0.35)] active:cursor-grabbing"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GlobalImageSettingsCard({
  settings,
  onChange,
  onExportSvgFigures,
  exportSvgPending,
}: {
  settings: GlobalImageSettings;
  onChange: (key: keyof GlobalImageSettings, value: number | boolean) => void;
  onExportSvgFigures: () => void;
  exportSvgPending: boolean;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-sm">
      <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-[11px] font-medium text-slate-400">
        Applies to overlay, normalized, spectral waterfall, and spectral heatmap exports.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">DPI</span>
          <input
            type="number"
            min={1}
            step={1}
            value={settings.dpi}
            onChange={(event) => onChange('dpi', Number(event.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 hover:bg-black/30"
          />
        </label>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Width (cm)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={settings.widthCm}
            onChange={(event) => onChange('widthCm', Number(event.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 hover:bg-black/30"
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-300">
        <span className="mb-1.5 block">Height (cm)</span>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={settings.heightCm}
          onChange={(event) => onChange('heightCm', Number(event.target.value))}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 hover:bg-black/30"
        />
      </label>
      <label className="block text-xs font-medium text-slate-300">
        <span className="mb-1.5 block">Font Size</span>
        <input
          type="number"
          min={1}
          step={1}
          value={settings.fontSize}
          onChange={(event) => onChange('fontSize', Number(event.target.value))}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 hover:bg-black/30"
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
        <input
          type="checkbox"
          checked={settings.reverseWavenumberAxis}
          onChange={(event) => onChange('reverseWavenumberAxis', event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-sky-500 focus:ring-sky-500/50 focus:ring-offset-0 transition-all"
        />
        <span>Reverse Wavenumber Axis</span>
      </label>
      <button
        type="button"
        onClick={onExportSvgFigures}
        disabled={exportSvgPending}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:to-cyan-500 hover:shadow-sky-500/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {exportSvgPending ? 'Exporting SVG...' : 'Export SVG to Source Folder'}
      </button>
    </div>
  );
}

export function FigurePanelCard({
  title,
  panelKey,
  settings,
  onChange,
}: {
  title: string;
  panelKey: 'overlay' | 'normalized';
  settings: FigurePanelSettings;
  onChange: (
    panel: 'overlay' | 'normalized',
    key: keyof FigurePanelSettings,
    value: string | boolean,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">X Axis Title</span>
          <input
            value={settings.xlabel}
            onChange={(event) => onChange(panelKey, 'xlabel', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
          />
        </label>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Y Axis Title</span>
          <input
            value={settings.ylabel}
            onChange={(event) => onChange(panelKey, 'ylabel', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-300">
            <span className="mb-1.5 block">X Axis Range</span>
            <input
              value={settings.xRangeInput}
              onChange={(event) => onChange(panelKey, 'xRangeInput', event.target.value)}
              placeholder="e.g. 0,160"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
            />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            <span className="mb-1.5 block">Y Axis Range</span>
            <input
              value={settings.yRangeInput}
              onChange={(event) => onChange(panelKey, 'yRangeInput', event.target.value)}
              placeholder="e.g. 0,1.1"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
            />
          </label>
        </div>
        {panelKey === 'normalized' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Circle Size</span>
              <input
                type="number"
                min={1}
                step={1}
                value={settings.markerSizeInput ?? '20'}
                onChange={(event) => onChange(panelKey, 'markerSizeInput', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
              />
            </label>
            <label className="flex cursor-pointer items-end gap-2 pb-2 text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={settings.enhanceFit ?? false}
                onChange={(event) => onChange(panelKey, 'enhanceFit', event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
              />
              <span>Enhance Fit Curves</span>
            </label>
          </div>
        )}
        <div className="pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={settings.showLabels}
              onChange={(event) => onChange(panelKey, 'showLabels', event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
            />
            <span>Show Curve Labels</span>
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Offset %</span>
          <input
            value={settings.labelOffsetInput}
            onChange={(event) => onChange(panelKey, 'labelOffsetInput', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
          />
        </label>
      </div>
    </div>
  );
}

export function SpectralFigureCard({
  settings,
  onChange,
  overlapTimeRange,
  overlapScaleInputDefault,
}: {
  settings: SpectralFigureSettings;
  onChange: <Key extends keyof SpectralFigureSettings>(
    key: Key,
    value: SpectralFigureSettings[Key],
  ) => void;
  overlapTimeRange: NumericRange | null;
  overlapScaleInputDefault: string;
}) {
  const fillDefaultOverlapScale = () => {
    if (!settings.overlapScaleInput.trim() && overlapScaleInputDefault) {
      onChange('overlapScaleInput', overlapScaleInputDefault);
    }
  };

  const resetOverlapTimes = (count = settings.overlapCount) => {
    if (!overlapTimeRange) return;
    onChange(
      'overlapTimes',
      buildEvenlySpacedValues(overlapTimeRange.start, overlapTimeRange.end, count),
    );
  };

  useEffect(() => {
    if (
      settings.overlapEnabled &&
      !settings.overlapScaleInput.trim() &&
      overlapScaleInputDefault
    ) {
      onChange('overlapScaleInput', overlapScaleInputDefault);
    }
  }, [
    onChange,
    overlapScaleInputDefault,
    settings.overlapEnabled,
    settings.overlapScaleInput,
  ]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Spectral Figure</p>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Figure Title</span>
          <input
            value={settings.title}
            onChange={(event) => onChange('title', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
          />
        </label>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">X Axis Title</span>
          <input
            value={settings.xlabel}
            onChange={(event) => onChange('xlabel', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
          />
        </label>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Y Axis Title</span>
          <input
            value={settings.ylabel}
            onChange={(event) => onChange('ylabel', event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-300">
            <span className="mb-1.5 block">X Axis Range</span>
            <input
              value={settings.xRangeInput}
              onChange={(event) => onChange('xRangeInput', event.target.value)}
              placeholder="optional"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
            />
          </label>
          <label className="block text-xs font-medium text-slate-300">
            <span className="mb-1.5 block">Y Axis Range</span>
            <input
              value={settings.yRangeInput}
              onChange={(event) => onChange('yRangeInput', event.target.value)}
              placeholder="optional"
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-300">
          <span className="mb-1.5 block">Heatmap Color Range</span>
          <input
            value={settings.zRangeInput}
            onChange={(event) => onChange('zRangeInput', event.target.value)}
            placeholder="optional, e.g. -0.2,0.8"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-slate-300">
          <input
            type="checkbox"
            checked={settings.overlapEnabled}
            onChange={(event) => {
              onChange('overlapEnabled', event.target.checked);
              if (event.target.checked && !settings.overlapTimes.length) {
                resetOverlapTimes();
              }
              if (event.target.checked) {
                fillDefaultOverlapScale();
              }
            }}
            className="h-4 w-4 rounded border-white/20 bg-black/30 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0 transition-all"
          />
          <span>Overlap</span>
        </label>

        {settings.overlapEnabled && (
          <div className="space-y-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Count</span>
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={settings.overlapCount}
                onChange={(event) => {
                  const nextCount = Math.max(1, Math.floor(Number(event.target.value) || 1));
                  onChange('overlapCount', nextCount);
                  resetOverlapTimes(nextCount);
                }}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
              />
            </label>
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Scale</span>
              <input
                type="number"
                step="any"
                min={0}
                value={settings.overlapScaleInput}
                onChange={(event) => onChange('overlapScaleInput', event.target.value)}
                placeholder="auto"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:bg-black/30"
              />
            </label>
            <OverlapTimeAxis
              count={settings.overlapCount}
              range={overlapTimeRange}
              times={settings.overlapTimes}
              onChange={(times) => onChange('overlapTimes', times)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OverlapTimeAxis({
  count,
  range,
  times,
  onChange,
}: {
  count: number;
  range: NumericRange | null;
  times: number[];
  onChange: (times: number[]) => void;
}) {
  const axisRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!range) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
        Select a waterfall file first.
      </div>
    );
  }

  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  const values = times.length === Math.max(1, Math.floor(count))
    ? times
    : buildEvenlySpacedValues(start, end, count);

  const updateFromPointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const value = start + (end - start) * ratio;
    onChange(updateOverlapTimeSelection(values, count, index, value, { start, end }));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-slate-500">
        <span>{formatNumber(start, 4)}</span>
        <span>{formatNumber(end, 4)}</span>
      </div>
      <div ref={axisRef} className="relative h-10 rounded-lg border border-white/10 bg-black/20">
        <span className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-white/15" />
        {values.map((value, index) => {
          const left = `${((value - start) / Math.max(end - start, 1e-12)) * 100}%`;
          const active = activeIndex === index;
          return (
            <button
              key={index}
              type="button"
              aria-label={`Overlap time ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              onPointerDown={(event) => {
                setActiveIndex(index);
                event.currentTarget.setPointerCapture?.(event.pointerId);
                updateFromPointer(event, index);
              }}
              onPointerMove={(event) => {
                if (event.buttons !== 1) return;
                updateFromPointer(event, index);
              }}
              className="absolute top-1/2 z-10 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-col-resize rounded-full border border-white/50 bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.25)] outline-none transition-transform hover:scale-110 focus:scale-110"
              style={{ left }}
            >
              {active && (
                <span className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2 py-1 text-[10px] font-medium text-slate-200">
                  {formatNumber(value, 4)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
