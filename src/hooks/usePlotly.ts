import { useEffect, useState } from 'react';

export function usePlotly() {
  const [plotly, setPlotly] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlotly() {
      try {
        const module = await import('plotly.js/dist/plotly');
        if (cancelled) return;
        setPlotly(module.default ?? module);
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
