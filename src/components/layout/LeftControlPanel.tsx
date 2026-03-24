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
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/40 p-3">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="space-y-3">
        <label className="block text-xs text-slate-400">
          <span className="mb-1 block">X Axis Title</span>
          <input
            value={settings.xlabel}
            onChange={(event) => onChange(panelKey, 'xlabel', event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="block text-xs text-slate-400">
          <span className="mb-1 block">Y Axis Title</span>
          <input
            value={settings.ylabel}
            onChange={(event) => onChange(panelKey, 'ylabel', event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="block text-xs text-slate-400">
          <span className="mb-1 block">X Axis Range</span>
          <input
            value={settings.xRangeInput}
            onChange={(event) => onChange(panelKey, 'xRangeInput', event.target.value)}
            placeholder="e.g. 0,160"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="block text-xs text-slate-400">
          <span className="mb-1 block">Y Axis Range</span>
          <input
            value={settings.yRangeInput}
            onChange={(event) => onChange(panelKey, 'yRangeInput', event.target.value)}
            placeholder="e.g. 0,1.1"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={settings.showLabels}
            onChange={(event) => onChange(panelKey, 'showLabels', event.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          <span>Show Curve Labels</span>
        </label>
        <label className="block text-xs text-slate-400">
          <span className="mb-1 block">Label Offset (%)</span>
          <input
            value={settings.labelOffsetInput}
            onChange={(event) => onChange(panelKey, 'labelOffsetInput', event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </label>
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
    <aside className="h-full w-[24rem] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900 shadow-xl">
      <div className="border-b border-slate-800 p-5">
        <h2 className="mb-1 text-xl font-bold tracking-tight text-white">
          Multi SRS <span className="text-blue-500">Studio</span>
        </h2>
        <p className="text-xs font-medium text-slate-400">React workflow console</p>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={keepRecord}
            onChange={(event) => onKeepRecordChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800"
          />
          <span>Keep Record Persistence</span>
        </label>
      </div>

      <div className="space-y-8 p-5">
        <section className={currentStep !== 1 ? 'opacity-70' : ''}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900/50 text-xs font-bold text-blue-400">1</span>
            <h3 className="text-sm font-semibold text-slate-100">Data & Settings</h3>
          </div>

          <div className="space-y-3">
            <input
              value={folderInput}
              onChange={(event) => onFolderInputChange(event.target.value)}
              placeholder="Paste local folder path..."
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
            <button
              onClick={onApplyFolder}
              disabled={applyFolderPending}
              className="w-full rounded-md border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {applyFolderPending ? 'Scanning...' : 'Apply Folder'}
            </button>

            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
              {!foundSrsFiles.length ? (
                <p>No folder applied yet.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 border-b border-slate-800 pb-2 font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => onToggleSelectAll(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                    />
                    <span>Select All ({foundSrsFiles.length})</span>
                  </label>
                  {foundSrsFiles.map((file) => (
                    <label key={file} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={(event) => onToggleFile(file, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                      <span className="truncate">{file}</span>
                    </label>
                  ))}
                </>
              )}
            </div>

            <label className="block text-xs text-slate-400">
              <span className="mb-1 block">Mode</span>
              <select
                value={mode}
                onChange={(event) => onModeChange(event.target.value as 'fast' | 'realtime')}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <option value="realtime">realtime</option>
                <option value="fast">fast</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-400">
                <span className="mb-1 block">Default Start WN</span>
                <input
                  type="number"
                  value={defaultStartWn}
                  onChange={(event) => onDefaultStartWnChange(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="block text-xs text-slate-400">
                <span className="mb-1 block">Default End WN</span>
                <input
                  type="number"
                  value={defaultEndWn}
                  onChange={(event) => onDefaultEndWnChange(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                />
              </label>
            </div>

            <button
              onClick={onExtractAll}
              disabled={!selectedFiles.length || extractPending}
              className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {extractPending ? 'Extracting...' : 'Extract Selected'}
            </button>
          </div>
        </section>

        <section className={currentStep < 2 ? 'opacity-50' : ''}>
          <div className="mb-4 flex items-center gap-2 border-t border-slate-800 pt-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-900/50 text-xs font-bold text-amber-400">2</span>
            <h3 className="text-sm font-semibold text-slate-100">Integration</h3>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800/50 bg-slate-800/20 p-4">
            <label className="block text-xs text-slate-400">
              <span className="mb-1 block">Start WN</span>
              <input
                type="number"
                value={integrationRange[0]}
                onChange={(event) =>
                  onIntegrationRangeChange([Number(event.target.value), integrationRange[1]])
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="block text-xs text-slate-400">
              <span className="mb-1 block">End WN</span>
              <input
                type="number"
                value={integrationRange[1]}
                onChange={(event) =>
                  onIntegrationRangeChange([integrationRange[0], Number(event.target.value)])
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="block text-xs text-slate-400">
              <span className="mb-1 block">Baseline Mode</span>
              <select
                value={baselineMode}
                onChange={(event) =>
                  onBaselineModeChange(event.target.value as 'none' | 'linear')
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <option value="none">None</option>
                <option value="linear">Linear</option>
              </select>
            </label>
            <button
              onClick={onIntegrate}
              disabled={!extractedFilenames.length}
              className="w-full rounded-md border border-slate-700 bg-slate-800 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Integrate Areas
            </button>
          </div>
        </section>

        <section className={currentStep < 2 ? 'opacity-50' : ''}>
          <div className="mb-4 flex items-center gap-2 border-t border-slate-800 pt-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-900/50 text-xs font-bold text-purple-400">3</span>
            <h3 className="text-sm font-semibold text-slate-100">Kinetics Fitting</h3>
          </div>

          <div className="space-y-4 rounded-lg border border-slate-800/50 bg-slate-800/20 p-4">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/40 p-3">
              <label className="block text-xs text-slate-400">
                <span className="mb-1 block">Color Scheme</span>
                <select
                  value={figureSettings.colorScheme}
                  onChange={(event) => onFigureColorSchemeChange(event.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                >
                  {['None', 'viridis', 'magma', 'plasma', 'inferno', 'cividis', 'Greys', 'RdBu', 'RdBu_r', 'Spectral', 'coolwarm'].map((scale) => (
                    <option key={scale} value={scale}>
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
                    className="rounded-lg border border-slate-700/80 bg-slate-950/40"
                    onToggle={(event) => {
                      if ((event.currentTarget as HTMLDetailsElement).open) {
                        onSelectKineticsFile(filename);
                      }
                    }}
                  >
                    <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{filename}</span>
                        {activeKineticsFile === filename && (
                          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-purple-300">
                            Active
                          </span>
                        )}
                      </div>
                    </summary>
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-3 py-3">
                      <label className="block text-xs text-slate-400">
                        <span className="mb-1 block">Fit Start Time</span>
                        <input
                          type="number"
                          step="any"
                          value={range ? range.start : ''}
                          placeholder="Load kinetics first"
                          onFocus={() => onSelectKineticsFile(filename)}
                          onChange={(event) =>
                            onFitRangeInputChange(filename, 'start', event.target.value)
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                        />
                      </label>
                      <label className="block text-xs text-slate-400">
                        <span className="mb-1 block">Fit End Time</span>
                        <input
                          type="number"
                          step="any"
                          value={range ? range.end : ''}
                          placeholder="Load kinetics first"
                          onFocus={() => onSelectKineticsFile(filename)}
                          onChange={(event) =>
                            onFitRangeInputChange(filename, 'end', event.target.value)
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
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
