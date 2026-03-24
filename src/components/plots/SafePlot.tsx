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
        const [{ default: createPlotComponent }, plotlyModule] = await Promise.all([
          import('react-plotly.js/factory'),
          import('plotly.js-basic-dist'),
        ]);

        if (cancelled) return;

        const plotly = (plotlyModule as { default?: unknown }).default ?? plotlyModule;
        setLoadedPlot({
          Component: createPlotComponent(plotly) as PlotComponent,
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
