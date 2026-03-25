import axios from 'axios';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/apiClient';
import {
  formatRangeInput,
  getSnappedRange,
  isFitError,
  normalizeSeriesPair,
  sampleColors,
  summarizeFitResults,
  buildSuccessfulSeriesPayload,
} from '../../lib/workflowUtils';
import { useFigureSettings } from '../../hooks/useFigureSettings';
import { useRunRecord } from '../../hooks/useRunRecord';
import type {
  ExtractAllResponse,
  GetDatasetResponse,
  IntegrateResponse,
} from '../../types/api';
import type {
  DatasetCache,
  FitRangeMap,
  FitResultMap,
  IntegrationCache,
  IntegrationCacheEntry,
  NumericRange,
  RunRecordSnapshot,
  WaterfallRangeMap,
} from '../../types/workflow';
import { LeftControlPanel } from './LeftControlPanel';
import { MainWorkspace } from './MainWorkspace';
import { RightPreviewPanel } from './RightPreviewPanel';

const LAYOUT_STORAGE_KEY = 'multi-srs-layout-widths';
const LEFT_PANEL_DEFAULT = 336;
const RIGHT_PANEL_DEFAULT = 320;
const LEFT_PANEL_MIN = 296;
const LEFT_PANEL_MAX = 460;
const RIGHT_PANEL_MIN = 288;
const RIGHT_PANEL_MAX = 420;
const RESIZE_HANDLE_WIDTH = 12;

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMinimumMainWidth(containerWidth: number) {
  return Math.min(820, Math.max(480, containerWidth - LEFT_PANEL_MIN - RIGHT_PANEL_MIN - RESIZE_HANDLE_WIDTH * 2));
}

function clampPaneWidths(containerWidth: number, left: number, right: number) {
  const minMainWidth = getMinimumMainWidth(containerWidth);
  const maxRightForLeftMin = containerWidth - RESIZE_HANDLE_WIDTH * 2 - LEFT_PANEL_MIN - minMainWidth;
  const nextRight = clamp(
    right,
    RIGHT_PANEL_MIN,
    Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, maxRightForLeftMin)),
  );

  const maxLeft = containerWidth - RESIZE_HANDLE_WIDTH * 2 - nextRight - minMainWidth;
  const nextLeft = clamp(
    left,
    LEFT_PANEL_MIN,
    Math.max(LEFT_PANEL_MIN, Math.min(LEFT_PANEL_MAX, maxLeft)),
  );

  const maxRight = containerWidth - RESIZE_HANDLE_WIDTH * 2 - nextLeft - minMainWidth;
  return {
    left: nextLeft,
    right: clamp(
      nextRight,
      RIGHT_PANEL_MIN,
      Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, maxRight)),
    ),
  };
}

function readStoredPaneWidths() {
  if (typeof window === 'undefined') {
    return { left: LEFT_PANEL_DEFAULT, right: RIGHT_PANEL_DEFAULT };
  }

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return { left: LEFT_PANEL_DEFAULT, right: RIGHT_PANEL_DEFAULT };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === 'number' && typeof parsed?.right === 'number') {
      return { left: parsed.left, right: parsed.right };
    }
  } catch {
    // Ignore invalid persisted layout state.
  }

  return { left: LEFT_PANEL_DEFAULT, right: RIGHT_PANEL_DEFAULT };
}

type ResizeSide = 'left' | 'right';

