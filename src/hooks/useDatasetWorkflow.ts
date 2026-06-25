import { useState } from 'react';
import { workflowApi } from '../lib/workflowApi';
import type { GetDatasetResponse } from '../types/api';
import type {
  DatasetCache,
  FitRangeMap,
  IntegrationCache,
  IntegrationCacheEntry,
} from '../types/workflow';

const DATASET_CACHE_LIMIT = 2;
const INTEGRATION_CACHE_LIMIT = 3;

function upsertLimitedCache<T>(prev: Record<string, T>, key: string, value: T, limit: number) {
  const next = { ...prev };
  delete next[key];
  next[key] = value;
  const keys = Object.keys(next);
  while (keys.length > limit) {
    const oldestKey = keys.shift();
    if (!oldestKey) break;
    delete next[oldestKey];
  }
  return next;
}

export function useDatasetWorkflow() {
  const [activeWaterfallFile, setActiveWaterfallFile] = useState<string | null>(null);
  const [activeKineticsFile, setActiveKineticsFile] = useState<string | null>(null);
  const [currentDataset, setCurrentDataset] = useState<GetDatasetResponse | null>(null);
  const [datasetCache, setDatasetCache] = useState<DatasetCache>({});
  const [integrationCache, setIntegrationCache] = useState<IntegrationCache>({});
  const [fitRanges, setFitRanges] = useState<FitRangeMap>({});

  const clearDatasetWorkflow = () => {
    setDatasetCache({});
    setIntegrationCache({});
    setFitRanges({});
    setCurrentDataset(null);
  };

  const clearIntegrationWorkflow = () => {
    setIntegrationCache({});
    setFitRanges({});
  };

  const resetForExtractedFiles = (filenames: string[]) => {
    clearDatasetWorkflow();
    setActiveWaterfallFile(filenames[0] ?? null);
    setActiveKineticsFile(filenames[0] ?? null);
  };

  const fetchDataset = async (
    filename: string,
    targetRunId: string,
    cropRange: [number, number] | null,
    force = false,
  ) => {
    if (!targetRunId) throw new Error('run_id is missing');
    if (!force && datasetCache[filename]) return datasetCache[filename];

    const body = await workflowApi.getDataset({
      run_id: targetRunId,
      filename,
      crop_range: cropRange,
    });
    setDatasetCache((prev) => upsertLimitedCache(prev, filename, body, DATASET_CACHE_LIMIT));
    return body;
  };

  const integrateDatasetForFile = async ({
    filename,
    targetRunId,
    force = false,
    integrationRange,
    baselineMode,
    cropRange,
  }: {
    filename: string;
    targetRunId: string;
    force?: boolean;
    integrationRange: [number, number];
    baselineMode: 'none' | 'linear';
    cropRange: [number, number] | null;
  }) => {
    if (!targetRunId) throw new Error('run_id is missing');
    if (!force && integrationCache[filename]) return integrationCache[filename];

    const body = await workflowApi.integrate({
      run_id: targetRunId,
      filename,
      start: integrationRange[0],
      end: integrationRange[1],
      baseline_mode: baselineMode,
      crop_range: cropRange,
    });
    const entry: IntegrationCacheEntry = { ...body, filename };
    setIntegrationCache((prev) => upsertLimitedCache(prev, filename, entry, INTEGRATION_CACHE_LIMIT));

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

  return {
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
  };
}
