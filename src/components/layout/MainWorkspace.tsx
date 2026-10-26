import { useState } from 'react';
import { KineticsPlot } from '../plots/KineticsPlot';
import { SingleSpectrumPlot } from '../plots/SingleSpectrumPlot';
import { WaterfallPlot } from '../plots/WaterfallPlot';
import { COLOR_SCALE_NAMES, getNearestValueFromAxis } from '../../lib/workflowUtils';
import type { GetDatasetResponse } from '../../types/api';
import type { IntegrationCacheEntry, NumericRange } from '../../types/workflow';

interface MainWorkspaceProps {
  currentStep: number;
  vizStatusMsg: string;
  extractedFilenames: string[];
  activeWaterfallFile: string | null;
  activeKineticsFile: string | null;
  onSelectWaterfallFile: (filename: string) => void;
  onSelectKineticsFile: (filename: string) => void;
  currentDataset: GetDatasetResponse | null;
  currentKineticsDataset: GetDatasetResponse | null;
  currentIntegrationData: IntegrationCacheEntry | null;
  fitRange: NumericRange | null;
  onFitRangeChange: (filename: string, range: NumericRange) => void;
  integrationRange: [number, number];
  waterfallGap: number;
  onWaterfallGapChange: (value: number) => void;
  waterfallMaxLines: number;
  onWaterfallMaxLinesChange: (value: number) => void;
  waterfallTimeRangeInput: string;
  waterfallAppliedTimeRangeInput: string;
  onWaterfallTimeRangeInputChange: (value: string) => void;
  onWaterfallTimeRangeInputFocus: () => void;
  onWaterfallTimeRangeInputCommit: () => void;
  waterfallColorScheme: string;
  onWaterfallColorSchemeChange: (value: string) => void;
  spectralBaselineCorrectionEnabled: boolean;
  spectralBaselineXRange: NumericRange | null;
  subtractBackgroundPending: boolean;
  onSubtractBackground: (filename: string, time: number) => void;
  onVisibleTimeRangeChange: (filename: string, range: NumericRange) => void;
  onIntegrationRangeChange: (range: [number, number], shouldDebounce: boolean) => void;
}

const STAGE_STEPS = [
  { reached: 1, label: 'Extract' },
  { reached: 2, label: 'Integrate' },
  { reached: 3, label: 'Global Fit' },
];

function FileChips({
  filenames,
  activeFile,
  onSelect,
}: {
  filenames: string[];
  activeFile: string | null;
  onSelect: (filename: string) => void;
}) {
  if (!filenames.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Files">
      {filenames.map((filename) => {
        const active = activeFile === filename;
        return (
          <button
            key={filename}
            type="button"
            aria-pressed={active}
            aria-current={active || undefined}
            onClick={() => onSelect(filename)}
            className="file-chip"
          >
            {filename.length > 30 ? '\u2026' + filename.slice(-27) : filename}
          </button>
        );
      })}
    </div>
  );
}