function ResizeHandle({
  side,
  active,
  onPointerDown,
}: {
  side: ResizeSide;
  active: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="relative z-20 flex h-full w-4 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label={side === 'left' ? 'Resize left panel' : 'Resize right panel'}
        data-resize-handle={side}
        onPointerDown={onPointerDown}
        className="group relative flex h-full w-4 cursor-col-resize touch-none items-center justify-center outline-none"
      >
        <span
          className={`pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 rounded-full transition-colors ${
            active ? 'bg-blue-400/40' : 'bg-white/[0.05] group-hover:bg-white/[0.10]'
          }`}
        />
        <span
          className={`pointer-events-none relative h-16 w-1.5 rounded-full border transition-all ${
            active
              ? 'border-blue-400/40 bg-blue-400/30 shadow-[0_0_16px_rgba(96,165,250,0.25)]'
              : 'border-white/[0.08] bg-white/[0.10] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        />
      </button>
    </div>
  );
}

export function AppShell() {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { queueSave } = useRunRecord();
  const integrationDebounceRef = useRef<number | null>(null);
  const unloadActionRef = useRef<string>('');
  const dragRef = useRef<{
    side: ResizeSide;
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [keepRecord, setKeepRecord] = useState(false);
  const [draggingSide, setDraggingSide] = useState<ResizeSide | null>(null);
  const [paneWidths, setPaneWidths] = useState(readStoredPaneWidths);

  const [folderInput, setFolderInput] = useState('');
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [foundSrsFiles, setFoundSrsFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [applyFolderPending, setApplyFolderPending] = useState(false);
  const [extractPending, setExtractPending] = useState(false);

  const [mode, setMode] = useState<'fast' | 'realtime'>('realtime');
  const [defaultStartWn, setDefaultStartWn] = useState(1150);
  const [defaultEndWn, setDefaultEndWn] = useState(4000);

  const [runId, setRunId] = useState('');
  const [extractedFilenames, setExtractedFilenames] = useState<string[]>([]);
  const [activeWaterfallFile, setActiveWaterfallFile] = useState<string | null>(null);
  const [activeKineticsFile, setActiveKineticsFile] = useState<string | null>(null);
  const [currentDataset, setCurrentDataset] = useState<GetDatasetResponse | null>(null);
  const [datasetCache, setDatasetCache] = useState<DatasetCache>({});
  const [integrationCache, setIntegrationCache] = useState<IntegrationCache>({});
  const [fitRanges, setFitRanges] = useState<FitRangeMap>({});
  const [waterfallTimeRanges, setWaterfallTimeRanges] = useState<WaterfallRangeMap>({});

  const [globalIntegrationRange, setGlobalIntegrationRange] = useState<[number, number]>([1150, 4000]);
  const [baselineMode, setBaselineMode] = useState<'none' | 'linear'>('none');
  const [waterfallGap, setWaterfallGap] = useState(0);
  const [waterfallMaxLines, setWaterfallMaxLines] = useState(15);
  const [waterfallTimeRangeInput, setWaterfallTimeRangeInput] = useState('');
  const [waterfallColorScheme, setWaterfallColorScheme] = useState('None');

  const [fitResults, setFitResults] = useState<FitResultMap>({});
  const [fitFigureUrls, setFitFigureUrls] = useState({ overlay: '', normalized: '' });
  const [fitSummaryMsg, setFitSummaryMsg] = useState(
    'Set fit ranges in Step 3, then run fitting for all selected files.',
  );
  const [runFitsPending, setRunFitsPending] = useState(false);
  const [vizStatusMsg, setVizStatusMsg] = useState('Extract files to begin.');

  // Derive getFileColor early so useFigureSettings can close over it.
  // (extractedFilenames/figureSettings are needed; figureSettings comes from useFigureSettings below)
  // To break the circular dependency we capture a stable ref updated by the hook.
  const getFileColorRef = useRef<(filename: string) => string>(() => '#1f77b4');
  const getFileColor = (filename: string) => getFileColorRef.current(filename);

  const successfulFits = useMemo(
    () => extractedFilenames.filter((filename) => fitResults[filename] && !isFitError(fitResults[filename])),
    [extractedFilenames, fitResults],
  );
  const failedFits = useMemo(
    () => extractedFilenames.filter((filename) => fitResults[filename] && isFitError(fitResults[filename])),
    [extractedFilenames, fitResults],
  );

  const fitStatusBadge = successfulFits.length === 0
    ? extractedFilenames.length
      ? failedFits.length
        ? `Failed (${failedFits.length})`
        : 'Awaiting fit'
      : 'Not fitted'
    : failedFits.length
      ? `Partial (${successfulFits.length}/${extractedFilenames.length})`
      : `Ready (${successfulFits.length})`;

  const fitResultCount = successfulFits.length === 0
    ? failedFits.length
      ? `${failedFits.length} failed`
      : '0 files'
    : `${successfulFits.length} fitted`;

  const fitNormalizedMeta = successfulFits.length === 0
    ? failedFits.length
      ? 'No successful fit'
      : 'No fit data'
    : `${successfulFits.length} normalized segment(s)`;

  const currentIntegrationData =
    (activeKineticsFile && integrationCache[activeKineticsFile]) || null;


  const {
    figureSettings,
    buildFigureRenderSettings,
    handleFigurePanelChange,
    handleFigureColorSchemeChange,
  } = useFigureSettings({
    runId,
    extractedFilenames,
    fitResults,
    getFileColor,
    onFitSummaryMsg: setFitSummaryMsg,
    onFitFigureUrls: setFitFigureUrls,
  });

  // Keep the ref implementation fresh every render so that useFigureSettings
  // and runAllFits always use the current colorScheme and extractedFilenames.
  getFileColorRef.current = (filename: string) => {
    const idx = Math.max(0, extractedFilenames.indexOf(filename));
    const palette = sampleColors(
      figureSettings.colorScheme || 'None',
      Math.max(extractedFilenames.length, 1),
    );
    return palette[idx % palette.length];
  };

  const buildRunRecordSnapshot = (): RunRecordSnapshot => ({
    updated_at: new Date().toISOString(),
    keep_record: keepRecord,
    source_folder: currentFolderPath,
    selected_files: [...selectedFiles],
    extracted_files: [...extractedFilenames],
    settings: {
      extraction: {
        mode,
        start_wn: defaultStartWn,
        end_wn: defaultEndWn,
      },
      integration: {
        start_wn: globalIntegrationRange[0],
        end_wn: globalIntegrationRange[1],
        baseline_mode: baselineMode,
      },
      waterfall: {
        gap: waterfallGap,
        max_lines: waterfallMaxLines,
        time_range:
          activeWaterfallFile && waterfallTimeRanges[activeWaterfallFile]
            ? waterfallTimeRanges[activeWaterfallFile]
            : null,
        color_scheme: waterfallColorScheme,
      },
      figure_render: figureSettings,
      fit_ranges: fitRanges,
    },
    active_views: {
      spectra_filename: currentDataset?.filename || null,
      kinetics_filename: activeKineticsFile,
    },
    artifacts: {
      overlay_image: fitFigureUrls.overlay ? 'fit_overlay.png' : null,
      normalized_image: fitFigureUrls.normalized ? 'fit_normalized.png' : null,
    },
    fit_results: summarizeFitResults(fitResults, extractedFilenames),
  });

  const saveRunRecord = () => {
    return queueSave(runId, keepRecord, buildRunRecordSnapshot());
  };

  const clearFitImages = (message = 'Run fitting to generate result images.') => {
    setFitFigureUrls({ overlay: '', normalized: '' });
    setFitSummaryMsg(message);
  };

  const invalidateFitResultsOnly = (
    message = 'Fit ranges changed. Run fitting again to refresh the right-hand results.',
  ) => {
    setFitResults({});
    clearFitImages(message);
    void saveRunRecord();
  };

  const cleanupRun = async (targetRunId: string) => {
    if (!targetRunId) return;
    try {
      await apiClient.post('/cleanup', { run_id: targetRunId });
    } catch {
      // Ignore cleanup failures for temp runs.
    }
  };

  const fetchDataset = async (filename: string, targetRunId = runId) => {
    if (!targetRunId) throw new Error('run_id is missing');
    if (datasetCache[filename]) return datasetCache[filename];

    const response = await apiClient.post<GetDatasetResponse>('/get_dataset', {
      run_id: targetRunId,
      filename,
    });
    const body = response.data;
    setDatasetCache((prev) => ({ ...prev, [filename]: body }));
    return body;
  };

  const integrateDatasetForFile = async (
    filename: string,
    force = false,
    targetRunId = runId,
  ) => {
    if (!targetRunId) throw new Error('run_id is missing');
    if (!force && integrationCache[filename]) return integrationCache[filename];

    const response = await apiClient.post<IntegrateResponse>('/integrate', {
      run_id: targetRunId,
      filename,
      start: globalIntegrationRange[0],
      end: globalIntegrationRange[1],
      baseline_mode: baselineMode,
    });
    const entry: IntegrationCacheEntry = { ...response.data, filename };
    setIntegrationCache((prev) => ({ ...prev, [filename]: entry }));

    const axis = Array.from(new Set(entry.time.slice().sort((a, b) => a - b)));
    setFitRanges((prev) => {
      const next = prev[filename] ?? {
        start: axis[0],
        end: axis[axis.length - 1],
      };
      return { ...prev, [filename]: next };
    });

    return entry;
  };

  const selectWaterfallFile = async (filename: string, targetRunId = runId) => {
    if (!targetRunId) return;
    setActiveWaterfallFile(filename);
    setVizStatusMsg(`Loading ${filename}…`);

    try {
      const body = await fetchDataset(filename, targetRunId);
      setCurrentDataset(body);

      if (waterfallGap === 0) {
        let minV = Infinity;
        let maxV = -Infinity;
        for (const row of body.spectra) {
          for (const value of row) {
            if (value < minV) minV = value;
            if (value > maxV) maxV = value;
          }
        }
        if (Number.isFinite(minV) && Number.isFinite(maxV)) {
          setWaterfallGap(Number(((maxV - minV) * 0.05).toPrecision(4)));
        }
      }

      setVizStatusMsg(`Showing: ${filename}`);
    } catch (error) {
      setVizStatusMsg(`Error loading ${filename}: ${getErrorMessage(error, 'load failed')}`);
      toast.error(getErrorMessage(error, `Failed to load ${filename}`));
    }
  };

  const selectKineticsFile = async (
    filename: string,
    force = false,
    targetRunId = runId,
  ) => {
    if (!targetRunId) return;
    setActiveKineticsFile(filename);
    try {
      await integrateDatasetForFile(filename, force, targetRunId);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to integrate ${filename}`));
    }
  };

  const handleApplyFolder = async () => {
    if (!folderInput.trim()) {
      toast.error('Please enter a valid folder path.');
      return;
    }

    setApplyFolderPending(true);
    try {
      const response = await apiClient.post<{ folder_path: string; files: string[] }>('/list_folder', {
        folder_path: folderInput.trim(),
      });
      setCurrentFolderPath(response.data.folder_path);
      setFoundSrsFiles(response.data.files);
      setSelectedFiles([]);
      toast.success(`Found ${response.data.files.length} SRS files.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to scan folder'));
    } finally {
      setApplyFolderPending(false);
    }
  };

  const handleExtractAll = async () => {
    if (!currentFolderPath || !selectedFiles.length) {
      toast.error('Select at least one file before extraction.');
      return;
    }

    const previousRunId = runId;
    const previousKeepRecord = keepRecord;

    setExtractPending(true);
    setVizStatusMsg(`Extracting ${selectedFiles.length} file(s)…`);
    setWaterfallGap(0);

    try {
      const response = await apiClient.post<ExtractAllResponse>('/extract_all', {
        folder_path: currentFolderPath,
        files: selectedFiles,
        mode,
        start: defaultStartWn,
        end: defaultEndWn,
        keep_record: keepRecord,
      });
      const body = response.data;

      if (previousRunId && !previousKeepRecord) {
        void cleanupRun(previousRunId);
      }

      const nextRunId = body.run_id;
      setRunId(nextRunId);
      setKeepRecord(Boolean(body.keep_record));
      setExtractedFilenames(body.succeeded);
      setDatasetCache({});
      setIntegrationCache({});
      setFitRanges({});
      setWaterfallTimeRanges({});
      setFitResults({});
      setFitFigureUrls({ overlay: '', normalized: '' });
      setCurrentDataset(null);
      setActiveWaterfallFile(body.succeeded[0] ?? null);
      setActiveKineticsFile(body.succeeded[0] ?? null);
      setCurrentStep(body.succeeded.length ? 2 : 1);
      setGlobalIntegrationRange([defaultStartWn, defaultEndWn]);
      setBaselineMode('none');
      setWaterfallTimeRangeInput('');
      setFitSummaryMsg('Set fit ranges in Step 3, then run fitting for all selected files.');

      if (body.failed && Object.keys(body.failed).length > 0) {
        toast.warning(`Some files failed: ${Object.keys(body.failed).length}`);
      }

      if (body.succeeded.length) {
        await selectWaterfallFile(body.succeeded[0], nextRunId);
        await selectKineticsFile(body.succeeded[0], true, nextRunId);
      }

      setVizStatusMsg(
        `Extracted ${body.succeeded.length} file(s). Select a file above to view its waterfall.`,
      );
      toast.success(`Extracted ${body.succeeded.length} file(s).`);
      // Use queueSave manually here to guarantee nextRunId gets saved via snapshot
      await queueSave(nextRunId, Boolean(body.keep_record), {
        updated_at: new Date().toISOString(),
        keep_record: Boolean(body.keep_record),
        source_folder: currentFolderPath,
        selected_files: [...selectedFiles],
        extracted_files: [...body.succeeded],
        settings: {
          extraction: { mode, start_wn: defaultStartWn, end_wn: defaultEndWn },
          integration: { start_wn: defaultStartWn, end_wn: defaultEndWn, baseline_mode: 'none' },
          waterfall: { gap: 0, max_lines: waterfallMaxLines, time_range: null, color_scheme: 'None' },
          figure_render: figureSettings,
          fit_ranges: {},
        },
        active_views: { spectra_filename: null, kinetics_filename: body.succeeded[0] ?? null },
        artifacts: { overlay_image: null, normalized_image: null },
        fit_results: {},
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Extraction failed'));
      setVizStatusMsg(`Extraction error: ${getErrorMessage(error, 'Extraction failed')}`);
    } finally {
      setExtractPending(false);
    }
  };

  const handleVisibleTimeRangeChange = (filename: string, range: NumericRange) => {
    setWaterfallTimeRanges((prev) => {
      const current = prev[filename];
      if (current && current.start === range.start && current.end === range.end) {
        return prev;
      }
      return { ...prev, [filename]: range };
    });
    if (activeWaterfallFile === filename) {
      const text = formatRangeInput(range.start, range.end);
      setWaterfallTimeRangeInput((prev) => (prev === text ? prev : text));
    }
  };

  const handleIntegrationRangeChange = (range: [number, number], shouldDebounce: boolean) => {
    setGlobalIntegrationRange(range);
    setIntegrationCache({});
    setFitRanges({});
    invalidateFitResultsOnly(
      'Integration settings changed. Run fitting again to refresh the right-hand results.',
    );

    if (integrationDebounceRef.current) {
      window.clearTimeout(integrationDebounceRef.current);
      integrationDebounceRef.current = null;
    }

    const targetFile = activeKineticsFile || activeWaterfallFile;
    if (!targetFile) return;

    const trigger = () => {
      void selectKineticsFile(targetFile, true);
    };

    if (shouldDebounce) {
      integrationDebounceRef.current = window.setTimeout(trigger, 450);
    } else {
      trigger();
    }
  };

  const handleBaselineModeChange = (value: 'none' | 'linear') => {
    setBaselineMode(value);
    setIntegrationCache({});
    setFitRanges({});
    invalidateFitResultsOnly(
      'Integration settings changed. Run fitting again to refresh the right-hand results.',
    );
    const targetFile = activeKineticsFile || activeWaterfallFile;
    if (targetFile) {
      void selectKineticsFile(targetFile, true);
    }
  };

  const handleIntegrate = async () => {
    const targetFile = activeKineticsFile || activeWaterfallFile;
    if (!targetFile) return;
    setCurrentStep(3);
    invalidateFitResultsOnly(
      'Integration settings changed. Run fitting again to refresh the right-hand results.',
    );
    setIntegrationCache({});
    setFitRanges({});
    await selectKineticsFile(targetFile, true);
  };

  const handleFitRangeChange = async (filename: string, range: NumericRange) => {
    let entry = integrationCache[filename];
    if (!entry) {
      entry = await integrateDatasetForFile(filename, false);
    }

    const axis = Array.from(new Set(entry.time.slice().sort((a, b) => a - b)));
    const snapped = getSnappedRange(axis, range.start, range.end);
    setFitRanges((prev) => ({ ...prev, [filename]: snapped }));
    if (activeKineticsFile !== filename) {
      setActiveKineticsFile(filename);
    }
    invalidateFitResultsOnly();
  };

  const handleFitRangeInputChange = async (
    filename: string,
    bound: 'start' | 'end',
    value: string,
  ) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const existing = fitRanges[filename];
    if (!existing) {
      await selectKineticsFile(filename);
      return;
    }

    const nextRange = {
      start: bound === 'start' ? parsed : existing.start,
      end: bound === 'end' ? parsed : existing.end,
    };
    await handleFitRangeChange(filename, nextRange);
  };

  const runAllFits = async () => {
    if (!runId || !extractedFilenames.length) return;

    setRunFitsPending(true);
    setFitSummaryMsg(`Running fits for ${extractedFilenames.length} file(s)…`);
    setFitResults({});
    setFitFigureUrls({ overlay: '', normalized: '' });

    const nextResults: FitResultMap = {};
    let successCount = 0;
    let failureCount = 0;

    for (const filename of extractedFilenames) {
      try {
        const integrationBody = await integrateDatasetForFile(filename, false);
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
          nextResults[filename] = {
            error: 'Not enough points inside the fit range (need at least 4).',
          };
          failureCount += 1;
          continue;
        }

        const fitResponse = await apiClient.post('/fit-kinetics', {
          x: xSelected,
          y: ySelected,
        });
        const normalized = normalizeSeriesPair(ySelected, fitResponse.data.y_fit);
        nextResults[filename] = {
          ...fitResponse.data,
          filename,
          fit_range: [fitRange.start, fitRange.end],
          points_used: xSelected.length,
          x_selected: xSelected,
          y_selected: ySelected,
          y_selected_norm: normalized.raw,
          y_fit_norm: normalized.fit,
          full_time: integrationBody.time,
          full_areas: integrationBody.areas,
          integration_window: integrationBody.window,
        };
        successCount += 1;
      } catch (error) {
        nextResults[filename] = {
          error: getErrorMessage(error, 'Unknown fit error'),
        };
        failureCount += 1;
      }
    }

    setFitResults(nextResults);

    const successfulPayload = buildSuccessfulSeriesPayload(
      extractedFilenames,
      nextResults,
      getFileColor,
    );

    try {
      if (successfulPayload.length) {
        const response = await apiClient.post('/render-fit-figures', {
          run_id: runId,
          series: successfulPayload,
          figure_settings: buildFigureRenderSettings(),
        });
        setFitFigureUrls({
          overlay: response.data.overlay_url,
          normalized: response.data.normalized_url,
        });
        setFitSummaryMsg(
          failureCount === 0
            ? `Completed fits for ${successCount} file(s). Overlay and normalized comparison are shown on the right.`
            : `Completed fits for ${successCount} file(s); ${failureCount} file(s) need attention.`,
        );
      } else {
        setFitFigureUrls({ overlay: '', normalized: '' });
        setFitSummaryMsg('No successful fit image available.');
      }
    } catch (error) {
      setFitFigureUrls({ overlay: '', normalized: '' });
      setFitSummaryMsg(
        `Fits completed, but figure rendering failed: ${getErrorMessage(error, 'render failed')}`,
      );
    } finally {
      await saveRunRecord();
      setRunFitsPending(false);
    }
  };

  useEffect(() => {
    if (!activeWaterfallFile) {
      setWaterfallTimeRangeInput('');
      return;
    }
    const stored = waterfallTimeRanges[activeWaterfallFile];
    if (stored) {
      setWaterfallTimeRangeInput(formatRangeInput(stored.start, stored.end));
    } else {
      setWaterfallTimeRangeInput('');
    }
  }, [activeWaterfallFile, waterfallTimeRanges]);

  useEffect(() => {
    if (!runId) return;

    unloadActionRef.current = '';

    const flushRunState = () => {
      const actionKey = `${runId}:${keepRecord ? 'keep' : 'cleanup'}`;
      if (unloadActionRef.current === actionKey) return;
      unloadActionRef.current = actionKey;

      if (keepRecord) {
        const payload = JSON.stringify({
          run_id: runId,
          keep_record: true,
          record: buildRunRecordSnapshot(),
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/save_run_record', blob);
        }
        return;
      }

      const payload = JSON.stringify({ run_id: runId });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/cleanup', blob);
      }
    };

    const handleBeforeUnload = () => {
      flushRunState();
    };

    const handlePageHide = () => {
      flushRunState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushRunState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    activeKineticsFile,
    currentDataset,
    currentFolderPath,
    defaultEndWn,
    defaultStartWn,
    extractedFilenames,
    figureSettings,
    fitFigureUrls,
    fitRanges,
    fitResults,
    globalIntegrationRange,
    keepRecord,
    mode,
    runId,
    selectedFiles,
    waterfallColorScheme,
    waterfallGap,
    waterfallMaxLines,
    waterfallTimeRanges,
    baselineMode,
  ]);

  useEffect(() => {
    const updateLayoutBounds = () => {
      const containerWidth = layoutRef.current?.clientWidth;
      if (!containerWidth) return;
      setPaneWidths((prev) => clampPaneWidths(containerWidth, prev.left, prev.right));
    };

    updateLayoutBounds();
    window.addEventListener('resize', updateLayoutBounds);
    return () => {
      window.removeEventListener('resize', updateLayoutBounds);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(paneWidths));
  }, [paneWidths]);

  useEffect(() => {
    return () => {
      if (integrationDebounceRef.current) {
        window.clearTimeout(integrationDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragRef.current;
      const containerWidth = layoutRef.current?.clientWidth;
      if (!dragState || !containerWidth) return;

      const delta = event.clientX - dragState.startX;
      const nextLeft = dragState.side === 'left' ? dragState.startLeft + delta : dragState.startLeft;
      const nextRight = dragState.side === 'right' ? dragState.startRight - delta : dragState.startRight;
      setPaneWidths(clampPaneWidths(containerWidth, nextLeft, nextRight));
    };

    const stopResize = () => {
      dragRef.current = null;
      setDraggingSide(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const handleResizeStart = (side: ResizeSide) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      side,
      startX: event.clientX,
      startLeft: paneWidths.left,
      startRight: paneWidths.right,
    };
    setDraggingSide(side);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div
      ref={layoutRef}
      className={`flex h-screen w-full overflow-hidden bg-transparent text-slate-200 ${
        draggingSide ? 'select-none' : ''
      }`}
    >
      <div className="shrink-0" style={{ width: paneWidths.left }}>
        <LeftControlPanel
          currentStep={currentStep}
          keepRecord={keepRecord}
          onKeepRecordChange={(value) => {
            setKeepRecord(value);
            void saveRunRecord();
          }}
          folderInput={folderInput}
          onFolderInputChange={setFolderInput}
          foundSrsFiles={foundSrsFiles}
          selectedFiles={selectedFiles}
          onToggleSelectAll={(checked) =>
            setSelectedFiles(checked ? [...foundSrsFiles] : [])
          }
          onToggleFile={(filename, checked) =>
            setSelectedFiles((prev) =>
              checked
                ? prev.includes(filename)
                  ? prev
                  : [...prev, filename]
                : prev.filter((item) => item !== filename),
            )
          }
          applyFolderPending={applyFolderPending}
          onApplyFolder={handleApplyFolder}
          mode={mode}
          onModeChange={setMode}
          defaultStartWn={defaultStartWn}
          onDefaultStartWnChange={setDefaultStartWn}
          defaultEndWn={defaultEndWn}
          onDefaultEndWnChange={setDefaultEndWn}
          extractPending={extractPending}
          onExtractAll={handleExtractAll}
          integrationRange={globalIntegrationRange}
          onIntegrationRangeChange={(range) => handleIntegrationRangeChange(range, false)}
          baselineMode={baselineMode}
          onBaselineModeChange={handleBaselineModeChange}
          onIntegrate={handleIntegrate}
          extractedFilenames={extractedFilenames}
          fitRanges={fitRanges}
          activeKineticsFile={activeKineticsFile}
          onSelectKineticsFile={(filename) => void selectKineticsFile(filename)}
          onFitRangeInputChange={(filename, bound, value) =>
            void handleFitRangeInputChange(filename, bound, value)
          }
          figureSettings={figureSettings}
          onFigureColorSchemeChange={handleFigureColorSchemeChange}
          onFigurePanelChange={handleFigurePanelChange}
        />
      </div>
      <ResizeHandle
        side="left"
        active={draggingSide === 'left'}
        onPointerDown={handleResizeStart('left')}
      />
      <div className="min-w-0 flex-1">
        <MainWorkspace
          currentStep={currentStep}
          vizStatusMsg={vizStatusMsg}
          extractedFilenames={extractedFilenames}
          activeWaterfallFile={activeWaterfallFile}
          activeKineticsFile={activeKineticsFile}
          onSelectWaterfallFile={(filename) => void selectWaterfallFile(filename)}
          onSelectKineticsFile={(filename) => void selectKineticsFile(filename)}
          currentDataset={currentDataset}
          currentIntegrationData={currentIntegrationData}
          fitRange={activeKineticsFile ? fitRanges[activeKineticsFile] ?? null : null}
          onFitRangeChange={(filename, range) => void handleFitRangeChange(filename, range)}
          integrationRange={globalIntegrationRange}
          waterfallGap={waterfallGap}
          onWaterfallGapChange={setWaterfallGap}
          waterfallMaxLines={waterfallMaxLines}
          onWaterfallMaxLinesChange={setWaterfallMaxLines}
          waterfallTimeRangeInput={waterfallTimeRangeInput}
          onWaterfallTimeRangeInputChange={setWaterfallTimeRangeInput}
          waterfallColorScheme={waterfallColorScheme}
          onWaterfallColorSchemeChange={setWaterfallColorScheme}
          onVisibleTimeRangeChange={handleVisibleTimeRangeChange}
          onIntegrationRangeChange={handleIntegrationRangeChange}
        />
      </div>
      <ResizeHandle
        side="right"
        active={draggingSide === 'right'}
        onPointerDown={handleResizeStart('right')}
      />
      <div className="shrink-0" style={{ width: paneWidths.right }}>
        <RightPreviewPanel
          fitSummaryMsg={fitSummaryMsg}
          fitStatusBadge={fitStatusBadge}
          fitResultCount={fitResultCount}
          fitNormalizedMeta={fitNormalizedMeta}
          fitFigureUrls={fitFigureUrls}
          fitResults={fitResults}
          extractedFilenames={extractedFilenames}
          getFileColor={getFileColor}
          onRunAllFits={() => void runAllFits()}
          runFitsPending={runFitsPending}
        />
      </div>
    </div>
  );
}
