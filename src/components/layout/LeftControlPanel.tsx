import { sampleColors } from '../../lib/workflowUtils';
import type {
  FigurePanelSettings,
  FigureSettingsState,
  FitRangeMap,
} from '../../types/workflow';

interface LeftControlPanelProps {
  currentStep: number;
  keepRecord: boolean;
  onKeepRecordChange: (value: boolean) => void;
  folderInput: string;
  onFolderInputChange: (value: string) => void;
  foundSrsFiles: string[];
  selectedFiles: string[];
  onToggleSelectAll: (checked: boolean) => void;
  onToggleFile: (filename: string, checked: boolean) => void;
  applyFolderPending: boolean;
  onApplyFolder: () => void;
  mode: 'fast' | 'realtime';
  onModeChange: (value: 'fast' | 'realtime') => void;
  defaultStartWn: number;
  onDefaultStartWnChange: (value: number) => void;
  defaultEndWn: number;
  onDefaultEndWnChange: (value: number) => void;
  extractPending: boolean;
  onExtractAll: () => void;
  integrationRange: [number, number];
  onIntegrationRangeChange: (range: [number, number]) => void;
  baselineMode: 'none' | 'linear';
  onBaselineModeChange: (value: 'none' | 'linear') => void;
  onIntegrate: () => void;
  extractedFilenames: string[];
  fitRanges: FitRangeMap;
  activeKineticsFile: string | null;
  onSelectKineticsFile: (filename: string) => void;
  onFitRangeInputChange: (
    filename: string,
    bound: 'start' | 'end',
    value: string,
  ) => void;
  figureSettings: FigureSettingsState;
  onFigureColorSchemeChange: (value: string) => void;
  onFigurePanelChange: (
    panel: 'overlay' | 'normalized',
    key: keyof FigurePanelSettings,
    value: string | boolean,
  ) => void;
}

