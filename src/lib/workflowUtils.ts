import type {
  FitFigureUrlsState,
  FigureSettingsState,
  FitOutcome,
  FitResultMap,
  IntegrationCacheEntry,
  NumericRange,
} from '../types/workflow';
import type { FitKineticsRequest, FitKineticsResponse, FitParams, GetDatasetResponse } from '../types/api';

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
  global: {
    dpi: 300,
    widthCm: 10,
    heightCm: 8,
    reverseWavenumberAxis: false,
  },
  colorScheme: 'RdBu_r',
  manualColors: {},
  overlay: {
    xlabel: 'Time (s)',
    ylabel: 'Peak Area (a.u.)',
    xRangeInput: '',
    yRangeInput: '',
    showLabels: true,
    labelOffsetInput: '0,0',
  },
  normalized: {
    xlabel: 'Time (s)',
    ylabel: 'Normalized Peak Area (a.u.)',
    xRangeInput: '',
    yRangeInput: '',
    showLabels: true,
    labelOffsetInput: '0,0',
  },
  spectral: {
    title: 'SRS Waterfall',
    xlabel: 'Wavenumber (cm$^{-1}$)',
    ylabel: 'Absorbance (a.u.)',
    xRangeInput: '',
    yRangeInput: '',
    zRangeInput: '',
  },
};

export function emptyFitFigureUrls(): FitFigureUrlsState {
  return {
    overlay: '',
    normalized: '',
    spectral: '',
    spectralHeatmap: '',
  };
}

export function hasRenderedFitFigures(urls: FitFigureUrlsState) {
  return Boolean(urls.overlay || urls.normalized);
}

export function clearFitComparisonUrls(urls: FitFigureUrlsState): FitFigureUrlsState {
  return { ...urls, overlay: '', normalized: '' };
}

export function withFitComparisonUrls(
  urls: FitFigureUrlsState,
  overlay: string,
  normalized: string,
): FitFigureUrlsState {
  return { ...urls, overlay, normalized };
}

export function withSpectralFigureUrls(
  urls: FitFigureUrlsState,
  spectral: string,
  spectralHeatmap: string,
): FitFigureUrlsState {
  return { ...urls, spectral, spectralHeatmap };
}

export function buildFitSummaryMessage(successCount: number, failureCount: number) {
  if (successCount === 0) return 'No successful fit image available.';
  if (failureCount === 0) {
    return `Completed fits for ${successCount} file(s). Overlay and normalized comparison are shown on the right.`;
  }
  return `Completed fits for ${successCount} file(s); ${failureCount} file(s) need attention.`;
}

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

