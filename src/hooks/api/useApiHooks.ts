import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import type {
  ListFolderRequest,
  ListFolderResponse,
  ExtractAllRequest,
  ExtractAllResponse,
  GetDatasetRequest,
  GetDatasetResponse,
  IntegrateRequest,
  IntegrateResponse,
  FitKineticsRequest,
  FitKineticsResponse,
  RenderFitFiguresRequest,
  RenderFitFiguresResponse,
} from '../../types/api';

// 1. Hook for Listing Folders
export const useListFolder = () => {
  return useMutation({
    mutationFn: async (data: ListFolderRequest) => {
      const response = await apiClient.post<ListFolderResponse>('/list_folder', data);
      return response.data;
    },
  });
};

// 2. Hook for Extraction
export const useExtractAll = () => {
  return useMutation({
    mutationFn: async (data: ExtractAllRequest) => {
      const response = await apiClient.post<ExtractAllResponse>('/extract_all', data);
      return response.data;
    },
  });
};

// 3. Hook for fetching a dataset
export const useGetDataset = () => {
  return useMutation({
    mutationFn: async (data: GetDatasetRequest) => {
      const response = await apiClient.post<GetDatasetResponse>('/get_dataset', data);
      return response.data;
    },
  });
};

// 4. Hook for Integration
export const useIntegrate = () => {
  return useMutation({
    mutationFn: async (data: IntegrateRequest) => {
      // Integration bounds POST
      const response = await apiClient.post<IntegrateResponse>('/integrate', data);
      return response.data;
    },
  });
};

// 5. Hook for Fitting
export const useFitKinetics = () => {
  return useMutation({
    mutationFn: async (data: FitKineticsRequest) => {
      const response = await apiClient.post<FitKineticsResponse>('/fit-kinetics', data);
      return response.data;
    },
  });
};

// 6. Hook for Generating Figures
export const useRenderFitFigures = () => {
  return useMutation({
    mutationFn: async (data: RenderFitFiguresRequest) => {
      const response = await apiClient.post<RenderFitFiguresResponse>('/render-fit-figures', data);
      return response.data;
    },
  });
};
