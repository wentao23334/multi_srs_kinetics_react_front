import { useState, type ChangeEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLOR_SCALE_NAMES, sampleColors } from '../../lib/workflowUtils';
import type {
  FigurePanelSettings,
  FigureSettingsState,
  FitRangeMap,
  GlobalImageSettings,
  NumericRange,
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
  onSpectralFigureChange: <Key extends keyof SpectralFigureSettings>(
    key: Key,
    value: SpectralFigureSettings[Key],
  ) => void;
  spectralOverlapTimeRange: NumericRange | null;
  spectralOverlapScaleInputDefault: string;
  onExportSvgFigures: () => void;
  exportSvgPending: boolean;
  onRenderSpectralFigure: () => void;
  spectralFigurePending: boolean;
  spectralFigureStatus: string;
}

type SectionKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

function SectionToggle({
  step,
  title,
  open,
  current,
  withDivider = true,
  onClick,
}: {
  step: number;
  title: string;
  open: boolean;
  current: boolean;
  withDivider?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-current={current ? 'step' : undefined}
      className={`step-toggle ${withDivider ? 'border-t border-rule' : ''} mb-4`}
    >
      <span className="flex items-baseline gap-3">
        <span className="step-idx">{step}</span>
        <span className="step-name" role="heading" aria-level={3}>{title}</span>
      </span>
      <ChevronDown aria-hidden="true" className={`step-chevron h-4 w-4 shrink-0`} />
    </button>
  );
}

