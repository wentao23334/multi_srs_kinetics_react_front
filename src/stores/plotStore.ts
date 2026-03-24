import { create } from 'zustand';

interface PlotState {
  globalIntegrationRange: [number, number];
  perFileFitRanges: Record<string, [number, number]>;
  setGlobalIntegrationRange: (range: [number, number]) => void;
  setFileFitRange: (file: string, range: [number, number]) => void;
}

export const usePlotStore = create<PlotState>()((set) => ({
  globalIntegrationRange: [1150, 4000],
  perFileFitRanges: {},
  setGlobalIntegrationRange: (range) => set({ globalIntegrationRange: range }),
  setFileFitRange: (file, range) => 
    set((state) => ({
      perFileFitRanges: { ...state.perFileFitRanges, [file]: range }
    })),
}));