function FigurePanelCard({
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
          <label className="flex-1 text-xs font-medium text-slate-300 flex items-center gap-2">
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

export function LeftControlPanel({
  currentStep,
  keepRecord,
  onKeepRecordChange,
  folderInput,
  onFolderInputChange,
  foundSrsFiles,
  selectedFiles,
  onToggleSelectAll,
  onToggleFile,
  applyFolderPending,
  onApplyFolder,
  mode,
  onModeChange,
  defaultStartWn,
  onDefaultStartWnChange,
  defaultEndWn,
  onDefaultEndWnChange,
  extractPending,
  onExtractAll,
  integrationRange,
  onIntegrationRangeChange,
  baselineMode,
  onBaselineModeChange,
  onIntegrate,
  extractedFilenames,
  fitRanges,
  activeKineticsFile,
  onSelectKineticsFile,
  onFitRangeInputChange,
  figureSettings,
  onFigureColorSchemeChange,
  onFigurePanelChange,
}: LeftControlPanelProps) {
  const allSelected = foundSrsFiles.length > 0 && selectedFiles.length === foundSrsFiles.length;
  const previewColors = sampleColors(figureSettings.colorScheme || 'None', 8);

  return (
    <aside className="relative flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-white/[0.04] bg-black/40 backdrop-blur-xl">
      <div className="relative z-10 border-b border-white/[0.04] bg-black/15 p-6 backdrop-blur-sm">
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          Multi SRS Studio
        </h2>
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400/80">React workflow console</p>

        <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-300 group">
          <input
            type="checkbox"
            checked={keepRecord}
            onChange={(event) => onKeepRecordChange(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all group-hover:border-white/40"
          />
          <span className="group-hover:text-white transition-colors">Keep Record Persistence</span>
        </label>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 scroll-smooth">
        <section className={`transition-opacity duration-300 ${currentStep !== 1 ? 'opacity-50' : 'opacity-100'}`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-500/30">1</span>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">Data & Settings</h3>
          </div>

          <div className="space-y-4">
            <input
              value={folderInput}
              onChange={(event) => onFolderInputChange(event.target.value)}
              placeholder="Paste local folder path..."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:bg-black/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-black/30"
            />
            <button
              onClick={onApplyFolder}
              disabled={applyFolderPending}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {applyFolderPending ? 'Scanning...' : 'Apply Folder'}
            </button>

            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
              {!foundSrsFiles.length ? (
                <p className="p-2 text-center text-slate-500">No folder applied yet.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2.5 border-b border-white/5 pb-2.5 mb-2 font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => onToggleSelectAll(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
                    />
                    <span>Select All ({foundSrsFiles.length})</span>
                  </label>
                  {foundSrsFiles.map((file) => (
                    <label key={file} className="flex items-center gap-2.5 hover:bg-white/5 rounded-md px-1 py-1 -mx-1 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={(event) => onToggleFile(file, event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
                      />
                      <span className="truncate">{file}</span>
                    </label>
                  ))}
                </>
              )}
            </div>

            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Mode</span>
              <select
                value={mode}
                onChange={(event) => onModeChange(event.target.value as 'fast' | 'realtime')}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-black/30 appearance-none"
              >
                <option value="realtime" className="bg-slate-900">realtime</option>
                <option value="fast" className="bg-slate-900">fast</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-300">
                <span className="mb-1.5 block">Default Start WN</span>
                <input
                  type="number"
                  value={defaultStartWn}
                  onChange={(event) => onDefaultStartWnChange(Number(event.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-black/30"
                />
              </label>
              <label className="block text-xs font-medium text-slate-300">
                <span className="mb-1.5 block">Default End WN</span>
                <input
                  type="number"
                  value={defaultEndWn}
                  onChange={(event) => onDefaultEndWnChange(Number(event.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-black/30"
                />
              </label>
            </div>

            <button
              onClick={onExtractAll}
              disabled={!selectedFiles.length || extractPending}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:to-indigo-500 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {extractPending ? 'Extracting...' : 'Extract Selected'}
            </button>
          </div>
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <div className="mb-5 flex items-center gap-3 border-t border-white/[0.04] pt-8">
             <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white shadow-lg shadow-amber-500/30">2</span>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">Integration</h3>
          </div>

          <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-md">
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Start WN</span>
              <input
                type="number"
                value={integrationRange[0]}
                onChange={(event) =>
                  onIntegrationRangeChange([Number(event.target.value), integrationRange[1]])
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:bg-black/30"
              />
            </label>
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">End WN</span>
              <input
                type="number"
                value={integrationRange[1]}
                onChange={(event) =>
                  onIntegrationRangeChange([integrationRange[0], Number(event.target.value)])
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:bg-black/30"
              />
            </label>
            <label className="block text-xs font-medium text-slate-300">
              <span className="mb-1.5 block">Baseline Mode</span>
              <select
                value={baselineMode}
                onChange={(event) =>
                  onBaselineModeChange(event.target.value as 'none' | 'linear')
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:bg-black/30 appearance-none"
              >
                <option value="none" className="bg-slate-900">None</option>
                <option value="linear" className="bg-slate-900">Linear</option>
              </select>
            </label>
            <button
              onClick={onIntegrate}
              disabled={!extractedFilenames.length}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:to-orange-400 hover:shadow-amber-500/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              Integrate Areas
            </button>
          </div>
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <div className="mb-5 flex items-center gap-3 border-t border-white/[0.04] pt-8">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-xs font-bold text-white shadow-lg shadow-purple-500/30">3</span>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">Kinetics Fitting</h3>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-sm">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 shadow-inner">
              <label className="block text-xs font-medium text-slate-300">
                <span className="mb-1.5 block">Color Scheme</span>
                <select
                  value={figureSettings.colorScheme}
                  onChange={(event) => onFigureColorSchemeChange(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 hover:bg-black/30 appearance-none"
                >
                  {['None', 'viridis', 'magma', 'plasma', 'inferno', 'cividis', 'Greys', 'RdBu', 'RdBu_r', 'Spectral', 'coolwarm'].map((scale) => (
                    <option key={scale} value={scale} className="bg-slate-900">
                      {scale}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex gap-1">
                {previewColors.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-3 flex-1 rounded-full border border-white/10"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            <FigurePanelCard
              title="Overlay Figure"
              panelKey="overlay"
              settings={figureSettings.overlay}
              onChange={onFigurePanelChange}
            />
            <FigurePanelCard
              title="Normalized Figure"
              panelKey="normalized"
              settings={figureSettings.normalized}
              onChange={onFigurePanelChange}
            />

            <div className="space-y-2">
              {extractedFilenames.map((filename) => {
                const range = fitRanges[filename];
                return (
                  <details
                    key={filename}
                    className="rounded-xl border border-white/5 bg-white/5 backdrop-blur-md overflow-hidden transition-all open:bg-white/10 open:border-white/10"
                    onToggle={(event) => {
                      if ((event.currentTarget as HTMLDetailsElement).open) {
                        onSelectKineticsFile(filename);
                      }
                    }}
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{filename}</span>
                        {activeKineticsFile === filename && (
                          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                            Active
                          </span>
                        )}
                      </div>
                    </summary>
                    <div className="grid grid-cols-2 gap-3 border-t border-white/5 bg-black/20 px-4 py-4">
                      <label className="block text-xs font-medium text-slate-300">
                        <span className="mb-1.5 block">Fit Start Time</span>
                        <input
                          type="number"
                          step="any"
                          value={range ? range.start : ''}
                          placeholder="Load kinetics first"
                          onFocus={() => onSelectKineticsFile(filename)}
                          onChange={(event) =>
                            onFitRangeInputChange(filename, 'start', event.target.value)
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 hover:bg-black/50"
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-300">
                        <span className="mb-1.5 block">Fit End Time</span>
                        <input
                          type="number"
                          step="any"
                          value={range ? range.end : ''}
                          placeholder="Load kinetics first"
                          onFocus={() => onSelectKineticsFile(filename)}
                          onChange={(event) =>
                            onFitRangeInputChange(filename, 'end', event.target.value)
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 hover:bg-black/50"
                        />
                      </label>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
