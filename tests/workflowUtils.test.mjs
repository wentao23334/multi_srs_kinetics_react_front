import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildManualColorGrid,
  buildFitSummaryMessage,
  clearFitComparisonUrls,
  buildSuccessfulSeriesPayload,
  buildWaterfallTracePayload,
  DEFAULT_FIGURE_SETTINGS,
  emptyFitFigureUrls,
  hasRenderedFitFigures,
  normalizeSeriesPair,
  parseOffsetInput,
  parseRangeInput,
  runFitsForFiles,
  sampleColors,
  withFitComparisonUrls,
  withSpectralFigureUrls,
} from '../src/lib/workflowUtils.ts';
import {
  buildCurrentRunRecordSnapshot,
  buildInitialRunRecordSnapshot,
} from '../src/lib/runRecordUtils.ts';

test('range and offset parsers normalize valid input and reject bad input', () => {
  assert.deepEqual(parseRangeInput('5, 2'), { start: 2, end: 5 });
  assert.equal(parseRangeInput('bad'), null);
  assert.deepEqual(parseOffsetInput('1.5, -2'), [1.5, -2]);
  assert.deepEqual(parseOffsetInput('bad'), [0, 0]);
});

test('color helpers keep selected manual colors available', () => {
  assert.equal(sampleColors('None', 3).length, 3);

  const selected = ['#123456', '#abcdef'];
  const grid = buildManualColorGrid('viridis', selected, 8);

  assert.equal(grid.length, 8);
  assert.ok(grid.includes('#123456'));
  assert.ok(grid.includes('#abcdef'));
  assert.equal(new Set(grid.map((color) => color.toLowerCase())).size, grid.length);
});

test('waterfall payload sorts time and applies visible range', () => {
  const dataset = {
    filename: 'sample.srs',
    wavenumbers: [1000, 1100, 1200],
    time: [2, 0, 1],
    spectra: [
      [20, 21, 22],
      [0, 1, 2],
      [10, 11, 12],
    ],
  };

  const result = buildWaterfallTracePayload(dataset, 0, 2, '0,1', 'None');

  assert.equal(result.traces.length, 2);
  assert.deepEqual(result.visibleRange, { start: 0, end: 1 });
  assert.deepEqual(result.traces.map((trace) => trace.label), ['t=0.0000', 't=1.0000']);
});

test('normalization and fit figure payload preserve expected fields', () => {
  assert.deepEqual(
    normalizeSeriesPair([2, 4], [3, 5], { Yb: 1, A: 2, TD: 0, Tau: 1 }),
    { raw: [0.5, 1.5], fit: [1, 2] },
  );

  const payload = buildSuccessfulSeriesPayload(
    [{
      filename: 'a.srs',
      full_time: [0, 1],
      full_areas: [2, 4],
      x_fit: [0, 1],
      y_fit: [2, 4],
      x_raw: [0, 1],
      y_raw: [0, 1],
      y_fit_norm: [0, 1],
    }],
    () => '#123456',
  );

  assert.deepEqual(payload[0], {
    label: 'a',
    color: '#123456',
    full_time: [0, 1],
    full_areas: [2, 4],
    x_fit: [0, 1],
    y_fit: [2, 4],
    x_raw: [0, 1],
    y_raw: [0, 1],
    y_fit_norm: [0, 1],
  });
});

test('fit figure url helpers update only the intended image slots', () => {
  const empty = emptyFitFigureUrls();
  assert.equal(hasRenderedFitFigures(empty), false);

  const withSpectral = withSpectralFigureUrls(empty, '/spectral.png', '/heatmap.png');
  assert.deepEqual(withSpectral, {
    overlay: '',
    normalized: '',
    spectral: '/spectral.png',
    spectralHeatmap: '/heatmap.png',
  });

  const withFit = withFitComparisonUrls(withSpectral, '/overlay.png', '/normalized.png');
  assert.equal(hasRenderedFitFigures(withFit), true);
  assert.deepEqual(clearFitComparisonUrls(withFit), withSpectral);

  assert.equal(buildFitSummaryMessage(0, 2), 'No successful fit image available.');
  assert.equal(
    buildFitSummaryMessage(2, 0),
    'Completed fits for 2 file(s). Overlay and normalized comparison are shown on the right.',
  );
  assert.equal(
    buildFitSummaryMessage(2, 1),
    'Completed fits for 2 file(s); 1 file(s) need attention.',
  );
});

