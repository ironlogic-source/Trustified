import React, { useState } from 'react';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { useRuleStore } from '../../stores/ruleStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuditStore } from '../../stores/auditStore';
import { Button } from '../ui/Button';
import { MockAdapterTag } from '../ui/MockAdapterTag';
import { evaluateRelease } from '../../engines/release-eligibility';
import { formatINR } from '../../engines/formatters';
import type { FDR } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileSignature,
  FileCheck2,
  Lock,
  ArrowRight,
  Stamp,
  Fingerprint,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export const ReleaseRequest: React.FC = () => {
  const { t } = useTranslation();
  const fdrs = useFDRStore((state) => state.fdrs);
  const updateFdrStatus = useFDRStore((state) => state.updateFdrStatus);
  const institutions = useInstitutionStore((state) => state.institutions);
  const rules = useRuleStore((state) => state.rules);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentRole = useAuthStore((state) => state.currentRole);
  const addAuditEntry = useAuditStore((state) => state.addEntry);

  // Eligible FDRs pool
  const candidateFdrs = fdrs.filter(
    (f) =>
      ['active', 'expiring', 'matured', 'release_requested'].includes(f.status) &&
      (currentRole !== 'institution' || f.institutionId === 'INST-001'),
  );

  const [selectedFdrId, setSelectedFdrId] = useState<string>(
    candidateFdrs[0]?.id || '',
  );

  // Find targeted FDR & institution
  const fdr = fdrs.find((f) => f.id === selectedFdrId) || candidateFdrs[0];
  const institution = institutions.find((i) => i.id === fdr?.institutionId) || institutions[0]!;

  // Evaluate release rules
  const evaluation = fdr ? evaluateRelease(fdr, institution, fdrs, rules) : null;

  // eSign modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('XXXX-XXXX-9842');
  const [otpVal, setOtpVal] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isReleased, setIsReleased] = useState(false);

  const handleExecuteEsign = async () => {
    if (!fdr) return;
    setIsSigning(true);
    await new Promise((r) => setTimeout(r, 800));

    await updateFdrStatus(
      fdr.id,
      'authority_approve',
      { id: currentUser.id, role: currentRole },
      `Formal release authorized via Aadhaar eSign (Certificate ID: ASC-2026-${fdr.id.slice(-4)})`,
    );

    await addAuditEntry(
      'FDR_RELEASED',
      { id: currentUser.id, role: currentRole },
      { type: 'fdr', id: fdr.id },
      `FDR ${fdr.fdrNumber} released back to ${institution.name} following digital sign-off by ${currentUser.name}.`,
    );

    setIsSigning(false);
    setIsSignModalOpen(false);
    setIsReleased(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Statutory Release Bureau
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.release')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MockAdapterTag />
          <span className="text-xs font-mono text-muted bg-paper px-2 py-1 border border-hairline rounded-sm">
            Role: <strong>{t(`roles.${currentRole}`)}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Selector & Rule Verification Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: FDR Selection (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider">
              Select FDR for Release Scrutiny
            </h2>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {candidateFdrs.slice(0, 15).map((item) => {
                const isSelected = selectedFdrId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedFdrId(item.id);
                      setIsReleased(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-sm border transition-colors text-xs font-mono space-y-1 ${
                      isSelected
                        ? 'bg-blue-bg/40 border-ink font-semibold'
                        : 'bg-paper/40 border-hairline hover:bg-paper'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-ink">{item.fdrNumber}</span>
                      <span className="text-[10px] text-muted">{item.status}</span>
                    </div>
                    <div className="text-[11px] text-body truncate font-sans">
                      {item.institutionName}
                    </div>
                    <div className="text-[11px] text-green-confirmed font-semibold">
                      {formatINR(item.amount)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Rule Engine Results & eSign Action (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {fdr && evaluation ? (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="bg-surface border border-hairline p-5 rounded-sm shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-muted">
                    Instrument Under Evaluation
                  </div>
                  <h3 className="font-serif text-xl font-bold text-ink">
                    {fdr.fdrNumber} • {formatINR(fdr.amount)}
                  </h3>
                  <div className="text-xs text-muted font-sans mt-0.5">
                    {institution.name} • {fdr.bankName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono uppercase text-muted">
                    Release Eligibility Status
                  </div>
                  <div
                    className={`font-mono text-lg font-bold ${
                      evaluation.eligible ? 'text-green-confirmed' : 'text-brick'
                    }`}
                  >
                    {evaluation.eligible ? 'APPROVED FOR RELEASE' : 'RELEASE DISQUALIFIED'}
                  </div>
                  <div className="text-xs text-muted font-mono">
                    {evaluation.passedCount} of {evaluation.totalRequired} statutory rules satisfied
                  </div>
                </div>
              </div>

              {/* Release Rules Evaluation Checklist */}
              <div className="bg-surface border border-hairline p-5 rounded-sm shadow-subtle space-y-4">
                <div className="border-b border-hairline pb-2 flex items-center justify-between">
                  <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                    Statutory Release Rule Results ({rules.length} Active Rules)
                  </span>
                  <span className="text-xs font-mono text-muted">AICTE Regulation Bureau Norms</span>
                </div>

                <div className="space-y-2.5">
                  {evaluation.evaluations.map((evalItem) => (
                    <div
                      key={evalItem.ruleId}
                      className={`p-3 border rounded-sm text-xs flex items-start gap-3 ${
                        evalItem.passed
                          ? 'bg-paper/40 border-hairline'
                          : 'bg-brick-bg/40 border-brick/40 text-brick'
                      }`}
                    >
                      {evalItem.passed ? (
                        <CheckCircle2
                          size={16}
                          className="text-green-confirmed shrink-0 mt-0.5"
                        />
                      ) : (
                        <XCircle size={16} className="text-brick shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-ink">
                            {evalItem.ruleId}: {evalItem.ruleName}
                          </span>
                          <span
                            className={`font-mono text-[10px] uppercase font-semibold ${
                              evalItem.passed ? 'text-green-confirmed' : 'text-brick'
                            }`}
                          >
                            {evalItem.passed ? 'PASSED' : 'VIOLATED'}
                          </span>
                        </div>
                        <div className="text-body font-sans leading-relaxed">
                          {evalItem.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Release Trigger Button */}
                <div className="pt-4 border-t border-hairline flex items-center justify-between">
                  <div className="text-xs text-muted font-sans">
                    {evaluation.eligible
                      ? 'All statutory preconditions met. Ready for digital certificate sign-off.'
                      : 'Resolving failed conditions is required before release certificate generation.'}
                  </div>

                  {isReleased ? (
                    <div className="flex items-center gap-2 text-green-confirmed font-mono text-xs font-bold bg-green-bg px-3 py-1.5 rounded-sm border border-green-confirmed/40">
                      <Stamp size={16} />
                      <span>FDR Successfully Released (eSign Stamped)</span>
                    </div>
                  ) : (
                    <Button
                      variant={evaluation.eligible ? 'primary' : 'secondary'}
                      disabled={!evaluation.eligible}
                      onClick={() => setIsSignModalOpen(true)}
                      icon={<FileSignature size={15} />}
                    >
                      Proceed to Aadhaar eSign
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-hairline p-12 text-center text-muted font-sans rounded-sm">
              Select an instrument on the left to evaluate statutory release eligibility.
            </div>
          )}
        </div>
      </div>

      {/* Aadhaar eSign Simulation Modal */}
      <Dialog.Root open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-hairline rounded-sm shadow-modal w-full max-w-md p-6 z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint size={18} className="text-ink" />
                <Dialog.Title className="font-serif font-bold text-base text-ink">
                  Aadhaar eSign Digital Authorization
                </Dialog.Title>
              </div>
              <MockAdapterTag />
            </div>

            <div className="text-xs text-body leading-relaxed space-y-2 font-sans">
              <p>
                You are applying an official digital signature under Section 3A of the IT Act, 2000
                to release instrument <strong>{fdr?.fdrNumber}</strong> in favor of{' '}
                <strong>{institution?.name}</strong>.
              </p>

              <div className="bg-paper p-3 border border-hairline rounded-sm space-y-2 font-mono">
                <div>
                  <span className="text-muted block text-[10px]">Aadhaar Identification:</span>
                  <span className="font-bold text-ink">{aadhaarNumber}</span>
                </div>
                <div>
                  <label className="text-muted block text-[10px] mb-1">
                    Enter Simulated OTP (Mock: 123456):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpVal}
                    onChange={(e) => setOtpVal(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-surface border border-hairline px-3 py-1.5 text-center font-mono text-base tracking-widest rounded-sm text-ink focus:outline-none focus:border-ink font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSigning}
                onClick={handleExecuteEsign}
              >
                Sign & Issue Release Order
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
