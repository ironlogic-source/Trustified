import { create } from 'zustand';
import type { ReleaseRule } from '../engines/types';
import { DEFAULT_RELEASE_RULES } from '../engines/release-eligibility';

interface RuleState {
  rules: ReleaseRule[];
  toggleRule: (ruleId: string) => void;
  updateRule: (rule: ReleaseRule) => void;
  addRule: (rule: ReleaseRule) => void;
  deleteRule: (ruleId: string) => void;
  resetRules: () => void;
}

export const useRuleStore = create<RuleState>((set) => ({
  rules: [...DEFAULT_RELEASE_RULES],

  toggleRule: (ruleId) => {
    set((state) => ({
      rules: state.rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    }));
  },

  updateRule: (updatedRule) => {
    set((state) => ({
      rules: state.rules.map((r) => (r.id === updatedRule.id ? updatedRule : r)),
    }));
  },

  addRule: (newRule) => {
    set((state) => ({
      rules: [...state.rules, newRule],
    }));
  },

  deleteRule: (ruleId) => {
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== ruleId),
    }));
  },

  resetRules: () => {
    set({ rules: [...DEFAULT_RELEASE_RULES] });
  },
}));
