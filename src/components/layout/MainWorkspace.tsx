import { KineticsPlot } from '../plots/KineticsPlot';
import { WaterfallPlot } from '../plots/WaterfallPlot';
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
  currentIntegrationData: IntegrationCacheEntry | null;
  fitRange: NumericRange | null;
  onFitRangeChange: (filename: string, range: NumericRange) => void;
  integrationRange: [number, number];
  waterfallGap: number;
  onWaterfallGapChange: (value: number) => void;
  waterfallMaxLines: number;
  onWaterfallMaxLinesChange: (value: number) => void;
  waterfallTimeRangeInput: string;
  onWaterfallTimeRangeInputChange: (value: string) => void;
  waterfallColorScheme: string;
  onWaterfallColorSchemeChange: (value: string) => void;
  onVisibleTimeRangeChange: (filename: string, range: NumericRange) => void;
  onIntegrationRangeChange: (range: [number, number], shouldDebounce: boolean) => void;
}

function FilePills({
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
    <div className="mb-3 flex flex-wrap gap-2">
      {filenames.map((filename) => {
        const active = activeFile === filename;
        return (
          <button
            key={filename}
            onClick={() => onSelect(filename)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-100'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
            }`}
          >
            {filename.length > 30 ? `…${filename.slice(-27)}` : filename}
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
  currentIntegrationData,
  fitRange,
  onFitRangeChange,
  integrationRange,
  waterfallGap,
  onWaterfallGapChange,
  waterfallMaxLines,
  onWaterfallMaxLinesChange,
  waterfallTimeRangeInput,
  onWaterfallTimeRangeInputChange,
  waterfallColorScheme,
  onWaterfallColorSchemeChange,
  onVisibleTimeRangeChange,
  onIntegrationRangeChange,
}: MainWorkspaceProps) {
  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-950">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className={`rounded px-2 py-1 ${currentStep >= 1 ? 'bg-blue-900 text-blue-100 font-medium' : 'text-slate-400'}`}>1. Extract</span>
          <span className="text-slate-600">→</span>
          <span className={`rounded px-2 py-1 ${currentStep >= 2 ? 'bg-amber-900 text-amber-100 font-medium' : 'text-slate-400'}`}>2. Integrate</span>
          <span className="text-slate-600">→</span>
          <span className={`rounded px-2 py-1 ${currentStep >= 3 ? 'bg-purple-900 text-purple-100 font-medium' : 'text-slate-400'}`}>3. Global Fit</span>
        </div>
        <p className="max-w-[30rem] truncate text-xs text-slate-400">{vizStatusMsg}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-600">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-300">SRS Waterfall</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                <span>Gap</span>
                <input
                  type="number"
                  value={waterfallGap}
                  step="any"
                  onChange={(event) => onWaterfallGapChange(Number(event.target.value))}
                  className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Max Lines</span>
                <input
                  type="number"
                  value={waterfallMaxLines}
                  min={1}
                  max={200}
                  onChange={(event) => onWaterfallMaxLinesChange(Number(event.target.value))}
                  className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Time Range</span>
                <input
                  value={waterfallTimeRangeInput}
                  onChange={(event) => onWaterfallTimeRangeInputChange(event.target.value)}
                  placeholder="1,5"
                  className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Color</span>
                <select
                  value={waterfallColorScheme}
                  onChange={(event) => onWaterfallColorSchemeChange(event.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                >
                  {['None', 'viridis', 'magma', 'plasma', 'inferno', 'cividis', 'Greys', 'RdBu', 'RdBu_r', 'Spectral', 'coolwarm'].map((scale) => (
                    <option key={scale} value={scale}>
                      {scale}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <FilePills
            filenames={extractedFilenames}
            activeFile={activeWaterfallFile}
            onSelect={onSelectWaterfallFile}
          />

          <div className="h-[400px]">
            <WaterfallPlot
              dataset={currentDataset}
              integrationRange={integrationRange}
              gap={waterfallGap}
              maxLines={waterfallMaxLines}
              timeRangeInput={waterfallTimeRangeInput}
              colorScheme={waterfallColorScheme}
              onVisibleTimeRangeChange={onVisibleTimeRangeChange}
              onIntegrationRangeChange={onIntegrationRangeChange}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-600">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-300">Area-Time Kinetics</h3>
          </div>

          <FilePills
            filenames={extractedFilenames}
            activeFile={activeKineticsFile}
            onSelect={onSelectKineticsFile}
          />

          <div className="h-[360px]">
            <KineticsPlot
              filename={activeKineticsFile}
              integrationData={currentIntegrationData}
              fitRange={fitRange}
              onFitRangeChange={onFitRangeChange}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
