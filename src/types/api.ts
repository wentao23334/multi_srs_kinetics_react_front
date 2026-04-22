export interface ListFolderRequest {
  folder_path: string;
}

export interface ListFolderResponse {
  folder_path: string;
  files: string[];
}

export interface ExtractAllRequest {
  folder_path: string;
  files: string[];
  mode: 'fast' | 'realtime';
  start: number;
  end: number;
  keep_record?: boolean;
}

export interface ExtractAllResponse {
  run_id: string;
  succeeded: string[];
  failed: Record<string, string>;
  keep_record: boolean;
}

export interface GetDatasetRequest {
  run_id: string;
  filename: string;
}

export interface GetDatasetResponse {
  filename: string;
  wavenumbers: number[];
  time: number[];
  spectra: number[][];
}

export interface IntegrateRequest {
  run_id?: string;
  filename?: string;
  start: number;
  end: number;
  baseline_mode: 'none' | 'linear';
  wavenumbers?: number[];
  time?: number[];
  spectra?: number[][];
}

export interface IntegrateResponse {
  time: number[];
  areas: number[];
  window: [number, number];
  baseline_mode: string;
}

export interface FitKineticsRequest {
  x: number[];
  y: number[];
}

export interface FitParams {
  Yb: number;
  A: number;
  TD: number;
  Tau: number;
}

export interface FitKineticsResponse {
  params: FitParams;
  init_guess: FitParams;
  metrics: { r2: number; rmse: number };
  ci95: FitParams;
  x_sorted: number[];
  y_fit: number[];
  residuals: number[];
}

export interface RenderFitFiguresRequest {
  run_id: string;
  series: any[];
  figure_settings: any;
}

export interface RenderFitFiguresResponse {
  overlay_url: string;
  normalized_url: string;
}

export interface RenderSpectralFigureRequest {
  run_id: string;
  filename: string;
  traces: Array<{
    x: number[];
    y: number[];
    color: string;
    label: string;
  }>;
  figure_settings: {
    title: string;
    xlabel: string;
    ylabel: string;
    xlim: [number, number] | null;
    ylim: [number, number] | null;
  };
}

export interface RenderSpectralFigureResponse {
  spectral_url: string;
  spectral_heatmap_url: string;
}
