import { formatNumber, isFitError } from '../../lib/workflowUtils';
import type { FitResultMap } from '../../types/workflow';

interface RightPreviewPanelProps {
  fitSummaryMsg: string;
  fitStatusBadge: string;
  fitResultCount: string;
  fitNormalizedMeta: string;
  fitFigureUrls: {
    overlay: string;
    normalized: string;
  };
  fitResults: FitResultMap;
  extractedFilenames: string[];
  getFileColor: (filename: string) => string;
  onRunAllFits: () => void;
  runFitsPending: boolean;
}

export function RightPreviewPanel({
  fitSummaryMsg,
  fitStatusBadge,
  fitResultCount,
  fitNormalizedMeta,
  fitFigureUrls,
  fitResults,
  extractedFilenames,
  getFileColor,
  onRunAllFits,
  runFitsPending,
}: RightPreviewPanelProps) {
  return (
    <aside className="relative flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-white/[0.04] bg-black/40 backdrop-blur-xl">
      <header className="relative z-10 border-b border-white/[0.04] bg-black/15 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fitting Results</p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400">
              Global Fit Review
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-400/80">{fitSummaryMsg}</p>
          </div>
          <button
            onClick={onRunAllFits}
            disabled={!extractedFilenames.length || runFitsPending}
            className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {runFitsPending ? 'Running…' : 'Run All Fits'}
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between text-xs font-medium">
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-slate-300 shadow-inner">
            {fitStatusBadge}
          </span>
          <span className="text-slate-400">{fitResultCount}</span>
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-500">{fitNormalizedMeta}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 scroll-smooth">
        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Peak Area-Time Overlay</h4>
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-black/35 shadow-inner">
            {fitFigureUrls.overlay ? (
              <img
                src={fitFigureUrls.overlay}
                alt="Peak Area-Time Overlay"
                className="h-full w-full object-contain mix-blend-screen"
              />
            ) : (
              <div className="px-6 text-center text-xs font-medium text-slate-500">
                Run fitting to generate result images.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cropped Normalized</h4>
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-black/35 shadow-inner">
            {fitFigureUrls.normalized ? (
              <img
                src={fitFigureUrls.normalized}
                alt="Cropped Normalized Fits"
                className="h-full w-full object-contain mix-blend-screen"
              />
            ) : (
              <div className="px-6 text-center text-xs font-medium text-slate-500">
                Run fitting to generate result images.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Fit Parameters</h4>
          <div className="space-y-2.5 text-xs">
            {!extractedFilenames.length ? (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center font-medium text-slate-500 backdrop-blur-sm">
                Run fitting to populate cards.
              </div>
            ) : (
              extractedFilenames.map((filename) => {
                const result = fitResults[filename];
                const color = getFileColor(filename);

                if (!result) {
                  return (
                    <div
                      key={filename}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition-colors hover:bg-white/10"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: color }} />
                      <div className="pl-1 font-semibold text-slate-200">{filename}</div>
                      <div className="pl-1 mt-1 text-slate-500 font-medium">No fit executed yet.</div>
                    </div>
                  );
                }

                if (isFitError(result)) {
                  return (
                    <div
                      key={filename}
                      className="group relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 backdrop-blur-md transition-colors hover:bg-rose-500/10"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80 bg-rose-500" />
                      <div className="pl-1 font-semibold text-rose-200">{filename}</div>
                      <div className="pl-1 mt-1 font-medium text-rose-400">{result.error}</div>
                    </div>
                  );
                }

                return (
                  <div
                    key={filename}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md transition-colors hover:bg-white/10"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: color, color }} />
                    <div className="pl-1 font-semibold text-slate-200">{filename}</div>
                    <div className="pl-1 mt-1.5 flex flex-col gap-1 text-slate-400 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                      <div>
                        Range: {formatNumber(result.fit_range[0], 4)} → {formatNumber(result.fit_range[1], 4)} | Points: {result.points_used}
                      </div>
                      <div className="flex gap-2 text-[11px] text-slate-300">
                        <span className="bg-black/20 px-1.5 py-0.5 rounded">Yb={formatNumber(result.params.Yb)}</span>
                        <span className="bg-black/20 px-1.5 py-0.5 rounded">A={formatNumber(result.params.A)}</span>
                        <span className="bg-black/20 px-1.5 py-0.5 rounded">TD={formatNumber(result.params.TD)}</span>
                        <span className="bg-black/20 px-1.5 py-0.5 rounded">Tau={formatNumber(result.params.Tau)}</span>
                      </div>
                      <div>
                        R²={formatNumber(result.metrics.r2)} | RMSE={formatNumber(result.metrics.rmse, 6)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
