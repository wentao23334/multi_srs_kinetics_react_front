import { useEffect, useState } from 'react';

export type PlotlyApi = {
  newPlot: (
    root: HTMLDivElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<unknown>;
  react: (
    root: HTMLDivElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<unknown>;
  purge?: (root: HTMLDivElement) => void;
  Plots?: {
    resize?: (root: HTMLDivElement) => Promise<unknown> | void;
  };
};

function resolvePlotlyApi(module: unknown): PlotlyApi {
  const candidate =
    typeof module === 'object' && module !== null && 'default' in module
      ? (module as { default?: unknown }).default ?? module
      : module;
  return candidate as PlotlyApi;
}

export function usePlotly() {
  const [plotly, setPlotly] = useState<PlotlyApi | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlotly() {
      try {
        // @ts-expect-error Types are not exposed for the specific dist file
        const module = await import('plotly.js/dist/plotly-basic');
        if (cancelled) return;
        setPlotly(resolvePlotlyApi(module));
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Failed to load plotting module';
        setErrorMessage(message);
      }
    }

    loadPlotly();

    return () => {
      cancelled = true;
    };
  }, []);

  return { plotly, errorMessage };
}
