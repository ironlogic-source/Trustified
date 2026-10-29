import { create } from 'zustand';
import type { UserRole } from '../engines/types';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  designation: string;
  institutionId?: string; // If role === 'institution'
  region?: string;
  avatarInitials: string;
}

export const ROLE_PROFILES: Record<UserRole, UserProfile> = {
  institution: {
    id: 'INST-001',
    name: 'Dr. Suresh Chandra Verma',
    role: 'institution',
    designation: 'Principal & Nodal Officer, Raipur Institute of Technology',
    institutionId: 'INST-001',
    region: 'Central',
    avatarInitials: 'SV',
  },
  scrutiny_officer: {
    id: 'USR-SO-001',
    name: 'Rajesh K. Sharma',
    role: 'scrutiny_officer',
    designation: 'Senior Scrutiny Officer, AICTE Bureau',
    region: 'HQ New Delhi',
    avatarInitials: 'RS',
  },
  regional_officer: {
    id: 'USR-RO-001',
    name: 'Vijay Krishnamurthy',
    role: 'regional_officer',
    designation: 'Regional Officer, Central Regional Office',
    region: 'Bhopal / Central',
    avatarInitials: 'VK',
  },
  bank_verifier: {
    id: 'USR-BV-001',
    name: 'Ramesh Agarwal',
    role: 'bank_verifier',
    designation: 'Chief Manager, Treasury & Institutional Verification, SBI',
    region: 'Pan-India',
    avatarInitials: 'RA',
  },
  authority: {
    id: 'USR-AU-001',
    name: 'Dr. Rajendra Prasad Tripathi',
    role: 'authority',
    designation: 'Adviser & Bureau Head, AICTE Regulation Bureau',
    region: 'HQ New Delhi',
    avatarInitials: 'RT',
  },
  admin: {
    id: 'USR-AD-001',
    name: 'A. K. Sengupta',
    role: 'admin',
    designation: 'Director (IT & Systems Infrastructure), AICTE',
    region: 'HQ New Delhi',
    avatarInitials: 'AS',
  },
};

interface AuthState {
  currentRole: UserRole;
  currentUser: UserProfile;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentRole: 'scrutiny_officer',
  currentUser: ROLE_PROFILES.scrutiny_officer,
  setRole: (role: UserRole) => {
    const profile = ROLE_PROFILES[role];
    set({ currentRole: role, currentUser: profile });
  },
}));
