import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuditStore } from '../../stores/auditStore';
import { Button } from '../ui/Button';
import { MockAdapterTag } from '../ui/MockAdapterTag';
import { runLogicChecks } from '../../engines/logic-checks';
import type { FDR, LogicCheckResult } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const InstitutionUpload: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addFdr = useFDRStore((state) => state.addFdr);
  const fdrs = useFDRStore((state) => state.fdrs);
  const institutions = useInstitutionStore((state) => state.institutions);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentRole = useAuthStore((state) => state.currentRole);
  const addAuditEntry = useAuditStore((state) => state.addEntry);

  const institution = institutions[0]!;

  const [step, setStep] = useState<'upload' | 'ocr' | 'review'>('upload');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStage, setOcrStage] = useState('Initializing Tesseract AI engine...');

  // Form fields auto-filled by mock OCR
  const [formData, setFormData] = useState({
    fdrNumber: 'BSBI/FD/2026/90234',
    bankName: 'Bharatiya State Bank',
    branchName: 'Civil Lines, Raipur',
    ifscCode: 'BSBI0001001',
    amountRupees: '2,50,00,000',
    issueDate: '2026-04-10',
    maturityDate: '2028-04-10',
    lienMarked: true,
    interestRate: 7.25,
    documentHash: 'c7f93a1052de498a87b321a4f5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger simulated OCR extraction
  const handleStartOCR = () => {
    setStep('ocr');
    setOcrProgress(15);
    setOcrStage('Analyzing document raster geometry...');

    setTimeout(() => {
      setOcrProgress(45);
      setOcrStage('Extracting tabular bounding boxes & IFSC checksum...');
    }, 500);

    setTimeout(() => {
      setOcrProgress(80);
      setOcrStage('Evaluating AICTE lien clause & digital stamp...');
    }, 1000);

    setTimeout(() => {
      setOcrProgress(100);
      setStep('review');
    }, 1400);
  };

  // Convert rupees string to paise integer
  const cleanPaise =
    parseInt(formData.amountRupees.replace(/,/g, ''), 10) * 100 || 2500000000;

  // Mock FDR preview object for pre-submission checks
  const previewFDR: FDR = {
    id: `FDR-NEW-${Date.now().toString().slice(-4)}`,
    fdrNumber: formData.fdrNumber,
    institutionId: institution.id,
    institutionName: institution.name,
    bankName: formData.bankName,
    branchName: formData.branchName,
    ifscCode: formData.ifscCode,
    amount: cleanPaise,
    issueDate: formData.issueDate,
    maturityDate: formData.maturityDate,
    status: 'submitted',
    trustTier: 'submitted',
    lienMarked: formData.lienMarked,
    documentHash: formData.documentHash,
    renewalCount: 0,
    previousFdrId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Submitted via institutional self-service portal.',
  };

  const preChecks = runLogicChecks(previewFDR, fdrs);
  const criticalErrors = preChecks.filter((c) => !c.passed && c.severity === 'error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await addFdr(previewFDR);
    await addAuditEntry(
      'FDR_SUBMIT',
      { id: currentUser.id, role: currentRole },
      { type: 'fdr', id: previewFDR.id },
      `New FDR voucher ${previewFDR.fdrNumber} submitted for AICTE regulation approval by ${institution.name}.`,
    );

    setIsSubmitting(false);
    navigate(`/fdrs/${previewFDR.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Institutional Portal
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.upload')}
          </h1>
        </div>
        <MockAdapterTag />
      </div>

      {/* Step 1: Upload Dropzone */}
      {step === 'upload' && (
        <div className="bg-surface border border-hairline p-8 rounded-sm shadow-subtle space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-serif text-lg font-bold text-ink">
              Upload Original Fixed Deposit Advice / Certificate
            </h2>
            <p className="text-xs text-muted max-w-md mx-auto">
              Please submit high-resolution PDF or TIFF voucher issued by scheduled commercial bank
              with AICTE lien clause endorsement.
            </p>
          </div>

          <div
            onClick={handleStartOCR}
            className="border-2 border-dashed border-hairline hover:border-ink bg-paper/60 p-12 rounded-sm text-center cursor-pointer transition-colors duration-fast flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 bg-surface rounded-full border border-hairline flex items-center justify-center text-ink shadow-subtle">
              <UploadCloud size={24} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink font-sans">
                Click to select FDR document or drop file here
              </div>
              <div className="text-xs text-muted font-mono mt-1">
                Accepted: PDF, PNG, TIFF up to 25MB (Automated OCR Enabled)
              </div>
            </div>
            <Button size="sm" variant="secondary" className="mt-2 pointer-events-none">
              Simulate File Selection (Pre-seeded Voucher)
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: OCR Staged Progress Animation */}
      {step === 'ocr' && (
        <div className="bg-surface border border-hairline p-10 rounded-sm text-center space-y-5">
          <div className="w-14 h-14 bg-blue-bg border border-blue-system rounded-full flex items-center justify-center text-blue-system mx-auto animate-pulse">
            <Cpu size={28} />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-ink">
              Deterministic OCR Extraction Pipeline
            </h2>
            <div className="font-mono text-xs text-blue-system font-medium">
              {ocrStage}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto bg-paper border border-hairline h-2.5 rounded-sm overflow-hidden">
            <div
              style={{ width: `${ocrProgress}%` }}
              className="bg-blue-system h-full transition-all duration-300"
            />
          </div>

          <div className="text-[11px] text-muted font-mono">
            Extracting text zones, checksum validation, and hash computation...
          </div>
        </div>
      )}

      {/* Step 3: Review Auto-filled Data & Pre-Submission Checklist */}
      {step === 'review' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface border border-hairline p-6 rounded-sm shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brass" />
                <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wider">
                  OCR Extracted Field Values
                </h2>
              </div>
              <span className="text-[11px] font-mono text-green-confirmed bg-green-bg px-2 py-0.5 rounded-sm border border-green-confirmed/30">
                OCR Confidence: 98.8%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-muted font-mono mb-1">FDR Instrument Number:</label>
                <input
                  type="text"
                  value={formData.fdrNumber}
                  onChange={(e) => setFormData({ ...formData, fdrNumber: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink font-semibold text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Issuing Scheduled Bank:</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:border-ink font-semibold text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Branch Name & City:</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">IFSC Code:</label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink uppercase"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Deposit Principal (₹ INR):</label>
                <input
                  type="text"
                  value={formData.amountRupees}
                  onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink font-bold text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Interest Rate (% p.a.):</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Issue Date:</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                />
              </div>

              <div>
                <label className="block text-muted font-mono mb-1">Maturity Date:</label>
                <input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  className="w-full bg-paper border border-hairline px-3 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                />
              </div>
            </div>

            {/* Lien Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-ink font-medium">
                <input
                  type="checkbox"
                  checked={formData.lienMarked}
                  onChange={(e) => setFormData({ ...formData, lienMarked: e.target.checked })}
                  className="rounded-xs border-hairline"
                />
                <span>
                  Confirm AICTE Lien clause 12(b) is formally stamped on original instrument
                </span>
              </label>
            </div>
          </div>

          {/* Pre-submission Checklist (Automated Logic Checks) */}
          <div className="bg-surface border border-hairline p-5 rounded-sm shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <h3 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider">
                Pre-Submission Compliance Battery (6 Integrity Rules)
              </h3>
              <span className="text-[11px] font-mono text-muted">
                {preChecks.filter((c) => c.passed).length}/6 Checks Satisfied
              </span>
            </div>

            <div className="space-y-2">
              {preChecks.map((chk) => (
                <div
                  key={chk.rule}
                  className={`p-2.5 rounded-sm border text-xs flex items-start gap-2 ${
                    chk.passed
                      ? 'bg-paper/40 border-hairline'
                      : 'bg-brick-bg border-brick/40 text-brick'
                  }`}
                >
                  {chk.passed ? (
                    <CheckCircle2 size={14} className="text-green-confirmed shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-ink">
                      {chk.rule.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-[11px] text-body">{chk.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep('upload')}
            >
              Re-scan Document
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={criticalErrors.length > 0}
            >
              {criticalErrors.length > 0
                ? 'Submission Blocked by Integrity Rules'
                : 'Formally Submit FDR for Regulation Scrutiny'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
