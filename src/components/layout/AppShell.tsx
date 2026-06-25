import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { toast } from 'sonner';
import {
  buildManualColorGrid,
  buildFitSummaryMessage,
  clearFitComparisonUrls,
  emptyFitFigureUrls,
  buildWaterfallTracePayload,
  buildSuccessfulSeriesPayload,
  formatRangeInput,
  getSnappedRange,
  hasRenderedFitFigures,
  isFitError,
  resolveHeatmapColorScale,
  runFitsForFiles,
  sampleColors,
  withFitComparisonUrls,
  withSpectralFigureUrls,
} from '../../lib/workflowUtils';
import { buildCurrentRunRecordSnapshot, buildInitialRunRecordSnapshot } from '../../lib/runRecordUtils';
import { getErrorMessage, workflowApi } from '../../lib/workflowApi';
import { useDatasetWorkflow } from '../../hooks/useDatasetWorkflow';
import { useExtractionSource } from '../../hooks/useExtractionSource';
import { useFigureSettings } from '../../hooks/useFigureSettings';
import { useResizablePanes, type ResizeSide } from '../../hooks/useResizablePanes';
import { useRunRecord } from '../../hooks/useRunRecord';
import type {
  FigureSettingsState,
  FitFigureUrlsState,
  FitResultMap,
  GlobalImageSettings,
  NumericRange,
  RunRecordSnapshot,
  SpectralFigureSettings,
  WaterfallRangeMap,
} from '../../types/workflow';
import { LeftControlPanel } from './LeftControlPanel';
import { MainWorkspace } from './MainWorkspace';
import { RightPreviewPanel } from './RightPreviewPanel';

const INITIAL_FIT_SUMMARY_MESSAGE = 'Set fit ranges in Step 3, then run fitting for all selected files.';
const INITIAL_SPECTRAL_STATUS = 'Render the active waterfall view to generate a publication-style spectral figure.';

function resolveOptionalCropRange(
  cropStartInput: string,
  cropEndInput: string,
  fallbackStart: number,
  fallbackEnd: number,
): [number, number] | null {
  const startRaw = cropStartInput.trim();
  const endRaw = cropEndInput.trim();
  if (!startRaw && !endRaw) return null;

  const start = startRaw ? Number(startRaw) : fallbackStart;
  const end = endRaw ? Number(endRaw) : fallbackEnd;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return start <= end ? [start, end] : [end, start];
}

function colorKey(color: string) {
  return String(color || '').trim().toLowerCase();
}

