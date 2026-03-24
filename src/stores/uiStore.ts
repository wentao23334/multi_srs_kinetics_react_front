import { create } from 'zustand';

interface UIState {
  isLeftPanelCollapsed: boolean;
  toggleLeftPanel: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isLeftPanelCollapsed: false,
  toggleLeftPanel: () => set((state) => ({ isLeftPanelCollapsed: !state.isLeftPanelCollapsed })),
}));
