import { useState } from 'react';
import { sampleColors } from '../../lib/workflowUtils';
import type {
  FigurePanelSettings,
  FigureSettingsState,
  FitRangeMap,
  GlobalImageSettings,
  SpectralFigureSettings,
} from '../../types/workflow';
import {
  FigurePanelCard,
  GlobalImageSettingsCard,
  ManualFitColorPicker,
  SpectralFigureCard,
} from './LeftControlPanelCards';

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
  cropStartWnInput: string;
  onCropStartWnInputChange: (value: string) => void;
  cropEndWnInput: string;
  onCropEndWnInputChange: (value: string) => void;
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
  manualFitColorGrid: string[];
  fitFileColors: string[];
  onManualFitColorChange: (filename: string, color: string) => void;
  onFigurePanelChange: (
    panel: 'overlay' | 'normalized',
    key: keyof FigurePanelSettings,
    value: string | boolean,
  ) => void;
  onGlobalImageSettingChange: (key: keyof GlobalImageSettings, value: number | boolean) => void;
  onSpectralFigureChange: (key: keyof SpectralFigureSettings, value: string) => void;
  onRenderSpectralFigure: () => void;
  spectralFigurePending: boolean;
  spectralFigureStatus: string;
}

type SectionKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

function SectionToggle({
  step,
  title,
  open,
  badgeClassName,
  withDivider = true,
  onClick,
}: {
  step: number;
  title: string;
  open: boolean;
  badgeClassName: string;
  withDivider?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-5 flex w-full items-center justify-between gap-3 text-left ${
        withDivider ? 'border-t border-white/[0.04] pt-8' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-lg ${badgeClassName}`}>
          {step}
        </span>
        <h3 className="text-sm font-semibold tracking-wide text-white/90">{title}</h3>
      </div>
      <span
        aria-hidden="true"
        className={`rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-400 transition-transform ${
          open ? 'rotate-0' : '-rotate-90'
        }`}
      >
        v
      </span>
    </button>
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
  cropStartWnInput,
  onCropStartWnInputChange,
  cropEndWnInput,
  onCropEndWnInputChange,
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
  manualFitColorGrid,
  fitFileColors,
  onManualFitColorChange,
  onFigurePanelChange,
  onGlobalImageSettingChange,
  onSpectralFigureChange,
  onRenderSpectralFigure,
  spectralFigurePending,
  spectralFigureStatus,
}: LeftControlPanelProps) {
  const allSelected = foundSrsFiles.length > 0 && selectedFiles.length === foundSrsFiles.length;
  const previewColors = sampleColors(figureSettings.colorScheme || 'None', 8);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  const toggleSection = (key: SectionKey, disabled = false) => {
    if (disabled) return;
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
          <SectionToggle
            step={1}
            title="Data & Settings"
            open={openSections.step1}
            badgeClassName="from-blue-500 to-indigo-600 shadow-blue-500/30"
            withDivider={false}
            onClick={() => toggleSection('step1')}
          />

          {openSections.step1 && (
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
                    <label className="mb-2 flex items-center gap-2.5 border-b border-white/5 pb-2.5 font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) => onToggleSelectAll(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 transition-all"
                      />
                      <span>Select All ({foundSrsFiles.length})</span>
                    </label>
                    {foundSrsFiles.map((file) => (
                      <label key={file} className="mx-[-0.25rem] flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-white/5">
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

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-slate-300">
                  <span className="mb-1.5 block">Crop Start WN</span>
                  <input
                    type="number"
                    value={cropStartWnInput}
                    onChange={(event) => onCropStartWnInputChange(event.target.value)}
                    placeholder="optional"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-black/30"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-300">
                  <span className="mb-1.5 block">Crop End WN</span>
                  <input
                    type="number"
                    value={cropEndWnInput}
                    onChange={(event) => onCropEndWnInputChange(event.target.value)}
                    placeholder="optional"
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
          )}
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40' : 'opacity-100'}`}>
          <SectionToggle
            step={2}
            title="Integration"
            open={openSections.step2}
            badgeClassName="from-amber-500 to-orange-600 shadow-amber-500/30"
            onClick={() => toggleSection('step2', currentStep < 2)}
          />

          {openSections.step2 && (
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
          )}
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40' : 'opacity-100'}`}>
          <SectionToggle
            step={3}
            title="Kinetics Fitting"
            open={openSections.step3}
            badgeClassName="from-purple-500 to-fuchsia-600 shadow-purple-500/30"
            onClick={() => toggleSection('step3', currentStep < 2)}
          />

          {openSections.step3 && (
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
                <ManualFitColorPicker
                  colors={manualFitColorGrid}
                  filenames={extractedFilenames}
                  selectedColors={fitFileColors}
                  onChange={onManualFitColorChange}
                />
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
                      className="overflow-hidden rounded-xl border border-white/5 bg-white/5 backdrop-blur-md transition-all open:border-white/10 open:bg-white/10"
                      onToggle={(event) => {
                        if ((event.currentTarget as HTMLDetailsElement).open) {
                          onSelectKineticsFile(filename);
                        }
                      }}
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5">
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
          )}
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40' : 'opacity-100'}`}>
          <SectionToggle
            step={4}
            title="Spectral Figure"
            open={openSections.step4}
            badgeClassName="from-emerald-500 to-teal-600 shadow-emerald-500/30"
            onClick={() => toggleSection('step4', currentStep < 2)}
          />

          {openSections.step4 && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-sm">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] font-medium text-slate-400">
                Uses the current waterfall file, gap, max lines, visible time range, and color scheme from the central interactive plot.
              </div>

              <SpectralFigureCard
                settings={figureSettings.spectral}
                onChange={onSpectralFigureChange}
              />

              <div className="space-y-2">
                <button
                  onClick={onRenderSpectralFigure}
                  disabled={spectralFigurePending || !extractedFilenames.length}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:to-teal-500 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  {spectralFigurePending ? 'Rendering...' : 'Render Spectral Figure'}
                </button>
                <p className="text-[11px] font-medium text-slate-500">{spectralFigureStatus}</p>
              </div>
            </div>
          )}
        </section>

        <section className={`transition-opacity duration-300 ${currentStep < 2 ? 'opacity-40' : 'opacity-100'}`}>
          <SectionToggle
            step={5}
            title="Image Parameters"
            open={openSections.step5}
            badgeClassName="from-sky-500 to-cyan-600 shadow-sky-500/30"
            onClick={() => toggleSection('step5', currentStep < 2)}
          />

          {openSections.step5 && (
            <GlobalImageSettingsCard
              settings={figureSettings.global}
              onChange={onGlobalImageSettingChange}
            />
          )}
        </section>
      </div>
    </aside>
  );
}
