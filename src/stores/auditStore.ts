import { create } from 'zustand';
import type { AuditLogEntry, UserRole } from '../engines/types';
import { seedAuditLog } from '../data/seed';
import { createAuditEntry, verifyChain } from '../engines/audit-log';

interface VerificationResult {
  valid: boolean;
  brokenAt?: number;
  entry?: AuditLogEntry;
}

interface AuditState {
  entries: AuditLogEntry[];
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  addEntry: (
    action: string,
    actor: { id: string; role: UserRole },
    entity: { type: string; id: string },
    details: string,
  ) => Promise<AuditLogEntry>;
  runIntegrityCheck: () => Promise<VerificationResult>;
  resetVerification: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  entries: [...seedAuditLog],
  isVerifying: false,
  verificationResult: null,

  addEntry: async (action, actor, entity, details) => {
    const list = get().entries;
    const lastEntry = list[list.length - 1];
    const prevHash = lastEntry ? lastEntry.hash : '';

    const newEntry = await createAuditEntry(action, actor, entity, details, prevHash);
    set((state) => ({
      entries: [...state.entries, newEntry],
      verificationResult: null, // Invalidate previous result
    }));

    return newEntry;
  },

  runIntegrityCheck: async () => {
    set({ isVerifying: true });
    // Realistic cryptographic verification delay for 50+ blocks
    await new Promise((r) => setTimeout(r, 650));

    const result = await verifyChain(get().entries);
    set({ isVerifying: false, verificationResult: result });
    return result;
  },

  resetVerification: () => {
    set({ verificationResult: null, isVerifying: false });
  },
}));