test('fit runner records successes and per-file failures', async () => {
  const integrated = {
    'ok.srs': {
      filename: 'ok.srs',
      time: [0, 1, 2, 3, 4],
      areas: [10, 20, 30, 40, 50],
      window: [1150, 4000],
      baseline_mode: 'linear',
    },
    'short.srs': {
      filename: 'short.srs',
      time: [0, 1, 2],
      areas: [10, 20, 30],
      window: [1150, 4000],
      baseline_mode: 'linear',
    },
  };

  const output = await runFitsForFiles({
    filenames: ['ok.srs', 'short.srs'],
    fitRanges: { 'ok.srs': { start: 1, end: 4 } },
    integrateFile: async (filename) => integrated[filename],
    fitKinetics: async ({ x, y }) => {
      assert.deepEqual(x, [1, 2, 3, 4]);
      assert.deepEqual(y, [20, 30, 40, 50]);
      return {
        params: { Yb: 10, A: 10, TD: 0, Tau: 1 },
        init_guess: { Yb: 10, A: 10, TD: 0, Tau: 1 },
        metrics: { r2: 0.99, rmse: 0.1 },
        ci95: { Yb: null, A: null, TD: null, Tau: null },
        x_sorted: x,
        y_fit: y,
        residuals: [0, 0, 0, 0],
      };
    },
    getErrorMessage: (error, fallback) => error?.message ?? fallback,
  });

  assert.equal(output.successCount, 1);
  assert.equal(output.failureCount, 1);
  assert.equal(output.results['ok.srs'].points_used, 4);
  assert.equal(output.results['short.srs'].error, 'Not enough points inside the fit range (need at least 4).');
  assert.deepEqual(output.series[0].y_raw, [1, 2, 3, 4]);
});

test('initial run record snapshot preserves extraction defaults', () => {
  const snapshot = buildInitialRunRecordSnapshot({
    keepRecord: true,
    sourceFolder: 'D:/data',
    selectedFiles: ['a.srs'],
    extractedFilenames: ['a.srs'],
    mode: 'realtime',
    defaultStartWn: 1150,
    defaultEndWn: 4000,
    analysisCropRange: [1200, 3000],
    waterfallMaxLines: 15,
    figureSettings: DEFAULT_FIGURE_SETTINGS,
  });

  assert.equal(snapshot.keep_record, true);
  assert.deepEqual(snapshot.selected_files, ['a.srs']);
  assert.deepEqual(snapshot.extracted_files, ['a.srs']);
  assert.deepEqual(snapshot.settings.extraction, {
    mode: 'realtime',
    start_wn: 1150,
    end_wn: 4000,
    crop_start_wn: 1200,
    crop_end_wn: 3000,
  });
  assert.deepEqual(snapshot.settings.integration, {
    start_wn: 1150,
    end_wn: 4000,
    baseline_mode: 'linear',
  });
  assert.deepEqual(snapshot.active_views, {
    spectra_filename: null,
    kinetics_filename: 'a.srs',
  });
  assert.deepEqual(snapshot.artifacts, {
    overlay_image: null,
    normalized_image: null,
    spectral_image: null,
    spectral_heatmap_image: null,
  });
});

test('current run record snapshot summarizes active state and stale artifacts', () => {
  const snapshot = buildCurrentRunRecordSnapshot({
    keepRecord: false,
    sourceFolder: 'D:/data',
    selectedFiles: ['a.srs', 'b.srs'],
    extractedFilenames: ['a.srs', 'b.srs'],
    mode: 'fast',
    defaultStartWn: 1000,
    defaultEndWn: 3000,
    analysisCropRange: null,
    globalIntegrationRange: [1200, 2800],
    baselineMode: 'none',
    waterfallGap: 3,
    waterfallMaxLines: 10,
    activeWaterfallFile: 'a.srs',
    waterfallTimeRanges: { 'a.srs': { start: 0, end: 5 } },
    waterfallColorScheme: 'viridis',
    figureSettings: DEFAULT_FIGURE_SETTINGS,
    fitRanges: { 'a.srs': { start: 1, end: 4 } },
    currentDatasetFilename: 'a.srs',
    activeKineticsFile: 'b.srs',
    fitFigureUrls: {
      overlay: '/overlay.png',
      normalized: '/normalized.png',
      spectral: '/spectral.png',
      spectralHeatmap: '/heatmap.png',
    },
    fitFiguresStale: true,
    fitResults: {
      'a.srs': {
        filename: 'a.srs',
        fit_range: [1, 4],
        points_used: 5,
        params: { Yb: 1, A: 2, TD: 3, Tau: 4 },
        metrics: { r2: 0.9, rmse: 0.1 },
        ci95: { Yb: null, A: null, TD: null, Tau: null },
        integration_window: [1200, 2800],
      },
      'b.srs': { error: 'failed' },
    },
  });

  assert.equal(snapshot.keep_record, false);
  assert.deepEqual(snapshot.settings.integration, {
    start_wn: 1200,
    end_wn: 2800,
    baseline_mode: 'none',
  });
  assert.deepEqual(snapshot.settings.waterfall.time_range, { start: 0, end: 5 });
  assert.deepEqual(snapshot.active_views, {
    spectra_filename: 'a.srs',
    kinetics_filename: 'b.srs',
  });
  assert.deepEqual(snapshot.artifacts, {
    overlay_image: null,
    normalized_image: null,
    spectral_image: 'spectral_waterfall.png',
    spectral_heatmap_image: 'spectral_heatmap.png',
  });
  assert.deepEqual(snapshot.fit_results['b.srs'], { error: 'failed' });
  assert.equal(snapshot.fit_results['a.srs'].points_used, 5);
});
