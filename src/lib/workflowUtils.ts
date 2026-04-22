import type { FigureSettingsState, FitOutcome, FitResult, NumericRange } from '../types/workflow';
import type { GetDatasetResponse } from '../types/api';

const colorScales: Record<string, string[]> = {
  None: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  viridis: ['#440154', '#3b528b', '#21908d', '#5dc863', '#fde725'],
  magma: ['#000004', '#51127c', '#b73779', '#fc8961', '#fcfdbf'],
  plasma: ['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921'],
  inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fdea45'],
  cividis: ['#00224e', '#434e6c', '#7d7c78', '#bcae6c', '#fee838'],
  Greys: ['#111111', '#444444', '#777777', '#aaaaaa', '#dddddd'],
  RdBu: ['#67001f', '#d6604d', '#f7f7f7', '#4393c3', '#053061'],
  RdBu_r: ['#053061', '#4393c3', '#f7f7f7', '#d6604d', '#67001f'],
  Spectral: ['#9e0142', '#f46d43', '#fdae61', '#abdda4', '#3288bd', '#5e4fa2'],
  coolwarm: ['#3b4cc0', '#8db0fe', '#f7f7f7', '#f4987a', '#b40426'],
};

export const DEFAULT_FIGURE_SETTINGS: FigureSettingsState = {
  colorScheme: 'None',
  overlay: {
    xlabel: 'Time / Potential',
    ylabel: 'Peak Area',
    xRangeInput: '',
    yRangeInput: '',
    showLabels: true,
    labelOffsetInput: '0,0',
  },
  normalized: {
    xlabel: 'Time / Potential',
    ylabel: 'Normalized Peak Area',
    xRangeInput: '',
    yRangeInput: '',
    showLabels: true,
    labelOffsetInput: '0,0',
  },
  spectral: {
    title: 'SRS Waterfall',
    xlabel: 'Wavenumber (cm⁻¹)',
    ylabel: 'Intensity + Offset',
    xRangeInput: '',
    yRangeInput: '',
  },
};

export interface WaterfallTracePayload {
  x: number[];
  y: number[];
  color: string;
  label: string;
}

export interface WaterfallTraceResult {
  traces: WaterfallTracePayload[];
  visibleRange: NumericRange;
}

export interface HeatmapPayload {
  x: number[];
  y: number[];
  z: number[][];
  colorScale: string;
  visibleRange: NumericRange;
}

export function sampleIndices(total: number, maxN: number) {
  if (total <= maxN) return Array.from({ length: total }, (_, i) => i);
  const step = Math.max(1, Math.floor(total / maxN));
  const indices: number[] = [];
  for (let i = 0; i < total; i += step) indices.push(i);
  if (indices[indices.length - 1] !== total - 1) indices.push(total - 1);
  return indices;
}

export function getNearestValueFromAxis(axis: number[], rawValue: number) {
  if (!axis.length || !Number.isFinite(rawValue)) return rawValue;

  let nearest = axis[0];
  let bestDistance = Math.abs(rawValue - nearest);
  for (let i = 1; i < axis.length; i += 1) {
    const candidate = axis[i];
    const distance = Math.abs(rawValue - candidate);
    if (distance < bestDistance) {
      nearest = candidate;
      bestDistance = distance;
    }
  }
  return nearest;
}

export function getSnappedRange(axis: number[], startValue: number, endValue: number): NumericRange {
  const snappedStart = getNearestValueFromAxis(axis, startValue);
  const snappedEnd = getNearestValueFromAxis(axis, endValue);
  return {
    start: Math.min(snappedStart, snappedEnd),
    end: Math.max(snappedStart, snappedEnd),
  };
}

