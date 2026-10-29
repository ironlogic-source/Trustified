import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuditStore } from '../../stores/auditStore';
import { TrustTierSeal } from '../ui/TrustTierSeal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatINR } from '../../engines/formatters';
import { runLogicChecks } from '../../engines/logic-checks';
import { getAvailableActions } from '../../engines/state-machine';
import { calculateRiskScore } from '../../engines/risk-score';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Building,
  Calendar,
  Layers,
  ShieldAlert,
  Hash,
  ExternalLink,
  Clock,
  Stamp,
  Fingerprint,
} from 'lucide-react';

export const FDRDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fdrs = useFDRStore((state) => state.fdrs);
  const updateFdrStatus = useFDRStore((state) => state.updateFdrStatus);
  const institutions = useInstitutionStore((state) => state.institutions);
  const currentRole = useAuthStore((state) => state.currentRole);
  const currentUser = useAuthStore((state) => state.currentUser);
  const addAuditEntry = useAuditStore((state) => state.addEntry);

  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'document' | 'forensics'>('document');
  const [actionNotes, setActionNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Find targeted FDR
  const fdr = fdrs.find((f) => f.id === id) || fdrs[0];

  if (!fdr) {
    return (
      <div className="p-8 text-center bg-surface border border-hairline rounded-sm">
        <h2 className="text-base font-semibold text-ink">FDR Instrument Not Found</h2>
        <Button onClick={() => navigate('/fdrs')} className="mt-4" variant="secondary">
          Back to Registry
        </Button>
      </div>
    );
  }

  // Find institution & run evaluations
  const institution = institutions.find((i) => i.id === fdr.institutionId) || institutions[0]!;
  const logicResults = runLogicChecks(fdr, fdrs);
  const failedChecks = logicResults.filter((r) => !r.passed);
  const riskAssessment = calculateRiskScore(institution, fdrs, fdrs);
  const availableActions = getAvailableActions(fdr.status, currentRole);

  const handleExecuteAction = async (action: string) => {
    setActionLoading(true);
    setFeedbackMsg(null);

    const result = await updateFdrStatus(
      fdr.id,
      action,
      { id: currentUser.id, role: currentRole },
      actionNotes,
    );

    if (result.success) {
      await addAuditEntry(
        action.toUpperCase(),
        { id: currentUser.id, role: currentRole },
        { type: 'fdr', id: fdr.id },
        `Action ${action} executed by ${currentUser.name} (${currentRole}) on FDR ${fdr.fdrNumber}. Notes: ${actionNotes || 'None'}`,
      );
      setFeedbackMsg({
        type: 'success',
        text: `FDR transitioned successfully via ${action}. Audit entry appended.`,
      });
      setActionNotes('');
    } else {
      setFeedbackMsg({
        type: 'error',
        text: result.error || 'Failed to execute lifecycle transition.',
      });
    }
    setActionLoading(false);
  };

  // Seeded document forensics findings
  const forensicsFindings = [
    {
      id: 'FIND-1',
      title: 'PDF Producer & Exif Metadata',
      value: 'Scanned via HP ScanJet Pro 4500 • Original Creation: 2024-02-14',
      status: 'clean',
      severity: 'low',
    },
    {
      id: 'FIND-2',
      title: 'Digital Watermark & Bank Seal',
      value: `${fdr.bankName} Official Circular Seal match confidence 98.4%`,
      status: 'clean',
      severity: 'low',
    },
    {
      id: 'FIND-3',
      title: 'Font Glyphs & Layout Raster Integrity',
      value:
        fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount
          ? 'Pixel inconsistency detected in amount text region. Possible document alteration.'
          : 'Standard banking typography grid aligned with zero raster splices.',
      status:
        fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount
          ? 'tampered'
          : 'clean',
      severity:
        fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount
          ? 'critical'
          : 'low',
    },
    {
      id: 'FIND-4',
      title: 'AICTE Lien Endorsement Endsheet',
      value: fdr.lienMarked
        ? 'Clause 12(b) AICTE lien text recognized with valid Branch Manager signature.'
        : 'CRITICAL: No lien stamp or endorsement detected in favour of AICTE.',
      status: fdr.lienMarked ? 'clean' : 'missing',
      severity: fdr.lienMarked ? 'low' : 'high',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/fdrs')}
            className="p-1.5 border border-hairline bg-surface hover:bg-paper rounded-sm text-ink transition-colors"
            title="Return to Registry"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-xs uppercase font-mono tracking-widest text-muted">
              FDR Dossier Verification
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-ink">
                {fdr.fdrNumber}
              </h1>
              <Badge status={fdr.status} />
              <TrustTierSeal tier={fdr.trustTier} size="sm" />
            </div>
          </div>
        </div>

        {/* Quick status alert */}
        {failedChecks.length > 0 && (
          <div className="flex items-center gap-2 bg-brick-bg border border-brick px-3 py-1.5 rounded-sm text-xs font-mono text-brick">
            <ShieldAlert size={15} />
            <span>
              {failedChecks.length} Automated Logic Failure(s) Detected
            </span>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-sm border text-xs font-mono flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-green-bg border-green-confirmed text-green-confirmed'
              : 'bg-brick-bg border-brick text-brick'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Layout: Left = Document Viewer, Right = Verification & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Document Advice Viewer */}
        <div className="lg:col-span-7 space-y-4">
          {/* Viewer Tabs */}
          <div className="flex border-b border-hairline gap-4 text-xs font-sans">
            <button
              onClick={() => setActiveTab('document')}
              className={`pb-2 px-1 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'document'
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <FileSearch size={14} />
              <span>Original FDR Advice (OCR Overlay)</span>
            </button>
            <button
              onClick={() => setActiveTab('forensics')}
              className={`pb-2 px-1 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'forensics'
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Fingerprint size={14} />
              <span>Forensics & EXIF Analysis</span>
            </button>
          </div>

          {activeTab === 'document' ? (
            /* Styled Bank Fixed Deposit Advice Document */
            <div className="bg-[#FAF8F5] border-2 border-[#D4CEBF] p-6 rounded-sm shadow-subtle relative overflow-hidden font-mono text-xs text-[#2A2F3D] select-none">
              {/* Bank Watermark Pattern */}
              <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none text-8xl font-serif font-black tracking-widest text-[#0B2545] rotate-[-25deg]">
                {fdr.bankName.toUpperCase()}
              </div>

              {/* Bank Advice Header */}
              <div className="border-b-2 border-[#1E293B] pb-4 mb-4 flex justify-between items-start">
                <div>
                  <div className="font-serif text-lg font-bold text-ink uppercase tracking-wider">
                    {fdr.bankName}
                  </div>
                  <div className="text-[11px] text-muted">
                    {fdr.branchName} Branch • IFSC: {fdr.ifscCode}
                  </div>
                  <div className="text-[10px] text-muted/80">
                    Registered under Banking Regulation Act, 1949
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted font-bold">
                    Fixed Deposit Receipt
                  </div>
                  <div className="font-bold text-ink text-sm bg-white border border-hairline px-2 py-0.5 rounded-sm inline-block">
                    {fdr.fdrNumber}
                  </div>
                </div>
              </div>

              {/* OCR Bounding Boxes Visual Mock */}
              <div className="space-y-4 relative">
                {/* Field 1: Depositor Details (OCR Box #1) */}
                <div className="relative border border-blue-system/40 bg-blue-system/5 p-3 rounded-sm">
                  <span className="absolute -top-2.5 left-2 bg-blue-system text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono">
                    #1 Depositor [Conf: 99.2%]
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <div className="text-[10px] text-muted uppercase">In Favour Of:</div>
                      <div className="font-semibold text-ink text-xs font-sans">
                        {institution.name}
                      </div>
                      <div className="text-[10px] text-muted">
                        AICTE Permanent ID: {institution.aicteId}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Account Ref:</div>
                      <div className="font-semibold text-ink text-xs">
                        FD-AC-9081273645
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field 2: Deposit Amount (OCR Box #2) */}
                <div
                  className={`relative border p-3 rounded-sm ${
                    fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount
                      ? 'border-brick bg-brick-bg/40'
                      : 'border-blue-system/40 bg-blue-system/5'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 left-2 text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono ${
                      fdr.bankReportedAmount !== undefined && fdr.bankReportedAmount !== fdr.amount
                        ? 'bg-brick'
                        : 'bg-blue-system'
                    }`}
                  >
                    #2 Amount Verification [Conf: 98.7%]
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Principal Sum:</div>
                      <div className="font-bold text-ink text-base">
                        {formatINR(fdr.amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Interest Rate:</div>
                      <div className="font-semibold text-ink text-sm">
                        {fdr.interestRate ? `${fdr.interestRate}% p.a.` : '7.25% p.a.'}
                      </div>
                    </div>
                  </div>

                  {fdr.bankReportedAmount !== undefined &&
                    fdr.bankReportedAmount !== fdr.amount && (
                      <div className="mt-2 text-[11px] text-brick font-sans flex items-center gap-1.5 border-t border-brick/30 pt-1.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>
                          <strong>Forensic Anomaly:</strong> Bank ledger reports ₹
                          {(fdr.bankReportedAmount / 100).toLocaleString('en-IN')};
                          voucher shows ₹{(fdr.amount / 100).toLocaleString('en-IN')}.
                        </span>
                      </div>
                    )}
                </div>

                {/* Field 3: Dates & Tenure (OCR Box #3) */}
                <div className="relative border border-blue-system/40 bg-blue-system/5 p-3 rounded-sm">
                  <span className="absolute -top-2.5 left-2 bg-blue-system text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono">
                    #3 Tenure & Maturity [Conf: 99.5%]
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Date of Issue:</div>
                      <div className="font-semibold text-ink">{fdr.issueDate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Date of Maturity:</div>
                      <div className="font-semibold text-ink">{fdr.maturityDate}</div>
                    </div>
                  </div>
                </div>

                {/* Field 4: Lien Clause (OCR Box #4) */}
                <div
                  className={`relative border p-3 rounded-sm ${
                    fdr.lienMarked
                      ? 'border-green-confirmed/40 bg-green-bg/30'
                      : 'border-brick bg-brick-bg/40'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 left-2 text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono ${
                      fdr.lienMarked ? 'bg-green-confirmed' : 'bg-brick'
                    }`}
                  >
                    #4 AICTE Lien Endorsement [Conf: 97.8%]
                  </span>
                  <div className="text-[11px] font-sans leading-relaxed">
                    {fdr.lienMarked ? (
                      <span className="text-body flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-green-confirmed shrink-0 mt-0.5" />
                        <span>
                          <strong>Lien Endorsed:</strong> "This Deposit Receipt is held under
                          irrevocable lien in favour of All India Council for Technical Education
                          (AICTE), New Delhi. No pre-mature withdrawal, pledge or lien invocation
                          permitted without written clearance from AICTE Regulation Bureau."
                        </span>
                      </span>
                    ) : (
                      <span className="text-brick flex items-start gap-1.5">
                        <AlertTriangle size={14} className="text-brick shrink-0 mt-0.5" />
                        <span>
                          <strong>MISSING LIEN:</strong> No AICTE lien endorsement found on this
                          voucher. This violates Regulation Bureau security requirements.
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Footer Seals */}
              <div className="mt-6 pt-4 border-t border-[#D4CEBF] flex items-center justify-between text-[10px] text-muted">
                <div>
                  <div>Document Hash (SHA-256):</div>
                  <div className="font-mono text-[9px] text-ink select-all">
                    {fdr.documentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 border-2 border-brass/60 rounded-full flex items-center justify-center text-brass font-serif text-[8px] text-center uppercase tracking-tighter">
                    Bank
                    <br />
                    Verified
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Forensics & EXIF tab */
            <div className="bg-surface border border-hairline p-4 rounded-sm space-y-3">
              <div className="text-xs uppercase font-mono tracking-wider font-semibold text-ink">
                Automated Forensic Image & Document Scanner
              </div>
              <p className="text-xs text-muted">
                Every scanned FDR undergoes deterministic pixel frequency analysis, EXIF timestamp
                validation, and OCR confidence scoring.
              </p>

              <div className="space-y-2 mt-4">
                {forensicsFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-3 border border-hairline rounded-sm bg-paper/50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-ink flex items-center gap-2">
                        <span>{finding.title}</span>
                        {finding.status === 'clean' ? (
                          <span className="text-[10px] font-mono text-green-confirmed bg-green-bg px-1.5 py-0.2 rounded-xs border border-green-confirmed/40">
                            PASSED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-brick bg-brick-bg px-1.5 py-0.2 rounded-xs border border-brick/40">
                            ANOMALY
                          </span>
                        )}
                      </div>
                      <div className="text-muted text-[11px] leading-relaxed">
                        {finding.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Verification Results, Lifecycle & Actions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Automated Logic Check Results Card */}
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                Automated Logic Battery (6 Rules)
              </span>
              <span className="text-xs font-mono text-muted">
                {logicResults.filter((r) => r.passed).length}/{logicResults.length} Passed
              </span>
            </div>

            <div className="space-y-2">
              {logicResults.map((r) => (
                <div
                  key={r.rule}
                  className={`p-2.5 rounded-sm border text-xs flex items-start gap-2 ${
                    r.passed
                      ? 'bg-paper/40 border-hairline/60'
                      : r.severity === 'error'
                      ? 'bg-brick-bg border-brick/40 text-brick'
                      : 'bg-ochre-bg border-ochre/40 text-ochre'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 size={14} className="text-green-confirmed shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] font-semibold text-ink">
                      {r.rule.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-[11px] text-body leading-snug">{r.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institution Profile & Risk Score */}
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <div className="border-b border-hairline pb-2 flex items-center justify-between">
              <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                Institution Profile & Risk
              </span>
              <span className="font-mono text-xs font-bold text-ink">
                Risk: {institution.riskScore}/100
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-body">
              <div>
                <strong className="text-ink">Legal Name:</strong> {institution.name}
              </div>
              <div>
                <strong className="text-ink">Category:</strong>{' '}
                <span className="capitalize">{institution.type}</span> • Est.{' '}
                {institution.established}
              </div>
              <div>
                <strong className="text-ink">Location:</strong> {institution.district},{' '}
                {institution.state}
              </div>
              <div>
                <strong className="text-ink">Nodal Officer:</strong> {institution.nodalOfficer} (
                {institution.email})
              </div>
            </div>
          </div>

          {/* Lifecycle Actions Card (gated by state machine & role) */}
          <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
            <div className="border-b border-hairline pb-2 flex items-center justify-between">
              <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                Bureau Workflow Operations
              </span>
              <span className="text-[10px] font-mono text-muted uppercase">
                Role: {t(`roles.${currentRole}`)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] text-muted font-mono">
                Officer Endorsement / Scrutiny Notes:
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter remarks for this state transition..."
                className="w-full bg-paper border border-hairline rounded-sm p-2 text-xs font-sans text-ink focus:outline-none focus:border-ink"
              />
            </div>

            {availableActions.length === 0 ? (
              <div className="p-3 bg-paper border border-hairline text-center text-xs text-muted font-sans rounded-sm">
                No state actions available for current role in state '{fdr.status}'.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {availableActions.map((action) => {
                  let variant: 'primary' | 'secondary' | 'danger' | 'brass' = 'primary';
                  if (action.includes('reject') || action.includes('flag')) variant = 'danger';
                  if (action.includes('bank_confirm')) variant = 'brass';
                  if (action.includes('respond')) variant = 'secondary';

                  return (
                    <Button
                      key={action}
                      variant={variant}
                      size="sm"
                      isLoading={actionLoading}
                      onClick={() => handleExecuteAction(action)}
                    >
                      {action.replace(/_/g, ' ').toUpperCase()}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
