import React, { useState } from 'react';
import { useAuthStore, ROLE_PROFILES } from '../../stores/authStore';
import type { UserRole } from '../../engines/types';
import { Shield, Lock, ChevronRight, Eye, EyeOff, Cpu, AlertTriangle } from 'lucide-react';

interface PersonaCard {
  role: UserRole;
  name: string;
  designation: string;
  initials: string;
  department: string;
  color: string;
  accentColor: string;
}

const PERSONAS: PersonaCard[] = [
  {
    role: 'institution',
    name: 'Dr. Anita Sharma',
    designation: 'Nodal Officer',
    initials: 'AS',
    department: 'Raipur Institute of Technology',
    color: 'bg-body',
    accentColor: '#1D2433',
  },
  {
    role: 'scrutiny_officer',
    name: 'Rajesh Kumar Verma',
    designation: 'Scrutiny Officer',
    initials: 'RV',
    department: 'AICTE Bureau · Verification Cell',
    color: 'bg-blue-system',
    accentColor: '#2B5FA8',
  },
  {
    role: 'regional_officer',
    name: 'Priya Nair',
    designation: 'Regional Director',
    initials: 'PN',
    department: 'AICTE Bureau · South Zone',
    color: 'bg-ochre',
    accentColor: '#B7791F',
  },
  {
    role: 'bank_verifier',
    name: 'Suresh Menon',
    designation: 'Bank Liaison Officer',
    initials: 'SM',
    department: 'State Bank Nodal · Mumbai',
    color: 'bg-green-confirmed',
    accentColor: '#1F7A4D',
  },
  {
    role: 'authority',
    name: 'Prof. A.K. Srivastava',
    designation: 'Competent Authority',
    initials: 'AK',
    department: 'AICTE Regulation Bureau · HQ',
    color: 'bg-brass',
    accentColor: '#A8842C',
  },
  {
    role: 'admin',
    name: 'Neha Joshi',
    designation: 'System Administrator',
    initials: 'NJ',
    department: 'AICTE IT Division',
    color: 'bg-brick',
    accentColor: '#B3382C',
  },
];

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const setRole = useAuthStore((s) => s.setRole);
  const [selectedPersona, setSelectedPersona] = useState<PersonaCard | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'password' | 'mfa'>('select');

  const handleSelectPersona = (p: PersonaCard) => {
    setSelectedPersona(p);
    setStep('password');
    setError('');
    setPassword('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setError('');
    setStep('mfa');
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setError('Please enter the OTP code.');
      return;
    }
    setError('');
    setIsLoading(true);
    // Simulate auth
    await new Promise((r) => setTimeout(r, 900));
    if (selectedPersona) {
      setRole(selectedPersona.role);
    }
    setIsLoading(false);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col select-none">
      {/* Top identity strip */}
      <div className="bg-ink text-white text-[11px] font-mono tracking-wider py-1.5 px-6 flex items-center justify-between">
        <span className="opacity-60">GoI · Ministry of Education · AICTE</span>
        <span className="opacity-60">Secure Portal — TLS 1.3 Encrypted</span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Left branding panel */}
        <div className="hidden lg:flex w-[420px] flex-col justify-between bg-ink text-white p-10 relative overflow-hidden shrink-0">
          {/* Background watermark */}
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-[80px] border-white translate-x-32 -translate-y-32" />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full border-[60px] border-white -translate-x-24 translate-y-24" />
          </div>

          <div className="relative space-y-6">
            {/* Logo mark */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <div className="font-serif font-bold text-lg text-white leading-tight">FDR-Kavach</div>
                <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
                  v2.4.0 · SIH26265
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h1 className="font-serif text-2xl font-semibold text-white leading-snug">
                Fixed Deposit Receipt<br />Lifecycle Platform
              </h1>
              <p className="text-sm text-white/60 font-sans leading-relaxed">
                AICTE Regulation Bureau's central repository for institution-wise and instrument-wise management of security deposits and FDRs.
              </p>
            </div>

            {/* Feature pills */}
            <div className="space-y-2 pt-2">
              {[
                'Hash-chained immutable audit ledger',
                '4-tier trust verification model',
                'AI-assisted field extraction & forensics',
                'Configurable APH rule engine',
                'Real-time escalation ladder',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs text-white/70 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-confirmed shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom metadata */}
          <div className="relative space-y-3">
            <div className="border-t border-white/10 pt-4 text-[11px] font-mono text-white/40 space-y-1">
              <div>Smart India Hackathon 2026 · Problem Statement SIH26265</div>
              <div>Team: Fast n Curious · AICTE Security Deposit Portal</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-confirmed animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-lg">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-ink rounded-sm flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <div className="font-serif font-bold text-base text-ink">FDR-Kavach</div>
                <div className="text-[10px] font-mono text-muted uppercase tracking-wider">AICTE Regulation Bureau</div>
              </div>
            </div>

            {/* Step: Select persona */}
            {step === 'select' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink">Secure Sign In</h2>
                  <p className="text-xs text-muted font-sans mt-1">
                    Select your institutional persona to authenticate. MFA required.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-mono tracking-widest text-muted px-0.5 mb-3">
                    Authorized Personas — Demo Environment
                  </div>
                  {PERSONAS.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => handleSelectPersona(p)}
                      className="w-full flex items-center gap-3 p-3 bg-surface border border-hairline hover:border-ink rounded-sm transition-all duration-fast text-left group hover:shadow-subtle"
                    >
                      <div
                        className={`w-9 h-9 rounded-sm flex items-center justify-center text-white text-xs font-mono font-bold shrink-0 ${p.color}`}
                      >
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-muted font-mono truncate">{p.designation} · {p.department}</div>
                      </div>
                      <ChevronRight size={14} className="text-muted group-hover:text-ink shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted font-mono bg-paper border border-hairline p-2.5 rounded-sm">
                  <Cpu size={13} className="shrink-0 text-ink" />
                  <span>Demo mode: credentials are pre-filled. All data is synthetic.</span>
                </div>
              </div>
            )}

            {/* Step: Password */}
            {step === 'password' && selectedPersona && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <button
                    onClick={() => { setStep('select'); setSelectedPersona(null); }}
                    className="text-[11px] font-mono text-muted hover:text-ink mb-4 flex items-center gap-1"
                  >
                    ← Back to persona selection
                  </button>
                  <h2 className="font-serif text-xl font-semibold text-ink">Enter Password</h2>
                  <p className="text-xs text-muted font-sans mt-1">
                    Authenticating as <strong className="text-ink">{selectedPersona.name}</strong>
                  </p>
                </div>

                {/* Selected persona card */}
                <div className="flex items-center gap-3 p-3 bg-surface border border-hairline rounded-sm">
                  <div className={`w-9 h-9 rounded-sm flex items-center justify-center text-white text-xs font-mono font-bold shrink-0 ${selectedPersona.color}`}>
                    {selectedPersona.initials}
                  </div>
                  <div>
                    <div className="font-medium text-ink text-xs">{selectedPersona.name}</div>
                    <div className="text-[10px] text-muted font-mono">{selectedPersona.designation} · {selectedPersona.department}</div>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">
                      Password / ePass
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password…"
                        autoFocus
                        className="w-full bg-surface border border-hairline px-3 py-2 pr-10 font-mono text-sm text-ink rounded-sm focus:outline-none focus:border-ink placeholder:text-muted/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-muted mt-1">Demo: any password accepted</div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-brick text-xs font-sans bg-brick-bg border border-brick/40 p-2.5 rounded-sm">
                      <AlertTriangle size={13} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-ink text-white py-2.5 px-4 rounded-sm font-sans font-semibold text-sm hover:bg-body transition-colors duration-fast flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    Continue to MFA
                  </button>
                </form>
              </div>
            )}

            {/* Step: MFA */}
            {step === 'mfa' && selectedPersona && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <button
                    onClick={() => setStep('password')}
                    className="text-[11px] font-mono text-muted hover:text-ink mb-4 flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <h2 className="font-serif text-xl font-semibold text-ink">Multi-Factor Authentication</h2>
                  <p className="text-xs text-muted font-sans mt-1">
                    A 6-digit OTP has been dispatched to your registered mobile.
                  </p>
                </div>

                <div className="bg-paper border border-hairline p-4 rounded-sm space-y-2 text-xs font-mono">
                  <div className="text-muted uppercase tracking-wider text-[10px]">OTP Dispatch Summary</div>
                  <div className="flex items-center justify-between">
                    <span className="text-body">Mobile:</span>
                    <span className="text-ink font-bold">+91 98XXXX4782</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-body">Channel:</span>
                    <span className="text-ink">SMS via DLT Gateway</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-body">Expires in:</span>
                    <span className="text-ochre font-bold">5 minutes</span>
                  </div>
                  <div className="text-muted text-[10px] pt-1 border-t border-hairline/60">
                    Demo: enter any 6-digit code (e.g. 123456)
                  </div>
                </div>

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">
                      One-Time Password (OTP)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      autoFocus
                      className="w-full bg-surface border border-hairline px-3 py-2.5 font-mono text-xl text-ink rounded-sm focus:outline-none focus:border-ink tracking-[0.4em] text-center"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-brick text-xs font-sans bg-brick-bg border border-brick/40 p-2.5 rounded-sm">
                      <AlertTriangle size={13} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || mfaCode.length !== 6}
                    className="w-full bg-ink text-white py-2.5 px-4 rounded-sm font-sans font-semibold text-sm hover:bg-body transition-colors duration-fast flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating…
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        Sign In Securely
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 pt-4 border-t border-hairline text-[10px] font-mono text-muted space-y-1">
              <div>AICTE FDR-Kavach Portal · Government of India</div>
              <div>Protected under IT Act 2000 · DPDP Act 2023 · MFA Enforced</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
