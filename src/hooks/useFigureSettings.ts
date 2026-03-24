import { useCallback, useRef, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import {
  DEFAULT_FIGURE_SETTINGS,
  buildSuccessfulSeriesPayload,
  parseOffsetInput,
  parseRangeInput,
} from '../lib/workflowUtils';
import type { FigurePanelSettings, FigureSettingsState, FitResultMap } from '../types/workflow';

interface UseFigureSettingsOptions {
  runId: string;
  extractedFilenames: string[];
  fitResults: FitResultMap;
  getFileColor: (filename: string) => string;
  onFitSummaryMsg: (msg: string) => void;
  onFitFigureUrls: (urls: { overlay: string; normalized: string }) => void;
}

export function useFigureSettings({
  runId,
  extractedFilenames,
  fitResults,
  getFileColor,
  onFitSummaryMsg,
  onFitFigureUrls,
}: UseFigureSettingsOptions) {
  const [figureSettings, setFigureSettings] = useState<FigureSettingsState>(DEFAULT_FIGURE_SETTINGS);
  const figureDebounceRef = useRef<number | null>(null);

  const buildFigureRenderSettings = useCallback(
    (settings: FigureSettingsState = figureSettings) => ({
      color_scheme: settings.colorScheme,
      overlay: {
        xlabel: settings.overlay.xlabel.trim() || 'Time / Potential',
        ylabel: settings.overlay.ylabel.trim() || 'Peak Area',
        xlim: (() => {
          const r = parseRangeInput(settings.overlay.xRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
        ylim: (() => {
          const r = parseRangeInput(settings.overlay.yRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
        show_labels: settings.overlay.showLabels,
        label_offset: parseOffsetInput(settings.overlay.labelOffsetInput),
      },
      normalized: {
        xlabel: settings.normalized.xlabel.trim() || 'Time / Potential',
        ylabel: settings.normalized.ylabel.trim() || 'Normalized Peak Area',
        xlim: (() => {
          const r = parseRangeInput(settings.normalized.xRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
        ylim: (() => {
          const r = parseRangeInput(settings.normalized.yRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
        show_labels: settings.normalized.showLabels,
        label_offset: parseOffsetInput(settings.normalized.labelOffsetInput),
      },
    }),
    [figureSettings],
  );

  const refreshFigures = useCallback(
    async (nextSettings: FigureSettingsState) => {
      if (!runId) return;
      const payload = buildSuccessfulSeriesPayload(extractedFilenames, fitResults, getFileColor);
      if (!payload.length) return;

      onFitSummaryMsg('Refreshing fit figures…');
      try {
        const response = await apiClient.post('/render-fit-figures', {
          run_id: runId,
          series: payload,
          figure_settings: buildFigureRenderSettings(nextSettings),
        });
        onFitFigureUrls({
          overlay: response.data.overlay_url,
          normalized: response.data.normalized_url,
        });
        onFitSummaryMsg('Updated figure settings applied to the right-hand images.');
      } catch {
        onFitFigureUrls({ overlay: '', normalized: '' });
        onFitSummaryMsg('Figure refresh failed.');
      }
    },
    [runId, extractedFilenames, fitResults, getFileColor, buildFigureRenderSettings, onFitSummaryMsg, onFitFigureUrls],
  );

  /** Debounced — safe to call on every keystroke in text inputs. */
  const handleFigurePanelChange = useCallback(
    (panel: 'overlay' | 'normalized', key: keyof FigurePanelSettings, value: string | boolean) => {
      const nextSettings: FigureSettingsState = {
        ...figureSettings,
        [panel]: { ...figureSettings[panel], [key]: value },
      };
      setFigureSettings(nextSettings);

      if (figureDebounceRef.current) {
        window.clearTimeout(figureDebounceRef.current);
      }
      figureDebounceRef.current = window.setTimeout(() => {
        void refreshFigures(nextSettings);
      }, 400);
    },
    [figureSettings, refreshFigures],
  );

  /** Immediately refresh on colour scheme change (dropdown selection, not typing). */
  const handleFigureColorSchemeChange = useCallback(
    (value: string) => {
      const nextSettings: FigureSettingsState = { ...figureSettings, colorScheme: value };
      setFigureSettings(nextSettings);
      void refreshFigures(nextSettings);
    },
    [figureSettings, refreshFigures],
  );

  return {
    figureSettings,
    setFigureSettings,
    buildFigureRenderSettings,
    refreshFigures,
    handleFigurePanelChange,
    handleFigureColorSchemeChange,
  };
}
