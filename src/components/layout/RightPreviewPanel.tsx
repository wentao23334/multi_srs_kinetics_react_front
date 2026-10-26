import type { CSSProperties } from 'react';
import { formatNumber, isFitError } from '../../lib/workflowUtils';
import type { FitFigureUrlsState, FitResultMap } from '../../types/workflow';

interface RightPreviewPanelProps {
  fitSummaryMsg: string;
  fitStatusBadge: string;
  fitResultCount: string;
  fitNormalizedMeta: string;
  fitFigureUrls: FitFigureUrlsState;
  fitResults: FitResultMap;
  extractedFilenames: string[];
  getFileColor: (filename: string) => string;
  onRunAllFits: () => void;
  runFitsPending: boolean;
  fitFiguresStale: boolean;
  spectralFigureStatus: string;
}

function Plate({
  title,
  caption,
  src,
  alt,
}: {
  title: string;
  caption?: string;
  src?: string;
  alt: string;
}) {
  return (
    <div>
      <h4 className="mb-2 font-display text-sm font-semibold text-ink">{title}</h4>
      <figure className="plate aspect-[4/3] w-full overflow-hidden">
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <div className="plate-empty">{caption || 'Nothing rendered yet.'}</div>
        )}
      </figure>
    </div>
  );
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
  fitFiguresStale,
  spectralFigureStatus,
}: RightPreviewPanelProps) {
  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-l border-rule bg-paper-2">
      <header className="border-b-2 border-rule-2 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-display text-ink">
              Global Fit Review
            </h3>
            <p className="status-line mt-1">{fitSummaryMsg}</p>
          </div>
          <button
            type="button"
            onClick={onRunAllFits}
            disabled={!extractedFilenames.length || runFitsPending}
            aria-busy={runFitsPending}
            className="btn shrink-0"
          >
            {runFitsPending ? 'Running…' : 'Run All Fits'}
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="status-chip">{fitStatusBadge}</span>
          <span className="readout-meta">{fitResultCount}</span>
        </div>
        <p className="status-line mt-2">{fitNormalizedMeta}</p>
        {fitFiguresStale && (
          <p className="status-line mt-2 border-l-2 border-accent pl-2 text-ink-2">
            Current fit images are from the previous settings. Run all fits to refresh them.
          </p>
        )}
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto p-6">
        <Plate
          title="Peak Area-Time Overlay"
          caption="Run fitting to generate result images."
          src={fitFigureUrls.overlay || undefined}
          alt="Peak area-time overlay"
        />

        <Plate
          title="Cropped Normalized"
          caption="Run fitting to generate result images."
          src={fitFigureUrls.normalized || undefined}
          alt="Cropped normalized fits"
        />

        <div>
          <div className="mb-2">
            <h4 className="font-display text-sm font-semibold text-ink">Spectral Figure</h4>
            <p className="status-line">{spectralFigureStatus}</p>
          </div>
          <figure className="plate aspect-[4/3] w-full overflow-hidden">
            {fitFigureUrls.spectral ? (
              <img src={fitFigureUrls.spectral} alt="Waterfall spectral figure" className="h-full w-full object-contain" />
            ) : (
              <div className="plate-empty">Render the spectral figure from Step 4 to preview it here.</div>
            )}
          </figure>
        </div>

        <Plate
          title="Spectral Heatmap"
          caption="Render the spectral figure from Step 4 to preview the heatmap here."
          src={fitFigureUrls.spectralHeatmap || undefined}
          alt="Spectral heatmap figure"
        />

        <div>
          <h4 className="mb-2 font-display text-sm font-semibold text-ink">Fit Parameters</h4>
          <div className="text-xs">
            {!extractedFilenames.length ? (
              <div className="plate-empty border border-rule">Run fitting to populate cards.</div>
            ) : (
              extractedFilenames.map((filename) => {
                const result = fitResults[filename];
                const color = getFileColor(filename);

                if (!result) {
                  return (
                    <div key={filename} className="readout" style={{ '--swatch': color } as CSSProperties}>
                      <div className="readout-name">{filename}</div>
                      <div className="readout-meta mt-1">No fit executed yet.</div>
                    </div>
                  );
                }

                if (isFitError(result)) {
                  return (
                    <div key={filename} className="readout readout--error">
                      <div className="readout-name text-error">{filename}</div>
                      <div className="readout-meta mt-1">{result.error}</div>
                    </div>
                  );
                }

                return (
                  <div key={filename} className="readout" style={{ '--swatch': color } as CSSProperties}>
                    <div className="readout-name">{filename}</div>
                    <div className="readout-meta mt-1.5 space-y-1">
                      <div>
                        Range: {formatNumber(result.fit_range[0], 4)} → {formatNumber(result.fit_range[1], 4)} | Points: {result.points_used}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="readout-param">Yb={formatNumber(result.params.Yb)}</span>
                        <span className="readout-param">A={formatNumber(result.params.A)}</span>
                        <span className="readout-param">TD={formatNumber(result.params.TD)}</span>
                        <span className="readout-param">Tau={formatNumber(result.params.Tau)}</span>
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
