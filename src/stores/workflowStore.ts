import { create } from 'zustand';

interface WorkflowState {
  currentStep: number;
  currentSelectedFolder: string;
  activeFile: string | null;
  keepRecord: boolean;
  setStep: (step: number) => void;
  setFolder: (folder: string) => void;
  setActiveFile: (file: string | null) => void;
  setKeepRecord: (keep: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  currentStep: 1,
  currentSelectedFolder: '',
  activeFile: null,
  keepRecord: false,
  setStep: (step) => set({ currentStep: step }),
  setFolder: (folder) => set({ currentSelectedFolder: folder }),
  setActiveFile: (file) => set({ activeFile: file }),
  setKeepRecord: (keep) => set({ keepRecord: keep }),
}));
