import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  FigurePanelSettings,
  GlobalImageSettings,
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
}: {
  settings: GlobalImageSettings;
  onChange: (key: keyof GlobalImageSettings, value: number | boolean) => void;
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
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
        <input
          type="checkbox"
          checked={settings.reverseWavenumberAxis}
          onChange={(event) => onChange('reverseWavenumberAxis', event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-sky-500 focus:ring-sky-500/50 focus:ring-offset-0 transition-all"
        />
        <span>Reverse Wavenumber Axis</span>
      </label>
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
        <div className="flex items-center gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={settings.showLabels}
              onChange={(event) => onChange(panelKey, 'showLabels', event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
            />
            <span>Show Curve Labels</span>
          </label>
          <label className="flex flex-1 items-center gap-2 text-xs font-medium text-slate-300">
            <span className="whitespace-nowrap">Offset %</span>
            <input
              value={settings.labelOffsetInput}
              onChange={(event) => onChange(panelKey, 'labelOffsetInput', event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-slate-200 transition-colors focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function SpectralFigureCard({
  settings,
  onChange,
}: {
  settings: SpectralFigureSettings;
  onChange: (key: keyof SpectralFigureSettings, value: string) => void;
}) {
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
      </div>
    </div>
  );
}
