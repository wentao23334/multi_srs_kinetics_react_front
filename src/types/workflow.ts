import type {
  FitKineticsResponse,
  GetDatasetResponse,
  IntegrateResponse,
} from './api';

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
}

export interface FigureSettingsState {
  colorScheme: string;
  overlay: FigurePanelSettings;
  normalized: FigurePanelSettings;
  spectral: SpectralFigureSettings;
}

export interface IntegrationCacheEntry extends IntegrateResponse {
  filename: string;
}

export interface FitResult extends FitKineticsResponse {
  filename: string;
  fit_range: [number, number];
  points_used: number;
  x_selected: number[];
  y_selected: number[];
  y_selected_norm: number[];
  y_fit_norm: number[];
  full_time: number[];
  full_areas: number[];
  integration_window: [number, number];
}

export interface FitErrorResult {
  error: string;
}

export type FitOutcome = FitResult | FitErrorResult;

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
