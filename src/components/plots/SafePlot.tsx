import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { PlotParams } from 'react-plotly.js';

type PlotComponent = ComponentType<PlotParams>;
type PlotFactory = (plotly: unknown) => PlotComponent;
interface LoadedPlot {
  Component: PlotComponent;
}

interface SafePlotProps extends Partial<PlotParams> {
  fallback?: ReactNode;
  errorFallback?: (message: string) => ReactNode;
}

export function SafePlot({
  fallback,
  errorFallback,
  ...plotProps
}: SafePlotProps) {
  const [loadedPlot, setLoadedPlot] = useState<LoadedPlot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlot() {
      try {
        const [PlotlyModule, createPlotlyModule] = await Promise.all([
          // @ts-expect-error No type declaration for the dist file
          import('plotly.js/dist/plotly'),
          import('react-plotly.js/factory'),
        ]);

        if (cancelled) return;

        const plotly = (PlotlyModule as { default?: unknown }).default ?? PlotlyModule;
        const plotFactoryModule = createPlotlyModule as unknown as
          | PlotFactory
          | { default?: PlotFactory };
        const createPlotlyComponent =
          typeof plotFactoryModule === 'function'
            ? plotFactoryModule
            : plotFactoryModule.default;
        if (!createPlotlyComponent) {
          throw new Error('Failed to initialize Plotly component factory');
        }
        setLoadedPlot({
          Component: createPlotlyComponent(plotly),
        });
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : 'Failed to load plotting module';
        setErrorMessage(message);
      }
    }

    loadPlot();

    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMessage) {
    return errorFallback ? errorFallback(errorMessage) : null;
  }

  if (!loadedPlot) {
    return <>{fallback ?? null}</>;
  }

  return <loadedPlot.Component {...(plotProps as PlotParams)} />;
}
