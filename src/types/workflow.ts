import type { FitParamIntervals, FitParams, GetDatasetResponse, IntegrateResponse } from './api';

export interface NumericRange {
  start: number;
  end: number;
}

export interface FigurePanelSettings {
  xlabel: string;
  ylabel: string;
  xRangeInput: string;
  yRangeInput: string;
  showLabels: boolean;
  labelOffsetInput: string;
}

export interface SpectralFigureSettings {
  title: string;
  xlabel: string;
  ylabel: string;
  xRangeInput: string;
  yRangeInput: string;
  zRangeInput: string;
}

export interface GlobalImageSettings {
  dpi: number;
  widthCm: number;
  heightCm: number;
  reverseWavenumberAxis: boolean;
}

export interface FigureSettingsState {
  global: GlobalImageSettings;
  colorScheme: string;
  manualColors: Record<string, string>;
  overlay: FigurePanelSettings;
  normalized: FigurePanelSettings;
  spectral: SpectralFigureSettings;
}

export interface IntegrationCacheEntry extends IntegrateResponse {
  filename: string;
}

export interface FitResult {
  filename: string;
  fit_range: [number, number];
  points_used: number;
  params: FitParams;
  metrics: { r2: number; rmse: number };
  ci95: FitParamIntervals;
  integration_window: [number, number];
}

export interface FitErrorResult {
  error: string;
}

export type FitOutcome = FitResult | FitErrorResult;

export interface FitFigureUrlsState {
  overlay: string;
  normalized: string;
  spectral: string;
  spectralHeatmap: string;
}

export interface RunRecordSnapshot {
  updated_at: string;
  keep_record: boolean;
  source_folder: string;
  selected_files: string[];
  extracted_files: string[];
  settings: {
    extraction: {
      mode: 'fast' | 'realtime';
      start_wn: number;
      end_wn: number;
      crop_start_wn: number | null;
      crop_end_wn: number | null;
    };
    integration: {
      start_wn: number;
      end_wn: number;
      baseline_mode: 'none' | 'linear';
    };
    waterfall: {
      gap: number;
      max_lines: number;
      time_range: NumericRange | null;
      color_scheme: string;
    };
    figure_render: FigureSettingsState;
    fit_ranges: Record<string, NumericRange>;
  };
  active_views: {
    spectra_filename: string | null;
    kinetics_filename: string | null;
  };
  artifacts: {
    overlay_image: string | null;
    normalized_image: string | null;
    spectral_image: string | null;
    spectral_heatmap_image: string | null;
  };
  fit_results: Record<string, unknown>;
}

export type DatasetCache = Record<string, GetDatasetResponse>;
export type IntegrationCache = Record<string, IntegrationCacheEntry>;
export type FitRangeMap = Record<string, NumericRange>;
export type WaterfallRangeMap = Record<string, NumericRange>;
export type FitResultMap = Record<string, FitOutcome>;