export function parseOffsetInput(value: string): [number, number] {
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

function sampleInterpolatedColors(scaleName: string, count: number) {
  const anchors = colorScales[scaleName] || colorScales.None;
  if (count <= 1) return [anchors[0]];

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

export function sampleColors(scaleName: string, count: number) {
  const anchors = colorScales[scaleName] || colorScales.None;
  if (count <= 1) return [anchors[0]];
  if (scaleName === 'None') return anchors.slice(0, count);
  return sampleInterpolatedColors(scaleName, count);
}

function colorKey(color: string) {
  return String(color || '').trim().toLowerCase();
}

function colorDistanceSquared(aHex: string, bHex: string) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function findNearestScalePosition(scaleName: string, color: string) {
  const samples = sampleInterpolatedColors(scaleName, 512);
  let bestIndex = 0;
  let bestDistance = Infinity;
  samples.forEach((sample, index) => {
    const distance = colorDistanceSquared(sample, color);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex / Math.max(1, samples.length - 1);
}

function findNearestReplaceIndex(
  entries: Array<{ locked: boolean }>,
  targetIndex: number,
) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  entries.forEach((entry, index) => {
    if (entry.locked) return;
    const distance = Math.abs(index - targetIndex);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function buildManualColorGrid(
  scaleName: string,
  selectedColors: string[],
  count = 64,
) {
  const safeCount = Math.max(1, count);
  const baseColors = sampleInterpolatedColors(scaleName || 'None', safeCount);
  const entries = baseColors.map((color, index) => ({
    color,
    position: index / Math.max(1, baseColors.length - 1),
    locked: false,
  }));

  const selectedKeys = new Set<string>();
  selectedColors.forEach((selectedColor) => {
    const selectedKey = colorKey(selectedColor);
    if (!selectedKey || selectedKeys.has(selectedKey)) return;
    selectedKeys.add(selectedKey);

    const existingIndex = entries.findIndex((entry) => colorKey(entry.color) === selectedKey);
    if (existingIndex >= 0) {
      entries[existingIndex].locked = true;
      return;
    }

    const position = findNearestScalePosition(scaleName || 'None', selectedColor);
    const targetIndex = Math.round(position * Math.max(1, entries.length - 1));
    const replaceIndex = findNearestReplaceIndex(entries, targetIndex);
    entries[replaceIndex] = {
      color: selectedColor,
      position,
      locked: true,
    };
  });

  entries.sort((a, b) => a.position - b.position);

  const output: string[] = [];
  const outputKeys = new Set<string>();
  entries.forEach((entry) => {
    const key = colorKey(entry.color);
    if (!key || outputKeys.has(key)) return;
    outputKeys.add(key);
    output.push(entry.color);
  });

  if (output.length < safeCount) {
    sampleInterpolatedColors(scaleName || 'None', safeCount * 2).forEach((color) => {
      if (output.length >= safeCount) return;
      const key = colorKey(color);
      if (outputKeys.has(key)) return;
      outputKeys.add(key);
      output.push(color);
    });
  }

  return output.slice(0, safeCount);
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

export function normalizeSeriesPair(yRaw: number[], yFit: number[], params: FitParams) {
  const baseline = Number(params.Yb);
  const amplitude = Number(params.A);
  if (!Number.isFinite(baseline) || !Number.isFinite(amplitude) || Math.abs(amplitude) < 1e-12) {
    return { raw: yRaw.map(() => 0), fit: yFit.map(() => 0) };
  }

  return {
    raw: yRaw.map((value) => (value - baseline) / amplitude),
    fit: yFit.map((value) => (value - baseline) / amplitude),
  };
}

export function isFitError(result: FitOutcome | undefined): result is { error: string } {
  return Boolean(result && 'error' in result);
}

export function buildSuccessfulSeriesPayload(
  series: Array<{
    filename: string;
    full_time: number[];
    full_areas: number[];
    x_fit: number[];
    y_fit: number[];
    x_raw: number[];
    y_raw: number[];
    y_fit_norm: number[];
  }>,
  getFileColor: (filename: string) => string,
) {
  return series.map((item) => ({
    label: String(item.filename).replace(/\.srs$/i, ''),
    color: getFileColor(item.filename),
    full_time: item.full_time,
    full_areas: item.full_areas,
    x_fit: item.x_fit,
    y_fit: item.y_fit,
    x_raw: item.x_raw,
    y_raw: item.y_raw,
    y_fit_norm: item.y_fit_norm,
  }));
}

export interface SuccessfulFitSeriesInput {
  filename: string;
  full_time: number[];
  full_areas: number[];
  x_fit: number[];
  y_fit: number[];
  x_raw: number[];
  y_raw: number[];
  y_fit_norm: number[];
}

export async function runFitsForFiles({
  filenames,
  fitRanges,
  integrateFile,
  fitKinetics,
  getErrorMessage,
}: {
  filenames: string[];
  fitRanges: Record<string, NumericRange>;
  integrateFile: (filename: string) => Promise<IntegrationCacheEntry>;
  fitKinetics: (payload: FitKineticsRequest) => Promise<FitKineticsResponse>;
  getErrorMessage: (error: unknown, fallback: string) => string;
}) {
  const results: FitResultMap = {};
  const series: SuccessfulFitSeriesInput[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const filename of filenames) {
    try {
      const integrationBody = await integrateFile(filename);
      const timeMin = Math.min(...integrationBody.time);
      const timeMax = Math.max(...integrationBody.time);
      const fitRange = fitRanges[filename] ?? { start: timeMin, end: timeMax };

      const xSelected: number[] = [];
      const ySelected: number[] = [];
      for (let i = 0; i < integrationBody.time.length; i += 1) {
        const timeValue = integrationBody.time[i];
        if (timeValue >= fitRange.start && timeValue <= fitRange.end) {
          xSelected.push(timeValue);
          ySelected.push(integrationBody.areas[i]);
        }
      }

      if (xSelected.length < 4) {
        results[filename] = {
          error: 'Not enough points inside the fit range (need at least 4).',
        };
        failureCount += 1;
        continue;
      }

      const fitBody = await fitKinetics({ x: xSelected, y: ySelected });
      const normalized = normalizeSeriesPair(ySelected, fitBody.y_fit, fitBody.params);
      results[filename] = {
        filename,
        fit_range: [fitRange.start, fitRange.end],
        points_used: xSelected.length,
        params: fitBody.params,
        metrics: fitBody.metrics,
        ci95: fitBody.ci95,
        integration_window: integrationBody.window,
      };
      series.push({
        filename,
        full_time: integrationBody.time,
        full_areas: integrationBody.areas,
        x_fit: fitBody.x_sorted,
        y_fit: fitBody.y_fit,
        x_raw: xSelected,
        y_raw: normalized.raw,
        y_fit_norm: normalized.fit,
      });
      successCount += 1;
    } catch (error) {
      results[filename] = {
        error: getErrorMessage(error, 'Unknown fit error'),
      };
      failureCount += 1;
    }
  }

  return { results, series, successCount, failureCount };
}
