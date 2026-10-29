import { create } from 'zustand';
import type { Institution } from '../engines/types';
import { seedInstitutions } from '../data/seed';
import { calculateRiskScore } from '../engines/risk-score';
import { useFDRStore } from './fdrStore';

interface InstitutionState {
  institutions: Institution[];
  selectedInstitutionId: string | null;
  selectInstitution: (id: string | null) => void;
  recomputeRiskScores: () => void;
}

export const useInstitutionStore = create<InstitutionState>((set, get) => ({
  institutions: [...seedInstitutions],
  selectedInstitutionId: null,

  selectInstitution: (id) => {
    set({ selectedInstitutionId: id });
  },

  recomputeRiskScores: () => {
    const fdrs = useFDRStore.getState().fdrs;
    const updated = get().institutions.map((inst) => {
      const { score } = calculateRiskScore(inst, fdrs, fdrs);
      return {
        ...inst,
        riskScore: score,
        fdrCount: fdrs.filter((f) => f.institutionId === inst.id).length,
      };
    });
    set({ institutions: updated });
  },
}));
