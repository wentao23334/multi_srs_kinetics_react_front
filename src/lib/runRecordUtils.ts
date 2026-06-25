import type {
  FigureSettingsState,
  FitFigureUrlsState,
  FitRangeMap,
  FitResultMap,
  NumericRange,
  RunRecordSnapshot,
  WaterfallRangeMap,
} from '../types/workflow';

type InitialRunRecordSnapshotInput = {
  keepRecord: boolean;
  sourceFolder: string;
  selectedFiles: string[];
  extractedFilenames: string[];
  mode: 'fast' | 'realtime';
  defaultStartWn: number;
  defaultEndWn: number;
  analysisCropRange: [number, number] | null;
  waterfallMaxLines: number;
  figureSettings: FigureSettingsState;
};

export function buildInitialRunRecordSnapshot({
  keepRecord,
  sourceFolder,
  selectedFiles,
  extractedFilenames,
  mode,
  defaultStartWn,
  defaultEndWn,
  analysisCropRange,
  waterfallMaxLines,
  figureSettings,
}: InitialRunRecordSnapshotInput): RunRecordSnapshot {
  return {
    updated_at: new Date().toISOString(),
    keep_record: keepRecord,
    source_folder: sourceFolder,
    selected_files: [...selectedFiles],
    extracted_files: [...extractedFilenames],
    settings: {
      extraction: {
        mode,
        start_wn: defaultStartWn,
        end_wn: defaultEndWn,
        crop_start_wn: analysisCropRange ? analysisCropRange[0] : null,
        crop_end_wn: analysisCropRange ? analysisCropRange[1] : null,
      },
      integration: {
        start_wn: defaultStartWn,
        end_wn: defaultEndWn,
        baseline_mode: 'linear',
      },
      waterfall: {
        gap: 0,
        max_lines: waterfallMaxLines,
        time_range: null,
        color_scheme: 'RdBu_r',
      },
      figure_render: figureSettings,
      fit_ranges: {},
    },
    active_views: {
      spectra_filename: null,
      kinetics_filename: extractedFilenames[0] ?? null,
    },
    artifacts: {
      overlay_image: null,
      normalized_image: null,
      spectral_image: null,
      spectral_heatmap_image: null,
    },
    fit_results: {},
  };
}

type CurrentRunRecordSnapshotInput = {
  keepRecord: boolean;
  sourceFolder: string;
  selectedFiles: string[];
  extractedFilenames: string[];
  mode: 'fast' | 'realtime';
  defaultStartWn: number;
  defaultEndWn: number;
  analysisCropRange: [number, number] | null;
  globalIntegrationRange: [number, number];
  baselineMode: 'none' | 'linear';
  waterfallGap: number;
  waterfallMaxLines: number;
  activeWaterfallFile: string | null;
  waterfallTimeRanges: WaterfallRangeMap;
  waterfallColorScheme: string;
  figureSettings: FigureSettingsState;
  fitRanges: FitRangeMap;
  currentDatasetFilename: string | null;
  activeKineticsFile: string | null;
  fitFigureUrls: FitFigureUrlsState;
  fitFiguresStale: boolean;
  fitResults: FitResultMap;
};

function getWaterfallTimeRange(
  activeWaterfallFile: string | null,
  waterfallTimeRanges: WaterfallRangeMap,
): NumericRange | null {
  return activeWaterfallFile ? waterfallTimeRanges[activeWaterfallFile] ?? null : null;
}

function summarizeFitResults(fitResults: FitResultMap, extractedFilenames: string[]) {
  const summary: Record<string, unknown> = {};
  extractedFilenames.forEach((filename) => {
    const result = fitResults[filename];
    if (!result) {
      summary[filename] = null;
      return;
    }
    if ('error' in result) {
      summary[filename] = { error: result.error };
      return;
    }
    summary[filename] = {
      fit_range: result.fit_range,
      points_used: result.points_used,
      params: result.params,
      metrics: result.metrics,
      ci95: result.ci95,
      integration_window: result.integration_window,
    };
  });
  return summary;
}

export function buildCurrentRunRecordSnapshot({
  keepRecord,
  sourceFolder,
  selectedFiles,
  extractedFilenames,
  mode,
  defaultStartWn,
  defaultEndWn,
  analysisCropRange,
  globalIntegrationRange,
  baselineMode,
  waterfallGap,
  waterfallMaxLines,
  activeWaterfallFile,
  waterfallTimeRanges,
  waterfallColorScheme,
  figureSettings,
  fitRanges,
  currentDatasetFilename,
  activeKineticsFile,
  fitFigureUrls,
  fitFiguresStale,
  fitResults,
}: CurrentRunRecordSnapshotInput): RunRecordSnapshot {
  return {
    updated_at: new Date().toISOString(),
    keep_record: keepRecord,
    source_folder: sourceFolder,
    selected_files: [...selectedFiles],
    extracted_files: [...extractedFilenames],
    settings: {
      extraction: {
        mode,
        start_wn: defaultStartWn,
        end_wn: defaultEndWn,
        crop_start_wn: analysisCropRange ? analysisCropRange[0] : null,
        crop_end_wn: analysisCropRange ? analysisCropRange[1] : null,
      },
      integration: {
        start_wn: globalIntegrationRange[0],
        end_wn: globalIntegrationRange[1],
        baseline_mode: baselineMode,
      },
      waterfall: {
        gap: waterfallGap,
        max_lines: waterfallMaxLines,
        time_range: getWaterfallTimeRange(activeWaterfallFile, waterfallTimeRanges),
        color_scheme: waterfallColorScheme,
      },
      figure_render: figureSettings,
      fit_ranges: fitRanges,
    },
    active_views: {
      spectra_filename: currentDatasetFilename,
      kinetics_filename: activeKineticsFile,
    },
    artifacts: {
      overlay_image: !fitFiguresStale && fitFigureUrls.overlay ? 'fit_overlay.png' : null,
      normalized_image: !fitFiguresStale && fitFigureUrls.normalized ? 'fit_normalized.png' : null,
      spectral_image: fitFigureUrls.spectral ? 'spectral_waterfall.png' : null,
      spectral_heatmap_image: fitFigureUrls.spectralHeatmap ? 'spectral_heatmap.png' : null,
    },
    fit_results: summarizeFitResults(fitResults, extractedFilenames),
  };
}
