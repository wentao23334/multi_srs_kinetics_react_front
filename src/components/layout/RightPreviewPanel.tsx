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
    <aside className="flex h-full w-[22rem] shrink-0 flex-col border-l border-slate-800 bg-slate-900">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Fitting Results</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-200">Global Fit Review</h3>
            <p className="mt-1 text-xs text-slate-400">{fitSummaryMsg}</p>
          </div>
          <button
            onClick={onRunAllFits}
            disabled={!extractedFilenames.length || runFitsPending}
            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {runFitsPending ? 'Running…' : 'Run All Fits'}
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">{fitStatusBadge}</span>
          <span className="text-slate-400">{fitResultCount}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{fitNormalizedMeta}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Peak Area-Time Overlay</h4>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            {fitFigureUrls.overlay ? (
              <img
                src={fitFigureUrls.overlay}
                alt="Peak Area-Time Overlay"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
                Run fitting to generate result images.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cropped Normalized</h4>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            {fitFigureUrls.normalized ? (
              <img
                src={fitFigureUrls.normalized}
                alt="Cropped Normalized Fits"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
                Run fitting to generate result images.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Fit Parameters</h4>
          <div className="space-y-2 text-xs">
            {!extractedFilenames.length ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center text-slate-400">
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
                      className="rounded-lg border border-slate-700 bg-slate-800 p-3"
                      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                    >
                      <div className="font-medium text-slate-200">{filename}</div>
                      <div className="mt-1 text-slate-400">No fit executed yet.</div>
                    </div>
                  );
                }

                if (isFitError(result)) {
                  return (
                    <div
                      key={filename}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-3"
                      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                    >
                      <div className="font-medium text-slate-200">{filename}</div>
                      <div className="mt-1 text-rose-300">{result.error}</div>
                    </div>
                  );
                }

                return (
                  <div
                    key={filename}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-3"
                    style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                  >
                    <div className="font-medium text-slate-200">{filename}</div>
                    <div className="mt-1 text-slate-400">
                      Range: {formatNumber(result.fit_range[0], 4)} → {formatNumber(result.fit_range[1], 4)} | Points: {result.points_used}
                    </div>
                    <div className="mt-1 text-slate-400">
                      Yb={formatNumber(result.params.Yb)} | A={formatNumber(result.params.A)} | TD={formatNumber(result.params.TD)} | Tau={formatNumber(result.params.Tau)}
                    </div>
                    <div className="mt-1 text-slate-400">
                      R²={formatNumber(result.metrics.r2)} | RMSE={formatNumber(result.metrics.rmse, 6)}
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
