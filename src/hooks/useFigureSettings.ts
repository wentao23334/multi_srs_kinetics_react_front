import { useCallback, useState } from 'react';
import {
  DEFAULT_FIGURE_SETTINGS,
  parseOffsetInput,
  parseRangeInput,
} from '../lib/workflowUtils';
import type {
  FigurePanelSettings,
  FigureSettingsState,
  SpectralFigureSettings,
} from '../types/workflow';

type FigurePanelKey = 'overlay' | 'normalized';

export function useFigureSettings() {
  const [figureSettings, setFigureSettings] = useState<FigureSettingsState>(DEFAULT_FIGURE_SETTINGS);

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
      spectral: {
        title: settings.spectral.title.trim() || 'SRS Waterfall',
        xlabel: settings.spectral.xlabel.trim() || 'Wavenumber (cm⁻¹)',
        ylabel: settings.spectral.ylabel.trim() || 'Intensity + Offset',
        xlim: (() => {
          const r = parseRangeInput(settings.spectral.xRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
        ylim: (() => {
          const r = parseRangeInput(settings.spectral.yRangeInput);
          return r ? [r.start, r.end] : null;
        })(),
      },
    }),
    [figureSettings],
  );

  const handleFigurePanelChange = useCallback(
    (panel: FigurePanelKey, key: keyof FigurePanelSettings, value: string | boolean) => {
      const nextSettings: FigureSettingsState = {
        ...figureSettings,
        [panel]: { ...figureSettings[panel], [key]: value },
      };
      setFigureSettings(nextSettings);
    },
    [figureSettings],
  );

  const handleFigureColorSchemeChange = useCallback(
    (value: string) => {
      const nextSettings: FigureSettingsState = { ...figureSettings, colorScheme: value };
      setFigureSettings(nextSettings);
    },
    [figureSettings],
  );

  const handleSpectralFigureChange = useCallback(
    (key: keyof SpectralFigureSettings, value: string) => {
      setFigureSettings((prev) => ({
        ...prev,
        spectral: { ...prev.spectral, [key]: value },
      }));
    },
    [],
  );

  return {
    figureSettings,
    setFigureSettings,
    buildFigureRenderSettings,
    handleFigurePanelChange,
    handleFigureColorSchemeChange,
    handleSpectralFigureChange,
  };
}