export function MainWorkspace({
  currentStep,
  vizStatusMsg,
  extractedFilenames,
  activeWaterfallFile,
  activeKineticsFile,
  onSelectWaterfallFile,
  onSelectKineticsFile,
  currentDataset,
  currentKineticsDataset,
  currentIntegrationData,
  fitRange,
  onFitRangeChange,
  integrationRange,
  waterfallGap,
  onWaterfallGapChange,
  waterfallMaxLines,
  onWaterfallMaxLinesChange,
  waterfallTimeRangeInput,
  waterfallAppliedTimeRangeInput,
  onWaterfallTimeRangeInputChange,
  onWaterfallTimeRangeInputFocus,
  onWaterfallTimeRangeInputCommit,
  waterfallColorScheme,
  onWaterfallColorSchemeChange,
  spectralBaselineCorrectionEnabled,
  spectralBaselineXRange,
  subtractBackgroundPending,
  onSubtractBackground,
  onVisibleTimeRangeChange,
  onIntegrationRangeChange,
}: MainWorkspaceProps) {
  const [spectrumSelection, setSpectrumSelection] = useState<{
    filename: string;
    time: number;
  } | null>(null);
  const selectedSpectrumTime = currentKineticsDataset?.time.length
    ? getNearestValueFromAxis(
        currentKineticsDataset.time,
        spectrumSelection?.filename === currentKineticsDataset.filename
          ? spectrumSelection.time
          : currentKineticsDataset.time[0],
      )
    : null;
  const handleSelectedSpectrumTimeChange = (time: number) => {
    if (!currentKineticsDataset) return;
    setSpectrumSelection({ filename: currentKineticsDataset.filename, time });
  };

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-rule px-8">
        <div className="flex items-center text-sm">
          {STAGE_STEPS.map((step, index) => {
            const reached = currentStep >= step.reached;
            const current = currentStep === step.reached;
            return (
              <span key={step.label} className={`flex items-center ${index > 0 ? 'border-l border-rule pl-4 ml-4' : ''}`}>
                <span
                  className={`inline-flex items-baseline gap-1.5 border-b-2 pb-1 ${
                    current
                      ? 'border-accent text-ink'
                      : reached
                        ? 'border-rule-2 text-ink-2'
                        : 'border-transparent text-muted'
                  }`}
                >
                  <span className="font-outlier text-xs tabular-nums">{step.reached}.</span>
                  {step.label}
                </span>
              </span>
            );
          })}
        </div>
        <p className="status-line max-w-[30rem] truncate text-right" role="status">{vizStatusMsg}</p>
      </header>

      <div className="flex-1 space-y-10 overflow-y-auto p-8">
        <section>
          <div className="stage-head">
            <h3 className="stage-title">SRS Waterfall</h3>
            <div className="flex flex-wrap items-end gap-4">
              <label className="field">
                <span className="field-label">Gap</span>
                <input
                  type="number"
                  value={waterfallGap}
                  step="any"
                  onChange={(event) => onWaterfallGapChange(Number(event.target.value))}
                  className="input input--num w-20"
                />
              </label>
              <label className="field">
                <span className="field-label">Max Lines</span>
                <input
                  type="number"
                  value={waterfallMaxLines}
                  min={1}
                  max={200}
                  onChange={(event) => onWaterfallMaxLinesChange(Number(event.target.value))}
                  className="input input--num w-16"
                />
              </label>
              <label className="field">
                <span className="field-label">Time Range</span>
                <input
                  value={waterfallTimeRangeInput}
                  onChange={(event) => onWaterfallTimeRangeInputChange(event.target.value)}
                  onFocus={onWaterfallTimeRangeInputFocus}
                  onBlur={onWaterfallTimeRangeInputCommit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="1,5"
                  className="input input--num w-28"
                />
              </label>
              <label className="field">
                <span className="field-label">Color</span>
                <span className="select-wrap">
                  <select
                    value={waterfallColorScheme}
                    onChange={(event) => onWaterfallColorSchemeChange(event.target.value)}
                    aria-label="Waterfall color scheme"
                    className="select w-32"
                  >
                    {COLOR_SCALE_NAMES.map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </select>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="select-chevron h-4 w-4"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                </span>
              </label>
            </div>
          </div>

          <FileChips
            filenames={extractedFilenames}
            activeFile={activeWaterfallFile}
            onSelect={onSelectWaterfallFile}
          />

          <div className="sheet h-[420px] p-2">
            <WaterfallPlot
              dataset={currentDataset}
              integrationRange={integrationRange}
              gap={waterfallGap}
              maxLines={waterfallMaxLines}
              timeRangeInput={waterfallAppliedTimeRangeInput}
              colorScheme={waterfallColorScheme}
              baselineCorrectionEnabled={spectralBaselineCorrectionEnabled}
              baselineXRange={spectralBaselineXRange}
              onVisibleTimeRangeChange={onVisibleTimeRangeChange}
              onIntegrationRangeChange={onIntegrationRangeChange}
            />
          </div>
        </section>

        <section>
          <div className="stage-head">
            <h3 className="stage-title">Area-Time Kinetics</h3>
          </div>

          <FileChips
            filenames={extractedFilenames}
            activeFile={activeKineticsFile}
            onSelect={onSelectKineticsFile}
          />

          <div className="sheet h-[380px] p-2">
            <KineticsPlot
              filename={activeKineticsFile}
              integrationData={currentIntegrationData}
              fitRange={fitRange}
              onFitRangeChange={onFitRangeChange}
              selectedSpectrumTime={selectedSpectrumTime}
              onSelectedSpectrumTimeChange={handleSelectedSpectrumTimeChange}
            />
          </div>
        </section>

        <section>
          <div className="stage-head">
            <h3 className="stage-title">Single Spectrum</h3>
            <div className="flex flex-col items-end gap-2">
              {selectedSpectrumTime !== null && (
                <span className="status-chip">t = {selectedSpectrumTime.toFixed(4)}</span>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={subtractBackgroundPending}
                  disabled={
                    subtractBackgroundPending ||
                    !currentKineticsDataset ||
                    selectedSpectrumTime === null
                  }
                  onChange={(event) => {
                    if (
                      event.target.checked &&
                      currentKineticsDataset &&
                      selectedSpectrumTime !== null
                    ) {
                      onSubtractBackground(
                        currentKineticsDataset.filename,
                        selectedSpectrumTime,
                      );
                    }
                  }}
                  className="checkbox"
                />
                <span>{subtractBackgroundPending ? 'Subtracting…' : 'Subtract Background'}</span>
              </label>
            </div>
          </div>

          <div className="sheet h-[380px] p-2">
            <SingleSpectrumPlot
              dataset={currentKineticsDataset}
              selectedTime={selectedSpectrumTime}
              baselineCorrectionEnabled={spectralBaselineCorrectionEnabled}
              baselineXRange={spectralBaselineXRange}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