function SelectWrap({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <span className="select-wrap">
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="select-chevron h-4 w-4" />
    </span>
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
  spectralOverlapTimeRange,
  spectralOverlapScaleInputDefault,
  onExportSvgFigures,
  exportSvgPending,
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
    <aside className="flex h-full w-full min-w-0 flex-col border-r border-rule bg-paper-2">
      <div className="border-b-2 border-rule-2 p-6 pb-5">
        <h2 className="font-display text-xl font-semibold tracking-display text-ink">
          Multi SRS Studio
        </h2>

        <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={keepRecord}
            onChange={(event) => onKeepRecordChange(event.target.checked)}
            className="checkbox"
          />
          <span>Keep Record Persistence</span>
        </label>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <section
          className="step-section"
          data-locked={currentStep !== 1 ? 'true' : 'false'}
        >
          <SectionToggle
            step={1}
            title="Data & Settings"
            open={openSections.step1}
            current={currentStep === 1}
            withDivider={false}
            onClick={() => toggleSection('step1')}
          />

          {openSections.step1 && (
            <div className="space-y-4">
              <input
                value={folderInput}
                onChange={(event) => onFolderInputChange(event.target.value)}
                placeholder="Paste a local folder path"
                aria-label="Folder path"
                className="input"
              />
              <button
                type="button"
                onClick={onApplyFolder}
                disabled={applyFolderPending}
                aria-busy={applyFolderPending}
                className="btn w-full"
              >
                {applyFolderPending ? 'Scanning...' : 'Apply Folder'}
              </button>

              <div className="max-h-48 overflow-y-auto border border-rule bg-sheet p-3">
                {!foundSrsFiles.length ? (
                  <p className="plate-empty">No folder applied yet. Paste a path above and apply it to list its files.</p>
                ) : (
                  <>
                    <label className="mb-2 flex items-center gap-2.5 border-b-2 border-rule-2 pb-2.5 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) => onToggleSelectAll(event.target.checked)}
                        className="checkbox"
                      />
                      <span>Select all ({foundSrsFiles.length})</span>
                    </label>
                    {foundSrsFiles.map((file) => (
                      <label key={file} className="file-row cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file)}
                          onChange={(event) => onToggleFile(file, event.target.checked)}
                          className="checkbox shrink-0"
                        />
                        <span className="file-name truncate">{file}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>

              <label className="field">
                <span className="field-label">Mode</span>
                <SelectWrap
                  value={mode}
                  onChange={(event) => onModeChange(event.target.value as 'fast' | 'realtime')}
                  ariaLabel="Mode"
                  options={[
                    { value: 'realtime', label: 'realtime' },
                    { value: 'fast', label: 'fast' },
                  ]}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  <span className="field-label">Default Start WN</span>
                  <input
                    type="number"
                    value={defaultStartWn}
                    onChange={(event) => onDefaultStartWnChange(Number(event.target.value))}
                    className="input input--num"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Default End WN</span>
                  <input
                    type="number"
                    value={defaultEndWn}
                    onChange={(event) => onDefaultEndWnChange(Number(event.target.value))}
                    className="input input--num"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  <span className="field-label">Crop Start WN</span>
                  <input
                    type="number"
                    value={cropStartWnInput}
                    onChange={(event) => onCropStartWnInputChange(event.target.value)}
                    placeholder="optional"
                    className="input input--num"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Crop End WN</span>
                  <input
                    type="number"
                    value={cropEndWnInput}
                    onChange={(event) => onCropEndWnInputChange(event.target.value)}
                    placeholder="optional"
                    className="input input--num"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={onExtractAll}
                disabled={!selectedFiles.length || extractPending}
                aria-busy={extractPending}
                className="btn btn--primary mt-2 w-full"
              >
                {extractPending ? 'Extracting...' : 'Extract Selected'}
              </button>
            </div>
          )}
        </section>

        <section
          className="step-section"
          data-locked={currentStep < 2 ? 'true' : 'false'}
        >
          <SectionToggle
            step={2}
            title="Integration"
            open={openSections.step2}
            current={currentStep === 2}
            onClick={() => toggleSection('step2', currentStep < 2)}
          />

          {openSections.step2 && (
            <div className="space-y-4 border-t-2 border-rule-2 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  <span className="field-label">Start WN</span>
                  <input
                    type="number"
                    value={integrationRange[0]}
                    onChange={(event) =>
                      onIntegrationRangeChange([Number(event.target.value), integrationRange[1]])
                    }
                    className="input input--num"
                  />
                </label>
                <label className="field">
                  <span className="field-label">End WN</span>
                  <input
                    type="number"
                    value={integrationRange[1]}
                    onChange={(event) =>
                      onIntegrationRangeChange([integrationRange[0], Number(event.target.value)])
                    }
                    className="input input--num"
                  />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Baseline mode</span>
                <SelectWrap
                  value={baselineMode}
                  onChange={(event) => onBaselineModeChange(event.target.value as 'none' | 'linear') }
                  ariaLabel="Baseline mode"
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'linear', label: 'Linear' },
                  ]}
                />
              </label>
              <button
                type="button"
                onClick={onIntegrate}
                disabled={!extractedFilenames.length}
                className="btn mt-2 w-full"
              >
                Integrate Areas
              </button>
            </div>
          )}
        </section>

        <section
          className="step-section"
          data-locked={currentStep < 2 ? 'true' : 'false'}
        >
          <SectionToggle
            step={3}
            title="Kinetics Fitting"
            open={openSections.step3}
            current={currentStep === 3}
            onClick={() => toggleSection('step3', currentStep < 2)}
          />

          {openSections.step3 && (
            <div className="space-y-4 border-t-2 border-rule-2 pt-4">
              <div className="border border-rule p-3">
                <label className="field">
                  <span className="field-label">Color Scheme</span>
                  <SelectWrap
                    value={figureSettings.colorScheme}
                    onChange={(event) => onFigureColorSchemeChange(event.target.value)}
                    ariaLabel="Color scheme"
                    options={COLOR_SCALE_NAMES.map((scale) => ({ value: scale, label: scale }))}
                  />
                </label>
                <div className="mt-3 flex gap-1" aria-hidden="true">
                  {previewColors.map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="h-3 flex-1"
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
                      className="border-t border-rule first:border-t-0"
                      onToggle={(event) => {
                        if ((event.currentTarget as HTMLDetailsElement).open) {
                          onSelectKineticsFile(filename);
                        }
                      }}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 pr-1 text-sm text-ink-2 transition-colors hover:text-ink">
                        <span className="file-name truncate font-medium">{filename}</span>
                        {activeKineticsFile === filename && (
                          <span className="shrink-0 font-outlier text-xs text-accent">active</span>
                        )}
                      </summary>
                      <div className="grid grid-cols-2 gap-3 border-t border-rule bg-paper pb-4 pt-4">
                        <label className="field">
                          <span className="field-label">Fit Start Time</span>
                          <input
                            type="number"
                            step="any"
                            value={range ? range.start : ''}
                            placeholder="Load kinetics first"
                            onFocus={() => onSelectKineticsFile(filename)}
                            onChange={(event) =>
                              onFitRangeInputChange(filename, 'start', event.target.value)
                            }
                            className="input input--num"
                          />
                        </label>
                        <label className="field">
                          <span className="field-label">Fit End Time</span>
                          <input
                            type="number"
                            step="any"
                            value={range ? range.end : ''}
                            placeholder="Load kinetics first"
                            onFocus={() => onSelectKineticsFile(filename)}
                            onChange={(event) =>
                              onFitRangeInputChange(filename, 'end', event.target.value)
                            }
                            className="input input--num"
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

        <section
          className="step-section"
          data-locked={currentStep < 2 ? 'true' : 'false'}
        >
          <SectionToggle
            step={4}
            title="Spectral Figure"
            open={openSections.step4}
            current={currentStep === 4}
            onClick={() => toggleSection('step4', currentStep < 2)}
          />

          {openSections.step4 && (
            <div className="space-y-4 border-t-2 border-rule-2 pt-4">
              <p className="border-t border-rule-2 pt-3 text-xs leading-relaxed text-muted">
                Uses the current waterfall file, gap, max lines, visible time range, and color
                scheme from the central plot.
              </p>

              <SpectralFigureCard
                settings={figureSettings.spectral}
                onChange={onSpectralFigureChange}
                overlapTimeRange={spectralOverlapTimeRange}
                overlapScaleInputDefault={spectralOverlapScaleInputDefault}
              />

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onRenderSpectralFigure}
                  disabled={spectralFigurePending || !extractedFilenames.length}
                  aria-busy={spectralFigurePending}
                  className="btn w-full"
                >
                  {spectralFigurePending ? 'Rendering...' : 'Render Spectral Figure'}
                </button>
                <p className="status-line">{spectralFigureStatus}</p>
              </div>
            </div>
          )}
        </section>

        <section
          className="step-section"
          data-locked={currentStep < 2 ? 'true' : 'false'}
        >
          <SectionToggle
            step={5}
            title="Image Parameters"
            open={openSections.step5}
            current={currentStep === 5}
            onClick={() => toggleSection('step5', currentStep < 2)}
          />

          {openSections.step5 && (
            <GlobalImageSettingsCard
              settings={figureSettings.global}
              onChange={onGlobalImageSettingChange}
              onExportSvgFigures={onExportSvgFigures}
              exportSvgPending={exportSvgPending}
            />
          )}
        </section>
      </div>
    </aside>
  );
}