type RunRecordSnapshotOverrides = {
  fitFigureUrls?: FitFigureUrlsState;
  fitFiguresStale?: boolean;
  fitResults?: FitResultMap;
  figureSettings?: FigureSettingsState;
  keepRecord?: boolean;
};

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
  const { queueSave } = useRunRecord();
  const { layoutRef, paneWidths, draggingSide, handleResizeStart } = useResizablePanes();
  const unloadActionRef = useRef<string>('');
  const isEditingWaterfallTimeRangeRef = useRef(false);
  const waterfallLoadSeqRef = useRef(0);

  const [currentStep, setCurrentStep] = useState(1);
  const [keepRecord, setKeepRecord] = useState(false);

  const [extractPending, setExtractPending] = useState(false);

  const [mode, setMode] = useState<'fast' | 'realtime'>('realtime');
  const [defaultStartWn, setDefaultStartWn] = useState(1150);
  const [defaultEndWn, setDefaultEndWn] = useState(4000);
  const [cropStartWnInput, setCropStartWnInput] = useState('');
  const [cropEndWnInput, setCropEndWnInput] = useState('');

  const [runId, setRunId] = useState('');
  const [extractedFilenames, setExtractedFilenames] = useState<string[]>([]);
  const [waterfallTimeRanges, setWaterfallTimeRanges] = useState<WaterfallRangeMap>({});

  const [globalIntegrationRange, setGlobalIntegrationRange] = useState<[number, number]>([1150, 4000]);
  const [baselineMode, setBaselineMode] = useState<'none' | 'linear'>('linear');
  const [waterfallGap, setWaterfallGap] = useState(0);
  const [waterfallMaxLines, setWaterfallMaxLines] = useState(15);
  const [waterfallTimeRangeInput, setWaterfallTimeRangeInput] = useState('');
  const [waterfallAppliedTimeRangeInput, setWaterfallAppliedTimeRangeInput] = useState('');
  const [waterfallColorScheme, setWaterfallColorScheme] = useState('RdBu_r');

  const [fitResults, setFitResults] = useState<FitResultMap>({});
  const [fitFigureUrls, setFitFigureUrls] = useState<FitFigureUrlsState>(emptyFitFigureUrls);
  const [fitFiguresStale, setFitFiguresStale] = useState(false);
  const [fitSummaryMsg, setFitSummaryMsg] = useState(INITIAL_FIT_SUMMARY_MESSAGE);
  const [runFitsPending, setRunFitsPending] = useState(false);
  const [spectralFigurePending, setSpectralFigurePending] = useState(false);
  const [spectralFigureStatus, setSpectralFigureStatus] = useState(INITIAL_SPECTRAL_STATUS);
  const [vizStatusMsg, setVizStatusMsg] = useState('Extract files to begin.');

  // Derive getFileColor early so useFigureSettings can close over it.
  // (extractedFilenames/figureSettings are needed; figureSettings comes from useFigureSettings below)
  // To break the circular dependency we capture a stable ref updated by the hook.
  const getFileColorRef = useRef<(filename: string) => string>(() => '#1f77b4');
  const getFileColor = (filename: string) => getFileColorRef.current(filename);

  const {
    activeWaterfallFile,
    setActiveWaterfallFile,
    activeKineticsFile,
    setActiveKineticsFile,
    currentDataset,
    setCurrentDataset,
    integrationCache,
    fitRanges,
    setFitRanges,
    clearDatasetWorkflow,
    clearIntegrationWorkflow,
    resetForExtractedFiles,
    fetchDataset,
    integrateDatasetForFile,
  } = useDatasetWorkflow();

  const {
    folderInput,
    setFolderInput,
    currentFolderPath,
    foundSrsFiles,
    selectedFiles,
    applyFolderPending,
    applyFolder,
    selectAllFiles,
    toggleSelectedFile,
  } = useExtractionSource();

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

  const analysisCropRange = useMemo(
    () => resolveOptionalCropRange(cropStartWnInput, cropEndWnInput, defaultStartWn, defaultEndWn),
    [cropEndWnInput, cropStartWnInput, defaultEndWn, defaultStartWn],
  );


  const {
    figureSettings,
    setFigureSettings,
    buildFigureRenderSettings,
    handleGlobalImageSettingChange,
    handleFigurePanelChange,
    handleSpectralFigureChange,
  } = useFigureSettings();

  const getAutomaticFileColor = (
    filename: string,
    settings: FigureSettingsState = figureSettings,
  ) => {
    const idx = Math.max(0, extractedFilenames.indexOf(filename));
    const palette = sampleColors(
      settings.colorScheme || 'None',
      Math.max(extractedFilenames.length, 1),
    );
    return palette[idx % palette.length];
  };

  const getResolvedFileColor = (
    filename: string,
    settings: FigureSettingsState = figureSettings,
  ) => settings.manualColors?.[filename] || getAutomaticFileColor(filename, settings);

  // Keep the ref implementation fresh every render so runAllFits uses the
  // current automatic palette plus any manual per-file overrides.
  getFileColorRef.current = (filename: string) => getResolvedFileColor(filename);

  const fitFileColors = extractedFilenames.map((filename) => getResolvedFileColor(filename));
  const manualFitColorGrid = buildManualColorGrid(
    figureSettings.colorScheme || 'None',
    fitFileColors,
    64,
  );

  const currentDatasetFilename = currentDataset?.filename || null;

  const buildRunRecordSnapshot = useCallback((
    overrides: RunRecordSnapshotOverrides = {},
  ): RunRecordSnapshot => {
    const snapshotFitFigureUrls = overrides.fitFigureUrls ?? fitFigureUrls;
    const snapshotFitFiguresStale = overrides.fitFiguresStale ?? fitFiguresStale;
    const snapshotFitResults = overrides.fitResults ?? fitResults;
    const snapshotFigureSettings = overrides.figureSettings ?? figureSettings;
    const snapshotKeepRecord = overrides.keepRecord ?? keepRecord;

    return buildCurrentRunRecordSnapshot({
      keepRecord: snapshotKeepRecord,
      sourceFolder: currentFolderPath,
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
      figureSettings: snapshotFigureSettings,
      fitRanges,
      currentDatasetFilename,
      activeKineticsFile,
      fitFigureUrls: snapshotFitFigureUrls,
      fitFiguresStale: snapshotFitFiguresStale,
      fitResults: snapshotFitResults,
    });
  }, [
    activeKineticsFile,
    activeWaterfallFile,
    analysisCropRange,
    baselineMode,
    currentDatasetFilename,
    currentFolderPath,
    defaultEndWn,
    defaultStartWn,
    extractedFilenames,
    figureSettings,
    fitFigureUrls,
    fitFiguresStale,
    fitRanges,
    fitResults,
    globalIntegrationRange,
    keepRecord,
    mode,
    selectedFiles,
    waterfallColorScheme,
    waterfallGap,
    waterfallMaxLines,
    waterfallTimeRanges,
  ]);

  const saveRunRecord = (overrides: RunRecordSnapshotOverrides = {}) => {
    const snapshotKeepRecord = overrides.keepRecord ?? keepRecord;
    return queueSave(runId, snapshotKeepRecord, buildRunRecordSnapshot(overrides));
  };

  const clearRenderedFigures = (
    message = 'Run fitting to generate result images.',
    spectralMessage = INITIAL_SPECTRAL_STATUS,
  ) => {
    setFitFigureUrls(emptyFitFigureUrls());
    setFitFiguresStale(false);
    setFitSummaryMsg(message);
    setSpectralFigureStatus(spectralMessage);
  };

  const applyExtractedRunState = (
    nextRunId: string,
    nextKeepRecord: boolean,
    succeededFilenames: string[],
    nextFigureSettings: FigureSettingsState,
  ) => {
    setRunId(nextRunId);
    setKeepRecord(nextKeepRecord);
    setFigureSettings(nextFigureSettings);
    setExtractedFilenames(succeededFilenames);
    resetForExtractedFiles(succeededFilenames);
    setWaterfallTimeRanges({});
    setFitResults({});
    clearRenderedFigures(INITIAL_FIT_SUMMARY_MESSAGE, INITIAL_SPECTRAL_STATUS);
    setCurrentStep(succeededFilenames.length ? 2 : 1);
    setGlobalIntegrationRange([defaultStartWn, defaultEndWn]);
    setBaselineMode('linear');
    setWaterfallTimeRangeInput('');
    setWaterfallAppliedTimeRangeInput('');
  };

  const markFitsStale = (
    message = 'Fit ranges changed. Run fitting again to refresh the right-hand results.',
  ) => {
    const nextFitFiguresStale = hasRenderedFitFigures(fitFigureUrls);
    const nextFitResults: FitResultMap = {};
    setFitResults(nextFitResults);
    setFitFiguresStale(nextFitFiguresStale);
    setFitSummaryMsg(message);
    void saveRunRecord({
      fitFiguresStale: nextFitFiguresStale,
      fitResults: nextFitResults,
    });
  };

  const markFitFiguresStaleOnly = (
    message = 'Fit figure settings changed. Click Run All Fits to refresh the right-hand images.',
    nextFigureSettings?: FigureSettingsState,
  ) => {
    const nextFitFiguresStale = hasRenderedFitFigures(fitFigureUrls);
    setFitFiguresStale(nextFitFiguresStale);
    setFitSummaryMsg(message);
    void saveRunRecord({
      fitFiguresStale: nextFitFiguresStale,
      figureSettings: nextFigureSettings,
    });
  };

  const markSpectralFigureStale = (
    message = 'Waterfall view changed. Render Spectral Figure again to refresh the right-hand image.',
  ) => {
    if (fitFigureUrls.spectral) {
      setSpectralFigureStatus(message);
    }
  };

  const cleanupRun = async (targetRunId: string) => {
    if (!targetRunId) return;
    try {
      await workflowApi.cleanupRun({ run_id: targetRunId });
    } catch {
      // Ignore cleanup failures for temp runs.
    }
  };

  const selectWaterfallFile = async (filename: string, targetRunId = runId, force = false) => {
    if (!targetRunId) return;
    const loadSeq = waterfallLoadSeqRef.current + 1;
    waterfallLoadSeqRef.current = loadSeq;
    setActiveWaterfallFile(filename);
    setVizStatusMsg(`Loading ${filename}…`);
    markSpectralFigureStale(
      `Active waterfall file changed to ${filename}. Render Spectral Figure again to refresh the right-hand image.`,
    );

    try {
      const body = await fetchDataset(filename, targetRunId, analysisCropRange, force);
      if (loadSeq !== waterfallLoadSeqRef.current) return;
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
      if (loadSeq !== waterfallLoadSeqRef.current) return;
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
      await integrateDatasetForFile({
        filename,
        force,
        targetRunId,
        integrationRange: globalIntegrationRange,
        baselineMode,
        cropRange: analysisCropRange,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to integrate ${filename}`));
    }
  };

  const handleApplyFolder = async () => {
    try {
      const body = await applyFolder();
      toast.success(`Found ${body.files.length} SRS files.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to scan folder'));
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
      const body = await workflowApi.extractAll({
        folder_path: currentFolderPath,
        files: selectedFiles,
        mode,
        start: defaultStartWn,
        end: defaultEndWn,
        keep_record: keepRecord,
      });

      if (previousRunId && !previousKeepRecord) {
        void cleanupRun(previousRunId);
      }

      const nextRunId = body.run_id;
      const nextFigureSettings: FigureSettingsState = {
        ...figureSettings,
        manualColors: {},
      };
      applyExtractedRunState(
        nextRunId,
        Boolean(body.keep_record),
        body.succeeded,
        nextFigureSettings,
      );

      if (body.failed && Object.keys(body.failed).length > 0) {
        toast.warning(`Some files failed: ${Object.keys(body.failed).length}`);
      }

      if (body.succeeded.length) {
        await selectWaterfallFile(body.succeeded[0], nextRunId, true);
        await selectKineticsFile(body.succeeded[0], true, nextRunId);
      }

      setVizStatusMsg(
        `Extracted ${body.succeeded.length} file(s). Select a file above to view its waterfall.`,
      );
      toast.success(`Extracted ${body.succeeded.length} file(s).`);
      // Use queueSave manually here to guarantee nextRunId gets saved via snapshot
      await queueSave(
        nextRunId,
        Boolean(body.keep_record),
        buildInitialRunRecordSnapshot({
          keepRecord: Boolean(body.keep_record),
          sourceFolder: currentFolderPath,
          selectedFiles,
          extractedFilenames: body.succeeded,
          mode,
          defaultStartWn,
          defaultEndWn,
          analysisCropRange,
          waterfallMaxLines,
          figureSettings: nextFigureSettings,
        }),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Extraction failed'));
      setVizStatusMsg(`Extraction error: ${getErrorMessage(error, 'Extraction failed')}`);
    } finally {
      setExtractPending(false);
    }
  };

  const handleVisibleTimeRangeChange = (filename: string, range: NumericRange) => {
    const previous = waterfallTimeRanges[filename];
    const rangeChanged =
      !previous || previous.start !== range.start || previous.end !== range.end;
    setWaterfallTimeRanges((prev) => {
      const current = prev[filename];
      if (current && current.start === range.start && current.end === range.end) {
        return prev;
      }
      return { ...prev, [filename]: range };
    });
    if (activeWaterfallFile === filename) {
      const text = formatRangeInput(range.start, range.end);
      if (!isEditingWaterfallTimeRangeRef.current) {
        setWaterfallTimeRangeInput((prev) => (prev === text ? prev : text));
      }
      if (rangeChanged) {
        markSpectralFigureStale();
      }
    }
  };

  const handleIntegrationRangeChange = (range: [number, number], shouldDebounce: boolean) => {
    setGlobalIntegrationRange(range);
    void shouldDebounce;
  };

  const handleCropInputChange = (bound: 'start' | 'end', value: string) => {
    if (bound === 'start') {
      setCropStartWnInput(value);
    } else {
      setCropEndWnInput(value);
    }

    clearDatasetWorkflow();
    markFitsStale('Crop range changed. Run fitting again after re-integrating to refresh the right-hand results.');
    markSpectralFigureStale('Crop range changed. Render Spectral Figure again after reloading the dataset.');
  };

  const handleBaselineModeChange = (value: 'none' | 'linear') => {
    setBaselineMode(value);
  };

  const handleIntegrate = async () => {
    const targetFile = activeKineticsFile || activeWaterfallFile;
    if (!targetFile) return;
    setCurrentStep(3);
    markFitsStale(
      'Integration settings changed. Run fitting again to refresh the right-hand results.',
    );
    clearIntegrationWorkflow();
    await selectKineticsFile(targetFile, true);
  };

  const handleFitRangeChange = async (filename: string, range: NumericRange) => {
    let entry = integrationCache[filename];
    if (!entry) {
      entry = await integrateDatasetForFile({
        filename,
        targetRunId: runId,
        integrationRange: globalIntegrationRange,
        baselineMode,
        cropRange: analysisCropRange,
      });
    }

    const axis = Array.from(new Set(entry.time.slice().sort((a, b) => a - b)));
    const snapped = getSnappedRange(axis, range.start, range.end);
    setFitRanges((prev) => ({ ...prev, [filename]: snapped }));
    if (activeKineticsFile !== filename) {
      setActiveKineticsFile(filename);
    }
    markFitsStale();
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

  const handleWaterfallGapChange = (value: number) => {
    setWaterfallGap(value);
    markSpectralFigureStale();
  };

  const handleWaterfallMaxLinesChange = (value: number) => {
    setWaterfallMaxLines(value);
    markSpectralFigureStale();
  };

  const handleWaterfallTimeRangeInputChange = (value: string) => {
    setWaterfallTimeRangeInput(value);
  };

  const handleWaterfallTimeRangeInputFocus = () => {
    isEditingWaterfallTimeRangeRef.current = true;
  };

  const handleWaterfallTimeRangeInputCommit = () => {
    isEditingWaterfallTimeRangeRef.current = false;
    setWaterfallAppliedTimeRangeInput(waterfallTimeRangeInput);
    markSpectralFigureStale();
  };

  const handleWaterfallColorSchemeChange = (value: string) => {
    setWaterfallColorScheme(value);
    markSpectralFigureStale();
  };

  const handleSpectralFigureInputChange = (
    key: keyof SpectralFigureSettings,
    value: string,
  ) => {
    handleSpectralFigureChange(key, value);
    markSpectralFigureStale('Spectral figure settings changed. Render Spectral Figure again to refresh the image.');
  };

  const handleFitFigurePanelChange = (
    panel: 'overlay' | 'normalized',
    key: 'xlabel' | 'ylabel' | 'xRangeInput' | 'yRangeInput' | 'showLabels' | 'labelOffsetInput',
    value: string | boolean,
  ) => {
    handleFigurePanelChange(panel, key, value);
    markFitsStale('Fit figure settings changed. Click Run All Fits to refresh the right-hand images.');
  };

  const handleFitFigureColorSchemeChange = (value: string) => {
    const nextFigureSettings: FigureSettingsState = {
      ...figureSettings,
      colorScheme: value,
      manualColors: {},
    };
    setFigureSettings(nextFigureSettings);
    markFitFiguresStaleOnly(
      'Fit figure colors changed. Click Run All Fits to refresh the right-hand images.',
      nextFigureSettings,
    );
  };

  const handleManualFitColorChange = (filename: string, color: string) => {
    const targetKey = colorKey(color);
    if (!filename || !targetKey) return;

    const currentKey = colorKey(getResolvedFileColor(filename));
    if (currentKey === targetKey) return;

    const colorInUse = extractedFilenames.some(
      (otherFilename) =>
        otherFilename !== filename && colorKey(getResolvedFileColor(otherFilename)) === targetKey,
    );
    if (colorInUse) {
      toast.info('That color is already assigned.');
      return;
    }

    const nextManualColors = { ...figureSettings.manualColors, [filename]: color };
    if (colorKey(getAutomaticFileColor(filename)) === targetKey) {
      delete nextManualColors[filename];
    }

    const nextFigureSettings: FigureSettingsState = {
      ...figureSettings,
      manualColors: nextManualColors,
    };
    setFigureSettings(nextFigureSettings);
    markFitFiguresStaleOnly(
      'Manual colors changed. Click Run All Fits to refresh the right-hand images.',
      nextFigureSettings,
    );
  };

  const handleGlobalImageParameterChange = (
    key: keyof GlobalImageSettings,
    value: number | boolean,
  ) => {
    handleGlobalImageSettingChange(key, value);
    markFitsStale('Image parameters changed. Click Run All Fits to refresh the right-hand images.');
    markSpectralFigureStale('Image parameters changed. Render Spectral Figure again to refresh the image.');
  };

  const renderSpectralFigure = async () => {
    const filename = activeWaterfallFile;
    if (!runId || !filename) {
      toast.error('Select a waterfall file before rendering the spectral figure.');
      return;
    }

    setSpectralFigurePending(true);
    setSpectralFigureStatus(`Rendering spectral figure for ${filename}…`);

    try {
      const dataset = currentDataset?.filename === filename
        ? currentDataset
        : await fetchDataset(filename, runId, analysisCropRange);
      const { traces, visibleRange } = buildWaterfallTracePayload(
        dataset,
        waterfallGap,
        waterfallMaxLines,
        waterfallAppliedTimeRangeInput,
        waterfallColorScheme,
      );
      const renderSettings = buildFigureRenderSettings();
      const settings = renderSettings.spectral;
      const body = await workflowApi.renderSpectralFigure({
        run_id: runId,
        filename,
        crop_range: analysisCropRange,
        traces,
        heatmap: {
          color_scale: resolveHeatmapColorScale(waterfallColorScheme),
          time_range: [visibleRange.start, visibleRange.end],
          crop_range: analysisCropRange,
          zmin: settings.zlim ? settings.zlim[0] : null,
          zmax: settings.zlim ? settings.zlim[1] : null,
        },
        figure_settings: {
          ...settings,
          global: renderSettings.global,
          reverse_wavenumber_axis: figureSettings.global.reverseWavenumberAxis,
          title: settings.title || `SRS Waterfall — ${filename}`,
          ...(settings.title ? {} : { title: '' }),
        },
      });
      const nextFitFigureUrls = withSpectralFigureUrls(
        fitFigureUrls,
        body.spectral_url,
        body.spectral_heatmap_url,
      );
      setFitFigureUrls(nextFitFigureUrls);
      setSpectralFigureStatus(
        `Rendered spectral figure for ${filename} (${formatRangeInput(visibleRange.start, visibleRange.end)}).`,
      );
      await saveRunRecord({ fitFigureUrls: nextFitFigureUrls });
    } catch (error) {
      setSpectralFigureStatus(getErrorMessage(error, 'Failed to render spectral figure.'));
      toast.error(getErrorMessage(error, 'Failed to render spectral figure'));
    } finally {
      setSpectralFigurePending(false);
    }
  };

  const runAllFits = async () => {
    if (!runId || !extractedFilenames.length) return;

    setRunFitsPending(true);
    setFitSummaryMsg(`Running fits for ${extractedFilenames.length} file(s)…`);

    const {
      results: nextResults,
      series: successfulSeriesInput,
      successCount,
      failureCount,
    } = await runFitsForFiles({
      filenames: extractedFilenames,
      fitRanges,
      integrateFile: (filename) =>
        integrateDatasetForFile({
          filename,
          targetRunId: runId,
          integrationRange: globalIntegrationRange,
          baselineMode,
          cropRange: analysisCropRange,
        }),
      fitKinetics: workflowApi.fitKinetics,
      getErrorMessage,
    });

    setFitResults(nextResults);

    const successfulPayload = buildSuccessfulSeriesPayload(successfulSeriesInput, getFileColor);
    let nextFitFigureUrls = clearFitComparisonUrls(fitFigureUrls);

    try {
      if (successfulPayload.length) {
        const body = await workflowApi.renderFitFigures({
          run_id: runId,
          series: successfulPayload,
          figure_settings: buildFigureRenderSettings(),
        });
        nextFitFigureUrls = withFitComparisonUrls(
          nextFitFigureUrls,
          body.overlay_url,
          body.normalized_url,
        );
        setFitFigureUrls(nextFitFigureUrls);
        setFitFiguresStale(false);
        setFitSummaryMsg(buildFitSummaryMessage(successCount, failureCount));
      } else {
        setFitFigureUrls(nextFitFigureUrls);
        setFitFiguresStale(false);
        setFitSummaryMsg(buildFitSummaryMessage(0, failureCount));
      }
    } catch (error) {
      setFitFigureUrls(nextFitFigureUrls);
      setFitFiguresStale(false);
      setFitSummaryMsg(
        `Fits completed, but figure rendering failed: ${getErrorMessage(error, 'render failed')}`,
      );
    } finally {
      await saveRunRecord({
        fitFigureUrls: nextFitFigureUrls,
        fitFiguresStale: false,
        fitResults: nextResults,
      });
      setRunFitsPending(false);
    }
  };

  useEffect(() => {
    if (!activeWaterfallFile) {
      setWaterfallTimeRangeInput('');
      setWaterfallAppliedTimeRangeInput('');
      return;
    }
    const stored = waterfallTimeRanges[activeWaterfallFile];
    if (stored) {
      const text = formatRangeInput(stored.start, stored.end);
      if (!isEditingWaterfallTimeRangeRef.current) {
        setWaterfallTimeRangeInput(text);
      }
      setWaterfallAppliedTimeRangeInput(text);
    } else {
      if (!isEditingWaterfallTimeRangeRef.current) {
        setWaterfallTimeRangeInput('');
      }
      setWaterfallAppliedTimeRangeInput('');
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

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
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
    fitFiguresStale,
    waterfallColorScheme,
    waterfallGap,
    waterfallMaxLines,
    waterfallAppliedTimeRangeInput,
    waterfallTimeRanges,
    baselineMode,
    buildRunRecordSnapshot,
  ]);

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
            void saveRunRecord({ keepRecord: value });
          }}
          folderInput={folderInput}
          onFolderInputChange={setFolderInput}
          foundSrsFiles={foundSrsFiles}
          selectedFiles={selectedFiles}
          onToggleSelectAll={selectAllFiles}
          onToggleFile={toggleSelectedFile}
          applyFolderPending={applyFolderPending}
          onApplyFolder={handleApplyFolder}
          mode={mode}
          onModeChange={setMode}
          defaultStartWn={defaultStartWn}
          onDefaultStartWnChange={setDefaultStartWn}
          defaultEndWn={defaultEndWn}
          onDefaultEndWnChange={setDefaultEndWn}
          cropStartWnInput={cropStartWnInput}
          onCropStartWnInputChange={(value) => handleCropInputChange('start', value)}
          cropEndWnInput={cropEndWnInput}
          onCropEndWnInputChange={(value) => handleCropInputChange('end', value)}
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
          onFigureColorSchemeChange={handleFitFigureColorSchemeChange}
          manualFitColorGrid={manualFitColorGrid}
          fitFileColors={fitFileColors}
          onManualFitColorChange={handleManualFitColorChange}
          onFigurePanelChange={handleFitFigurePanelChange}
          onGlobalImageSettingChange={handleGlobalImageParameterChange}
          onSpectralFigureChange={handleSpectralFigureInputChange}
          onRenderSpectralFigure={() => void renderSpectralFigure()}
          spectralFigurePending={spectralFigurePending}
          spectralFigureStatus={spectralFigureStatus}
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
          onWaterfallGapChange={handleWaterfallGapChange}
          waterfallMaxLines={waterfallMaxLines}
          onWaterfallMaxLinesChange={handleWaterfallMaxLinesChange}
          waterfallTimeRangeInput={waterfallTimeRangeInput}
          waterfallAppliedTimeRangeInput={waterfallAppliedTimeRangeInput}
          onWaterfallTimeRangeInputChange={handleWaterfallTimeRangeInputChange}
          onWaterfallTimeRangeInputFocus={handleWaterfallTimeRangeInputFocus}
          onWaterfallTimeRangeInputCommit={handleWaterfallTimeRangeInputCommit}
          waterfallColorScheme={waterfallColorScheme}
          onWaterfallColorSchemeChange={handleWaterfallColorSchemeChange}
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
          fitFiguresStale={fitFiguresStale}
          spectralFigureStatus={spectralFigureStatus}
        />
      </div>
    </div>
  );
}
