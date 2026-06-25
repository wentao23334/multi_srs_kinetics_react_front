import axios from 'axios';
import { apiClient } from './apiClient';
import type {
  CleanupRunRequest,
  CleanupRunResponse,
  ExtractAllRequest,
  ExtractAllResponse,
  FitKineticsRequest,
  FitKineticsResponse,
  GetDatasetRequest,
  GetDatasetResponse,
  IntegrateRequest,
  IntegrateResponse,
  ListFolderRequest,
  ListFolderResponse,
  RenderFitFiguresRequest,
  RenderFitFiguresResponse,
  RenderSpectralFigureRequest,
  RenderSpectralFigureResponse,
  SaveRunRecordRequest,
  SaveRunRecordResponse,
} from '../types/api';

async function postData<Response, Request>(url: string, payload: Request): Promise<Response> {
  const response = await apiClient.post<Response>(url, payload);
  return response.data;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const workflowApi = {
  cleanupRun: (payload: CleanupRunRequest) =>
    postData<CleanupRunResponse, CleanupRunRequest>('/cleanup', payload),

  listFolder: (payload: ListFolderRequest) =>
    postData<ListFolderResponse, ListFolderRequest>('/list_folder', payload),

  extractAll: (payload: ExtractAllRequest) =>
    postData<ExtractAllResponse, ExtractAllRequest>('/extract_all', payload),

  getDataset: (payload: GetDatasetRequest) =>
    postData<GetDatasetResponse, GetDatasetRequest>('/get_dataset', payload),

  integrate: (payload: IntegrateRequest) =>
    postData<IntegrateResponse, IntegrateRequest>('/integrate', payload),

  fitKinetics: (payload: FitKineticsRequest) =>
    postData<FitKineticsResponse, FitKineticsRequest>('/fit-kinetics', payload),

  renderFitFigures: (payload: RenderFitFiguresRequest) =>
    postData<RenderFitFiguresResponse, RenderFitFiguresRequest>('/render-fit-figures', payload),

  renderSpectralFigure: (payload: RenderSpectralFigureRequest) =>
    postData<RenderSpectralFigureResponse, RenderSpectralFigureRequest>(
      '/render-spectral-figure',
      payload,
    ),

  saveRunRecord: (payload: SaveRunRecordRequest) =>
    postData<SaveRunRecordResponse, SaveRunRecordRequest>('/save_run_record', payload),
};
