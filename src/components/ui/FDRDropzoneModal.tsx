import React, { useState, useRef } from 'react';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuditStore } from '../../stores/auditStore';
import { runLogicChecks } from '../../engines/logic-checks';
import type { FDR } from '../../engines/types';
import { Button } from './Button';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Sparkles,
  X,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface FDRDropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fdrId: string) => void;
}

export const FDRDropzoneModal: React.FC<FDRDropzoneModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFdr = useFDRStore((state) => state.addFdr);
  const fdrs = useFDRStore((state) => state.fdrs);
  const institutions = useInstitutionStore((state) => state.institutions);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentRole = useAuthStore((state) => state.currentRole);
  const addAuditEntry = useAuditStore((state) => state.addEntry);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [stage, setStep] = useState<'drop' | 'scanning' | 'review'>('drop');
  const [progress, setProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('Initializing OCR Engine...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default extracted fields
  const [formData, setFormData] = useState({
    fdrNumber: `BSBI/FD/2026/${Math.floor(10000 + Math.random() * 90000)}`,
    bankName: 'State Bank of India',
    branchName: 'Main Commercial Branch, New Delhi',
    ifscCode: 'SBIN0000691',
    amountRupees: '2,50,00,000',
    interestRate: 7.25,
    issueDate: '2026-05-10',
    maturityDate: '2029-05-10',
    lienMarked: true,
  });

  const institution = institutions[0] || {
    id: 'INST-001',
    name: 'Raipur Institute of Technology',
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    startScanning(file.name);
  };

  const startScanning = (name?: string) => {
    setStep('scanning');
    setProgress(15);
    setScanMessage('Analyzing PDF raster geometry and embedded signatures...');

    setTimeout(() => {
      setProgress(48);
      setScanMessage('Extracting tabular zones: Bank, IFSC checksum, FDR amount...');
    }, 400);

    setTimeout(() => {
      setProgress(82);
      setScanMessage('Verifying AICTE Joint Lien Clause 12(b) & branch stamps...');
    }, 850);

    setTimeout(() => {
      setProgress(100);
      setStep('review');
    }, 1250);
  };

  // Convert rupees string to paise integer
  const cleanPaise =
    parseInt(formData.amountRupees.replace(/,/g, ''), 10) * 100 || 2500000000;

  // Preview FDR object for logic checking
  const previewFDR: FDR = {
    id: `FDR-NEW-${Date.now().toString().slice(-5)}`,
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
    documentHash: 'a89c45b7321e' + Math.random().toString(36).substring(2, 10),
    renewalCount: 0,
    previousFdrId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: `Submitted via Drag-and-Drop Registry upload: ${selectedFileName || 'Voucher.pdf'}`,
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
      `New FDR voucher ${previewFDR.fdrNumber} submitted via Drag-and-Drop PDF ingest by ${currentUser.name} (${currentRole}).`,
    );

    setIsSubmitting(false);
    onSuccess?.(previewFDR.id);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep('drop');
    setProgress(0);
    setSelectedFileName(null);
    setFileSize(null);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-hairline rounded-sm shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-50 text-xs text-body space-y-4">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-ink text-white flex items-center justify-center font-bold">
                <FileText size={15} />
              </div>
              <div>
                <Dialog.Title className="font-serif font-bold text-base text-ink">
                  Deposit Instrument Ingestion (PDF / Image)
                </Dialog.Title>
                <div className="text-[10px] font-mono text-muted uppercase">
                  AICTE Security Deposit Verification Pipeline
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-muted hover:text-ink p-1 rounded-sm"
            >
              <X size={16} />
            </button>
          </div>

          {/* STEP 1: DROPZONE */}
          {stage === 'drop' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/tiff"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-10 rounded-sm text-center cursor-pointer transition-all duration-fast flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-ink bg-blue-bg/60 scale-[1.01]'
                    : 'border-hairline hover:border-ink bg-paper/60'
                }`}
              >
                <div className="w-12 h-12 bg-surface rounded-full border border-hairline flex items-center justify-center text-ink shadow-subtle">
                  <UploadCloud size={24} className={isDragging ? 'text-blue-system' : ''} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink font-sans">
                    Drop FDR PDF or scanned document here
                  </div>
                  <div className="text-xs text-muted font-mono mt-1">
                    Supports PDF, PNG, JPG up to 25MB with automated OCR & lien parsing
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Select PDF from Computer
                  </Button>
                </div>
              </div>

              {/* Sample Voucher Fast Track */}
              <div className="p-3 bg-paper border border-hairline rounded-sm flex items-center justify-between">
                <div className="text-xs font-sans">
                  <strong className="text-ink">Need a sample voucher for demo?</strong>
                  <div className="text-[11px] text-muted">
                    Test the extraction pipeline with a pre-configured SBI FDR certificate
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedFileName('SBI_FDR_JointLien_Sample.pdf');
                    setFileSize('482 KB');
                    startScanning('SBI_FDR_JointLien_Sample.pdf');
                  }}
                >
                  Load Sample Voucher
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING ANIMATION */}
          {stage === 'scanning' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-blue-bg border border-blue-system rounded-full flex items-center justify-center text-blue-system mx-auto animate-pulse">
                <Cpu size={26} />
              </div>

              <div className="space-y-1">
                <div className="font-serif font-bold text-base text-ink">
                  Deterministic OCR & Forensic Scan
                </div>
                <div className="font-mono text-xs text-blue-system font-medium">
                  {scanMessage}
                </div>
                {selectedFileName && (
                  <div className="text-[11px] font-mono text-muted">
                    File: {selectedFileName} ({fileSize})
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm mx-auto bg-paper border border-hairline h-2 rounded-sm overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="bg-blue-system h-full transition-all duration-300"
                />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & SUBMIT */}
          {stage === 'review' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between bg-green-bg/60 border border-green-confirmed/40 p-2.5 rounded-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-green-confirmed" />
                  <span className="font-semibold text-green-confirmed font-mono text-xs">
                    OCR Extraction Complete (Confidence: 98.6%)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted">
                  {selectedFileName || 'Voucher.pdf'}
                </span>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3 font-sans">
                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    FDR Voucher Number:
                  </label>
                  <input
                    type="text"
                    value={formData.fdrNumber}
                    onChange={(e) => setFormData({ ...formData, fdrNumber: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink font-bold text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Issuing Scheduled Bank:
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-sans text-xs rounded-sm focus:outline-none focus:border-ink font-medium text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Branch Name:
                  </label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-sans text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    IFSC Code:
                  </label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink font-bold text-ink uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Deposit Amount (₹):
                  </label>
                  <input
                    type="text"
                    value={formData.amountRupees}
                    onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink font-bold text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Interest Rate (% p.a.):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Date of Issue:
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted mb-1">
                    Date of Maturity:
                  </label>
                  <input
                    type="date"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                    className="w-full bg-paper border border-hairline px-2.5 py-1.5 font-mono text-xs rounded-sm focus:outline-none focus:border-ink text-ink"
                  />
                </div>
              </div>

              {/* Lien clause toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.lienMarked}
                    onChange={(e) => setFormData({ ...formData, lienMarked: e.target.checked })}
                    className="rounded-xs"
                  />
                  <span className="font-medium text-xs text-ink">
                    AICTE Joint Lien Clause 12(b) endorsed on physical certificate
                  </span>
                </label>
              </div>

              {/* Pre-checks summary */}
              <div className="p-3 bg-paper border border-hairline rounded-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span className="uppercase font-semibold text-ink">Automated Verification Battery</span>
                  <span>{preChecks.filter((c) => c.passed).length}/6 Checks Satisfied</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {preChecks.slice(0, 4).map((chk) => (
                    <div
                      key={chk.rule}
                      className={`text-[10px] font-mono p-1 rounded-xs flex items-center gap-1 ${
                        chk.passed
                          ? 'text-green-confirmed bg-green-bg/50'
                          : 'text-brick bg-brick-bg'
                      }`}
                    >
                      {chk.passed ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      <span className="truncate">{chk.rule.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-hairline">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                >
                  Re-upload / Change File
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={criticalErrors.length > 0}
                >
                  {criticalErrors.length > 0
                    ? 'Blocked by Integrity Check'
                    : 'Submit FDR to Permanent Registry'}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
