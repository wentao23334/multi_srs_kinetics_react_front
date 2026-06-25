import { useCallback, useState } from 'react';
import {
  DEFAULT_FIGURE_SETTINGS,
  parseOffsetInput,
  parseRangeInput,
} from '../lib/workflowUtils';
import type { FigureRenderSettings } from '../types/api';
import type {
  FigurePanelSettings,
  FigureSettingsState,
  GlobalImageSettings,
  SpectralFigureSettings,
} from '../types/workflow';

type FigurePanelKey = 'overlay' | 'normalized';

function parseRangeTuple(value: string): [number, number] | null {
  const range = parseRangeInput(value);
  return range ? [range.start, range.end] : null;
}

export function useFigureSettings() {
  const [figureSettings, setFigureSettings] = useState<FigureSettingsState>(DEFAULT_FIGURE_SETTINGS);

  const buildFigureRenderSettings = useCallback(
    (settings: FigureSettingsState = figureSettings): FigureRenderSettings => ({
      global: {
        dpi: Number.isFinite(settings.global.dpi) && settings.global.dpi > 0 ? settings.global.dpi : 300,
        width_cm: Number.isFinite(settings.global.widthCm) && settings.global.widthCm > 0 ? settings.global.widthCm : 10,
        height_cm: Number.isFinite(settings.global.heightCm) && settings.global.heightCm > 0 ? settings.global.heightCm : 8,
        reverse_wavenumber_axis: settings.global.reverseWavenumberAxis,
      },
      color_scheme: settings.colorScheme,
      overlay: {
        xlabel: settings.overlay.xlabel.trim() || 'Time / Potential',
        ylabel: settings.overlay.ylabel.trim() || 'Peak Area',
        xlim: parseRangeTuple(settings.overlay.xRangeInput),
        ylim: parseRangeTuple(settings.overlay.yRangeInput),
        show_labels: settings.overlay.showLabels,
        label_offset: parseOffsetInput(settings.overlay.labelOffsetInput),
      },
      normalized: {
        xlabel: settings.normalized.xlabel.trim() || 'Time / Potential',
        ylabel: settings.normalized.ylabel.trim() || 'Normalized Peak Area',
        xlim: parseRangeTuple(settings.normalized.xRangeInput),
        ylim: parseRangeTuple(settings.normalized.yRangeInput),
        show_labels: settings.normalized.showLabels,
        label_offset: parseOffsetInput(settings.normalized.labelOffsetInput),
      },
      spectral: {
        title: settings.spectral.title.trim(),
        xlabel: settings.spectral.xlabel.trim() || 'Wavenumber (cm$^{-1}$)',
        ylabel: settings.spectral.ylabel.trim() || 'Absorbance (a.u.)',
        xlim: parseRangeTuple(settings.spectral.xRangeInput),
        ylim: parseRangeTuple(settings.spectral.yRangeInput),
        zlim: parseRangeTuple(settings.spectral.zRangeInput),
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

  const handleSpectralFigureChange = useCallback(
    (key: keyof SpectralFigureSettings, value: string) => {
      setFigureSettings((prev) => ({
        ...prev,
        spectral: { ...prev.spectral, [key]: value },
      }));
    },
    [],
  );

  const handleGlobalImageSettingChange = useCallback(
    (key: keyof GlobalImageSettings, value: number | boolean) => {
      setFigureSettings((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          [key]: value,
        },
      }));
    },
    [],
  );

  return {
    figureSettings,
    setFigureSettings,
    buildFigureRenderSettings,
    handleGlobalImageSettingChange,
    handleFigurePanelChange,
    handleSpectralFigureChange,
  };
}
