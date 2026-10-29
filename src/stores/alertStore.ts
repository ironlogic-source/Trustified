import { create } from 'zustand';
import type { Alert, AlertType } from '../engines/types';
import { computeAlerts } from '../engines/escalation';
import { useClockStore } from './clockStore';
import { useFDRStore } from './fdrStore';
import { useInstitutionStore } from './institutionStore';

export interface AlertFilterState {
  urgency: AlertType | 'all';
  severity: string | 'all';
  search: string;
}

interface AlertState {
  alerts: Alert[];
  filters: AlertFilterState;
  setFilters: (filters: Partial<AlertFilterState>) => void;
  resetFilters: () => void;
  refreshAlerts: () => void;
  acknowledgeAlert: (alertId: string, actorId: string) => void;
}

const DEFAULT_ALERT_FILTERS: AlertFilterState = {
  urgency: 'all',
  severity: 'all',
  search: '',
};

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: computeAlerts(
    useFDRStore.getState().fdrs,
    useInstitutionStore.getState().institutions,
    useClockStore.getState().currentDate,
  ),
  filters: DEFAULT_ALERT_FILTERS,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_ALERT_FILTERS });
  },

  refreshAlerts: () => {
    const fdrs = useFDRStore.getState().fdrs;
    const insts = useInstitutionStore.getState().institutions;
    const date = useClockStore.getState().currentDate;
    const recomputed = computeAlerts(fdrs, insts, date);
    set({ alerts: recomputed });
  },

  acknowledgeAlert: (alertId, actorId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              acknowledged: true,
              acknowledgedBy: actorId,
              acknowledgedAt: new Date().toISOString(),
            }
          : a,
      ),
    }));
  },
}));
