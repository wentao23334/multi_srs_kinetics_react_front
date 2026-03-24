import { useEffect, useState, type ComponentType } from 'react';

type PlotComponent = ComponentType<any>;
interface LoadedPlot {
  Component: PlotComponent;
}

interface SafePlotProps {
  fallback?: React.ReactNode;
  errorFallback?: (message: string) => React.ReactNode;
  [key: string]: unknown;
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
        const createPlotlyComponent = createPlotlyModule.default || createPlotlyModule;
        setLoadedPlot({
          Component: createPlotlyComponent(plotly) as PlotComponent,
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

  return <loadedPlot.Component {...plotProps} />;
}
