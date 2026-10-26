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
        className="btn w-full justify-between"
      >
        <span>Manual Colors</span>
        <ChevronDown
          aria-hidden="true"
          className={`step-chevron h-4 w-4 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-8 gap-1.5 border border-rule bg-sheet p-2">
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
                className={`relative aspect-square outline outline-1 -outline-offset-1 outline-rule-2 ${
                  occupiedByOther ? 'cursor-not-allowed opacity-60' : ''
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
                    className="absolute -inset-1 z-10 cursor-grab border-2 border-ink active:cursor-grabbing"
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
    <div className="space-y-4 border-t-2 border-rule-2 pt-4">
      <p className="text-xs leading-relaxed text-muted">
        Applies to overlay, normalized, spectral waterfall, and spectral heatmap exports.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          <span className="field-label">DPI</span>
          <input
            type="number"
            min={1}
            step={1}
            value={settings.dpi}
            onChange={(event) => onChange('dpi', Number(event.target.value))}
            className="input input--num"
          />
        </label>
        <label className="field">
          <span className="field-label">Width (cm)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={settings.widthCm}
            onChange={(event) => onChange('widthCm', Number(event.target.value))}
            className="input input--num"
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Height (cm)</span>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={settings.heightCm}
          onChange={(event) => onChange('heightCm', Number(event.target.value))}
          className="input input--num"
        />
      </label>
      <label className="field">
        <span className="field-label">Font Size</span>
        <input
          type="number"
          min={1}
          step={1}
          value={settings.fontSize}
          onChange={(event) => onChange('fontSize', Number(event.target.value))}
          className="input input--num"
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={settings.reverseWavenumberAxis}
          onChange={(event) => onChange('reverseWavenumberAxis', event.target.checked)}
          className="checkbox"
        />
        <span>Reverse Wavenumber Axis</span>
      </label>
      <button
        type="button"
        onClick={onExportSvgFigures}
        disabled={exportSvgPending}
        aria-busy={exportSvgPending}
        className="btn w-full"
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
    <div className="border-t border-rule pt-3">
      <h4 className="mb-3 font-display text-sm font-semibold text-ink">{title}</h4>
      <div className="space-y-3">
        <label className="field">
          <span className="field-label">X Axis Title</span>
          <input
            value={settings.xlabel}
            onChange={(event) => onChange(panelKey, 'xlabel', event.target.value)}
            className="input"
          />
        </label>
        <label className="field">
          <span className="field-label">Y Axis Title</span>
          <input
            value={settings.ylabel}
            onChange={(event) => onChange(panelKey, 'ylabel', event.target.value)}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            <span className="field-label">X Axis Range</span>
            <input
              value={settings.xRangeInput}
              onChange={(event) => onChange(panelKey, 'xRangeInput', event.target.value)}
              placeholder="e.g. 0,160"
              className="input input--num"
            />
          </label>
          <label className="field">
            <span className="field-label">Y Axis Range</span>
            <input
              value={settings.yRangeInput}
              onChange={(event) => onChange(panelKey, 'yRangeInput', event.target.value)}
              placeholder="e.g. 0,1.1"
              className="input input--num"
            />
          </label>
        </div>
        {panelKey === 'normalized' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span className="field-label">Circle Size</span>
              <input
                type="number"
                min={1}
                step={1}
                value={settings.markerSizeInput ?? '20'}
                onChange={(event) => onChange(panelKey, 'markerSizeInput', event.target.value)}
                className="input input--num"
              />
            </label>
            <label className="flex cursor-pointer items-end gap-2 pb-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={settings.enhanceFit ?? false}
                onChange={(event) => onChange(panelKey, 'enhanceFit', event.target.checked)}
                className="checkbox"
              />
              <span>Enhance Fit Curves</span>
            </label>
          </div>
        )}
        <div className="pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={settings.showLabels}
              onChange={(event) => onChange(panelKey, 'showLabels', event.target.checked)}
              className="checkbox"
            />
            <span>Show Curve Labels</span>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Offset %</span>
          <input
            value={settings.labelOffsetInput}
            onChange={(event) => onChange(panelKey, 'labelOffsetInput', event.target.value)}
            className="input input--num"
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
    <div className="border-t border-rule pt-3">
      <h4 className="mb-3 font-display text-sm font-semibold text-ink">Spectral Figure</h4>
      <div className="space-y-3">
        <label className="field">
          <span className="field-label">Figure Title</span>
          <input
            value={settings.title}
            onChange={(event) => onChange('title', event.target.value)}
            className="input"
          />
        </label>
        <label className="field">
          <span className="field-label">X Axis Title</span>
          <input
            value={settings.xlabel}
            onChange={(event) => onChange('xlabel', event.target.value)}
            className="input"
          />
        </label>
        <label className="field">
          <span className="field-label">Y Axis Title</span>
          <input
            value={settings.ylabel}
            onChange={(event) => onChange('ylabel', event.target.value)}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            <span className="field-label">X Axis Range</span>
            <input
              value={settings.xRangeInput}
              onChange={(event) => onChange('xRangeInput', event.target.value)}
              placeholder="optional"
              className="input input--num"
            />
          </label>
          <label className="field">
            <span className="field-label">Y Axis Range</span>
            <input
              value={settings.yRangeInput}
              onChange={(event) => onChange('yRangeInput', event.target.value)}
              placeholder="optional"
              className="input input--num"
            />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Heatmap Color Range</span>
          <input
            value={settings.zRangeInput}
            onChange={(event) => onChange('zRangeInput', event.target.value)}
            placeholder="optional, e.g. -0.2,0.8"
            className="input input--num"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
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
              className="checkbox"
            />
            <span>Overlap</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={settings.baselineCorrectionEnabled}
              onChange={(event) => onChange('baselineCorrectionEnabled', event.target.checked)}
              className="checkbox"
            />
            <span>Baseline</span>
          </label>
        </div>

        {settings.overlapEnabled && (
          <div className="space-y-3 border-t-2 border-rule-2 pt-3">
            <label className="field">
              <span className="field-label">Count</span>
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
                className="input input--num"
              />
            </label>
            <label className="field">
              <span className="field-label">Scale</span>
              <input
                type="number"
                step="any"
                min={0}
                value={settings.overlapScaleInput}
                onChange={(event) => onChange('overlapScaleInput', event.target.value)}
                placeholder="auto"
                className="input input--num"
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
      <p className="status-line border border-rule bg-sheet px-3 py-3">
        Select a waterfall file first.
      </p>
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
      <div className="mb-1.5 flex items-center justify-between font-outlier text-xs tabular-nums text-muted">
        <span>{formatNumber(start, 4)}</span>
        <span>{formatNumber(end, 4)}</span>
      </div>
      <div ref={axisRef} className="relative h-10 border border-rule bg-sheet">
        <span aria-hidden="true" className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-rule-2" />
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
              className="absolute top-1/2 z-10 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-col-resize border border-ink-2 bg-accent outline-none"
              style={{ left }}
            >
              <span className="absolute -inset-2" aria-hidden="true" />
              {active && (
                <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap border border-rule-2 bg-paper px-2 py-1 font-outlier text-xs tabular-nums text-ink">
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
