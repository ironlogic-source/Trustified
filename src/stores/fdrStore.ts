import { create } from 'zustand';
import type { FDR, FDRStatus, TrustTier, UserRole } from '../engines/types';
import { seedFDRs } from '../data/seed';
import { transition as executeTransition, canTransition } from '../engines/state-machine';
import { computeTrustTier } from '../engines/trust-tier';

export interface FDRFilterState {
  search: string;
  status: FDRStatus | 'all';
  trustTier: TrustTier | 'all';
  state: string;
  bank: string;
  monthYear: string | null; // For Maturity Radar filtering (YYYY-MM)
}

interface FDRState {
  fdrs: FDR[];
  selectedFdrId: string | null;
  filters: FDRFilterState;
  isLoading: boolean;
  setFilters: (filters: Partial<FDRFilterState>) => void;
  resetFilters: () => void;
  selectFdr: (id: string | null) => void;
  addFdr: (fdr: FDR) => Promise<void>;
  updateFdrStatus: (
    fdrId: string,
    action: string,
    actor: { id: string; role: UserRole },
    notes?: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_FILTERS: FDRFilterState = {
  search: '',
  status: 'all',
  trustTier: 'all',
  state: 'all',
  bank: 'all',
  monthYear: null,
};

export const useFDRStore = create<FDRState>((set, get) => ({
  fdrs: [...seedFDRs],
  selectedFdrId: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  selectFdr: (id) => {
    set({ selectedFdrId: id });
  },

  addFdr: async (newFdr) => {
    set({ isLoading: true });
    // Simulate realistic 350ms network roundtrip
    await new Promise((r) => setTimeout(r, 350));
    set((state) => ({
      fdrs: [newFdr, ...state.fdrs],
      isLoading: false,
    }));
  },

  updateFdrStatus: async (fdrId, action, actor, notes) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 300));

    const fdr = get().fdrs.find((f) => f.id === fdrId);
    if (!fdr) {
      set({ isLoading: false });
      return { success: false, error: 'FDR not found' };
    }

    if (!canTransition(fdr.status, action)) {
      set({ isLoading: false });
      return {
        success: false,
        error: `Action '${action}' is not permissible from status '${fdr.status}'`,
      };
    }

    const result = executeTransition(fdr, action, actor);
    if (!result.valid) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'Transition rejected' };
    }

    const updatedFdr: FDR = {
      ...result.fdr,
      notes: notes ? `${result.fdr.notes ? result.fdr.notes + '\n' : ''}${notes}` : result.fdr.notes,
      updatedAt: new Date().toISOString(),
      trustTier: computeTrustTier(result.fdr),
    };

    set((state) => ({
      fdrs: state.fdrs.map((item) => (item.id === fdrId ? updatedFdr : item)),
      isLoading: false,
    }));

    return { success: true };
  },
}));