export function formatNumber(value: number, digits = 4) {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

export function formatRangeInput(start: number, end: number) {
  return `${formatNumber(start, 4)},${formatNumber(end, 4)}`;
}

export function parseRangeInput(value: string) {
  const text = String(value || '').trim();
  if (!text) return null;
  const parts = text.split(',').map((item) => Number(item.trim()));
  if (parts.length !== 2 || parts.some((item) => !Number.isFinite(item))) return null;
  return parts[0] <= parts[1]
    ? { start: parts[0], end: parts[1] }
    : { start: parts[1], end: parts[0] };
}

export function parseOffsetInput(value: string) {
  const text = String(value || '').trim();
  if (!text) return [0, 0] as [number, number];
  const parts = text.split(',').map((item) => Number(item.trim()));
  if (parts.length !== 2 || parts.some((item) => !Number.isFinite(item))) return [0, 0];
  return [parts[0], parts[1]] as [number, number];
}

function hexToRgb(hex: string) {
  const value = String(hex || '').replace('#', '').trim();
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  const intValue = Number.parseInt(normalized, 16);
  if (!Number.isFinite(intValue)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function interpolateColor(startHex: string, endHex: string, t: number) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return rgbToHex({
    r: start.r + (end.r - start.r) * t,
    g: start.g + (end.g - start.g) * t,
    b: start.b + (end.b - start.b) * t,
  });
}

export function sampleColors(scaleName: string, count: number) {
  const anchors = colorScales[scaleName] || colorScales.None;
  if (count <= 1) return [anchors[0]];
  if (scaleName === 'None') return anchors.slice(0, count);

  const output: string[] = [];
  const segments = anchors.length - 1;
  for (let i = 0; i < count; i += 1) {
    const pos = (i / Math.max(1, count - 1)) * segments;
    const left = Math.min(segments - 1, Math.floor(pos));
    const localT = pos - left;
    output.push(interpolateColor(anchors[left], anchors[left + 1], localT));
  }
  return output;
}

export function getSortedTimeAxis(time: number[]) {
  return Array.from(new Set(time.slice().sort((a, b) => a - b)));
}

export function buildWaterfallTracePayload(
  dataset: GetDatasetResponse,
  gap: number,
  maxLines: number,
  timeRangeInput: string,
  colorScheme: string,
): WaterfallTraceResult {
  const totalFrames = dataset.spectra.length;
  const order = Array.from({ length: totalFrames }, (_, i) => i).sort(
    (a, b) => dataset.time[a] - dataset.time[b],
  );

  const axis = getSortedTimeAxis(dataset.time);
  const parsedRange = parseRangeInput(timeRangeInput);
  const resolvedRange = parsedRange ?? {
    start: axis[0],
    end: axis[axis.length - 1],
  };

  const filteredOrder = order.filter(
    (idx) => dataset.time[idx] >= resolvedRange.start && dataset.time[idx] <= resolvedRange.end,
  );
  const safeOrder = filteredOrder.length ? filteredOrder : order;
  const safeMaxLines = Math.max(1, Math.min(maxLines || 15, safeOrder.length));
  const frameIdx = sampleIndices(safeOrder.length, safeMaxLines).map((k) => safeOrder[k]);

  const visibleRange = {
    start: Math.min(...frameIdx.map((idx) => dataset.time[idx])),
    end: Math.max(...frameIdx.map((idx) => dataset.time[idx])),
  };

  const waterfallColors = sampleColors(colorScheme || 'None', Math.max(frameIdx.length, 1));
  const traces = frameIdx.map((idx, stackIdx) => ({
    x: dataset.wavenumbers,
    y: dataset.spectra[idx].map((value) => value + stackIdx * gap),
    color: waterfallColors[stackIdx % waterfallColors.length],
    label: `t=${dataset.time[idx].toFixed(4)}`,
  }));

  return { traces, visibleRange };
}

export function resolveHeatmapColorScale(scaleName: string) {
  const map: Record<string, string> = {
    None: 'Viridis',
    viridis: 'Viridis',
    magma: 'Magma',
    plasma: 'Plasma',
    inferno: 'Inferno',
    cividis: 'Cividis',
    Greys: 'Greys',
    RdBu: 'RdBu',
    RdBu_r: 'RdBu_r',
    Spectral: 'Spectral',
    coolwarm: 'RdBu',
  };
  return map[scaleName] ?? 'Viridis';
}

export function buildHeatmapPayload(
  dataset: GetDatasetResponse,
  timeRangeInput: string,
  colorScheme: string,
): HeatmapPayload {
  const parsedRange = parseRangeInput(timeRangeInput);
  const filteredIndices = dataset.time
    .map((timeValue, idx) => ({ timeValue, idx }))
    .filter(({ timeValue }) =>
      !parsedRange || (timeValue >= parsedRange.start && timeValue <= parsedRange.end),
    )
    .sort((a, b) => a.timeValue - b.timeValue);

  const effectiveIndices = filteredIndices.length
    ? filteredIndices
    : dataset.time.map((timeValue, idx) => ({ timeValue, idx })).sort((a, b) => a.timeValue - b.timeValue);

  const y = effectiveIndices.map(({ timeValue }) => timeValue);
  const z = effectiveIndices.map(({ idx }) => dataset.spectra[idx]);

  return {
    x: dataset.wavenumbers,
    y,
    z,
    colorScale: resolveHeatmapColorScale(colorScheme),
    visibleRange: {
      start: Math.min(...y),
      end: Math.max(...y),
    },
  };
}

export function normalizeSeriesPair(yRaw: number[], yFit: number[]) {
  const combined = [...yRaw, ...yFit].filter((value) => Number.isFinite(value));
  if (!combined.length) {
    return { raw: yRaw.map(() => 0), fit: yFit.map(() => 0) };
  }

  const minValue = Math.min(...combined);
  const maxValue = Math.max(...combined);
  const span = maxValue - minValue;
  if (span < 1e-12) {
    return { raw: yRaw.map(() => 0), fit: yFit.map(() => 0) };
  }

  return {
    raw: yRaw.map((value) => (value - minValue) / span),
    fit: yFit.map((value) => (value - minValue) / span),
  };
}

export function isFitError(result: FitOutcome | undefined): result is { error: string } {
  return Boolean(result && 'error' in result);
}

export function buildSuccessfulSeriesPayload(
  extractedFilenames: string[],
  fitResults: Record<string, FitOutcome>,
  getFileColor: (filename: string) => string,
) {
  return extractedFilenames
    .filter((filename) => fitResults[filename] && !isFitError(fitResults[filename]))
    .map((filename) => {
      const result = fitResults[filename] as FitResult;
      return {
        label: String(filename).replace(/\.srs$/i, ''),
        color: getFileColor(filename),
        full_time: result.full_time,
        full_areas: result.full_areas,
        x_fit: result.x_sorted,
        y_fit: result.y_fit,
        x_raw: result.x_selected,
        y_raw: result.y_selected_norm,
        y_fit_norm: result.y_fit_norm,
      };
    });
}

export function summarizeFitResults(fitResults: Record<string, FitOutcome>, extractedFilenames: string[]) {
  const summary: Record<string, unknown> = {};
  extractedFilenames.forEach((filename) => {
    const result = fitResults[filename];
    if (!result) {
      summary[filename] = null;
      return;
    }
    if (isFitError(result)) {
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
