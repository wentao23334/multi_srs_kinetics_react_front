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
  crop_range?: [number, number] | null;
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
  crop_range?: [number, number] | null;
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

export interface FitFigureSeriesPayload {
  label: string;
  color: string;
  full_time: number[];
  full_areas: number[];
  x_fit: number[];
  y_fit: number[];
  x_raw: number[];
  y_raw: number[];
  y_fit_norm: number[];
}

export interface FigurePanelRenderSettings {
  xlabel: string;
  ylabel: string;
  xlim: [number, number] | null;
  ylim: [number, number] | null;
  show_labels: boolean;
  label_offset: [number, number];
}

export interface FigureRenderSettings {
  global: {
    dpi: number;
    width_cm: number;
    height_cm: number;
    reverse_wavenumber_axis: boolean;
  };
  color_scheme: string;
  overlay: FigurePanelRenderSettings;
  normalized: FigurePanelRenderSettings;
  spectral: {
    title: string;
    xlabel: string;
    ylabel: string;
    xlim: [number, number] | null;
    ylim: [number, number] | null;
    zlim: [number, number] | null;
  };
}

export interface RenderFitFiguresRequest {
  run_id: string;
  series: FitFigureSeriesPayload[];
  figure_settings: FigureRenderSettings;
}

export interface RenderFitFiguresResponse {
  overlay_url: string;
  normalized_url: string;
}

export interface RenderSpectralFigureRequest {
  run_id: string;
  filename: string;
  crop_range?: [number, number] | null;
  traces: Array<{
    x: number[];
    y: number[];
    color: string;
    label: string;
  }>;
  heatmap: {
    color_scale: string;
    time_range: [number, number] | null;
    crop_range?: [number, number] | null;
    zmin?: number | null;
    zmax?: number | null;
  };
  figure_settings: {
    title: string;
    xlabel: string;
    ylabel: string;
    xlim: [number, number] | null;
    ylim: [number, number] | null;
    zlim?: [number, number] | null;
    reverse_wavenumber_axis?: boolean;
    global?: {
      dpi: number;
      width_cm: number;
      height_cm: number;
      reverse_wavenumber_axis?: boolean;
    };
  };
}

export interface RenderSpectralFigureResponse {
  spectral_url: string;
  spectral_heatmap_url: string;
}
