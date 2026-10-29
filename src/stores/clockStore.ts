import { create } from 'zustand';
import { REFERENCE_DATE } from '../data/seed';

interface ClockState {
  currentDate: string; // YYYY-MM-DD
  referenceDate: string;
  setDate: (date: string) => void;
  resetToToday: () => void;
  advanceDays: (days: number) => void;
  isCustomDate: boolean;
}

export const useClockStore = create<ClockState>((set, get) => ({
  currentDate: REFERENCE_DATE,
  referenceDate: REFERENCE_DATE,
  isCustomDate: false,
  setDate: (date: string) => {
    set({
      currentDate: date,
      isCustomDate: date !== REFERENCE_DATE,
    });
  },
  resetToToday: () => {
    set({
      currentDate: REFERENCE_DATE,
      isCustomDate: false,
    });
  },
  advanceDays: (days: number) => {
    const cur = new Date(get().currentDate);
    cur.setDate(cur.getDate() + days);
    const dateStr = cur.toISOString().split('T')[0] ?? REFERENCE_DATE;
    set({
      currentDate: dateStr,
      isCustomDate: dateStr !== REFERENCE_DATE,
    });
  },
}));
