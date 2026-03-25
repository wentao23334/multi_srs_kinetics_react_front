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
    <div className="mb-4 flex flex-wrap gap-2.5">
      {filenames.map((filename) => {
        const active = activeFile === filename;
        return (
          <button
            key={filename}
            onClick={() => onSelect(filename)}
            className={`relative overflow-hidden rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
              active
                ? 'border-blue-400/50 bg-blue-500/20 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {active && (
              <span className="absolute inset-0 block rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
            )}
            <span className="relative z-10">{filename.length > 30 ? `…${filename.slice(-27)}` : filename}</span>
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
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-transparent">
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.04] bg-black/15 px-8 backdrop-blur-md">
        <div className="flex items-center gap-3 text-xs font-semibold tracking-wide">
          <span className={`rounded-full px-3 py-1.5 transition-all duration-500 ${currentStep >= 1 ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
            1. Extract
          </span>
          <span className="text-slate-600/50">―</span>
          <span className={`rounded-full px-3 py-1.5 transition-all duration-500 ${currentStep >= 2 ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
            2. Integrate
          </span>
          <span className="text-slate-600/50">―</span>
          <span className={`rounded-full px-3 py-1.5 transition-all duration-500 ${currentStep >= 3 ? 'bg-gradient-to-r from-purple-500/20 to-fuchsia-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
            3. Global Fit
          </span>
        </div>
        <p className="max-w-[30rem] truncate text-xs font-medium text-slate-400 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{vizStatusMsg}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-8 scroll-smooth">
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.05] hover:border-white/[0.10]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white/90">SRS Waterfall</h3>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <label className="flex items-center gap-2">
                <span>Gap</span>
                <input
                  type="number"
                  value={waterfallGap}
                  step="any"
                  onChange={(event) => onWaterfallGapChange(Number(event.target.value))}
                  className="w-20 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/40"
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
                  className="w-16 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/40"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Time Range</span>
                <input
                  value={waterfallTimeRangeInput}
                  onChange={(event) => onWaterfallTimeRangeInputChange(event.target.value)}
                  placeholder="1,5"
                  className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/40"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Color</span>
                <select
                  value={waterfallColorScheme}
                  onChange={(event) => onWaterfallColorSchemeChange(event.target.value)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/40 appearance-none pointer-events-auto"
                >
                  {['None', 'viridis', 'magma', 'plasma', 'inferno', 'cividis', 'Greys', 'RdBu', 'RdBu_r', 'Spectral', 'coolwarm'].map((scale) => (
                    <option key={scale} value={scale} className="bg-slate-900">
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

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.05] hover:border-white/[0.10]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white/90">Area-Time Kinetics</h3>
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
