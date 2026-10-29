import React, { useState } from 'react';
import { useAuditStore } from '../../stores/auditStore';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Hash,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
} from 'lucide-react';

export const AuditLog: React.FC = () => {
  const { t } = useTranslation();
  const entries = useAuditStore((state) => state.entries);
  const isVerifying = useAuditStore((state) => state.isVerifying);
  const verificationResult = useAuditStore((state) => state.verificationResult);
  const runIntegrityCheck = useAuditStore((state) => state.runIntegrityCheck);
  const resetVerification = useAuditStore((state) => state.resetVerification);

  const [search, setSearch] = useState('');

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.actorId.toLowerCase().includes(q) ||
      e.entityId.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Immutable Regulatory Ledger
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.auditLog')}
          </h1>
        </div>

        {/* Verify Integrity Action */}
        <div className="flex items-center gap-3">
          <Button
            variant={verificationResult ? 'secondary' : 'primary'}
            isLoading={isVerifying}
            onClick={() => runIntegrityCheck()}
            icon={<ShieldCheck size={16} />}
          >
            {t('actions.verifyIntegrity')}
          </Button>

          {verificationResult && (
            <button
              onClick={resetVerification}
              className="p-1.5 border border-hairline bg-surface hover:bg-paper rounded-sm text-muted hover:text-ink transition-colors"
              title="Reset verification state"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-sm border shadow-subtle flex items-start justify-between gap-4 ${
            verificationResult.valid
              ? 'bg-green-bg border-green-confirmed text-green-confirmed'
              : 'bg-brick-bg border-brick text-brick'
          }`}
        >
          <div className="flex items-start gap-3">
            {verificationResult.valid ? (
              <ShieldCheck size={24} className="shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert size={24} className="shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-serif font-bold text-base">
                {verificationResult.valid
                  ? t('audit.integrityValid')
                  : `${t('audit.integrityBroken')} #${verificationResult.brokenAt}`}
              </div>
              <div className="text-xs font-sans leading-relaxed text-body">
                {verificationResult.valid ? (
                  <span>
                    All {entries.length} cryptographic hashes mathematically verified against
                    SHA-256 pre-images via Web Crypto API. No tampering detected.
                  </span>
                ) : (
                  <span>
                    <strong>Tamper Alert:</strong> Entry #{verificationResult.brokenAt} ('
                    {verificationResult.entry?.action}') failed hash verification. The stored
                    hash does not match the recomputed SHA-256 digest of the entry payload,
                    indicating illegal database tampering or unauthorized record modification.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs shrink-0">
            <div>Engine: <strong>crypto.subtle (SHA-256)</strong></div>
            <div>Blocks Verified: <strong>{entries.length}</strong></div>
          </div>
        </div>
      )}

      {/* Audit Log Entries Table */}
      <div className="bg-surface border border-hairline rounded-sm shadow-subtle overflow-hidden space-y-3">
        <div className="p-3 border-b border-hairline flex flex-col md:flex-row md:items-center justify-between gap-3 bg-paper/50">
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-ink" />
            <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider">
              Cryptographic Ledger Blocks ({filteredEntries.length} Entries)
            </h2>
          </div>

          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Search actions, hashes, actors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 bg-surface border border-hairline text-xs rounded-sm font-sans w-56 focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#EFECE6] border-b border-hairline sticky top-0 z-10 text-ink uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="px-3 py-2 border-r border-hairline/60 w-12">#</th>
                <th className="px-3 py-2 border-r border-hairline/60">Timestamp</th>
                <th className="px-3 py-2 border-r border-hairline/60">Action</th>
                <th className="px-3 py-2 border-r border-hairline/60">Actor & Role</th>
                <th className="px-3 py-2 border-r border-hairline/60">Entity ID</th>
                <th className="px-3 py-2 border-r border-hairline/60">Details</th>
                <th className="px-3 py-2">SHA-256 Block Hash</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-hairline font-mono text-[12px]">
              {filteredEntries.map((entry, index) => {
                const isTamperedRow =
                  verificationResult &&
                  !verificationResult.valid &&
                  verificationResult.brokenAt === index;

                return (
                  <tr
                    key={entry.id}
                    className={`h-[36px] transition-colors ${
                      isTamperedRow
                        ? 'bg-brick-bg text-brick font-bold border-l-4 border-l-brick'
                        : 'hover:bg-paper/70 text-body'
                    }`}
                  >
                    <td className="px-3 py-1.5 border-r border-hairline/40 text-muted">
                      {index}
                    </td>
                    <td className="px-3 py-1.5 border-r border-hairline/40 whitespace-nowrap text-muted text-[11px]">
                      {entry.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-3 py-1.5 border-r border-hairline/40 whitespace-nowrap">
                      <span className="font-semibold text-ink px-1.5 py-0.5 bg-paper border border-hairline rounded-sm text-[11px]">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 border-r border-hairline/40 whitespace-nowrap text-[11px]">
                      <span className="text-ink font-semibold">{entry.actorId}</span>{' '}
                      <span className="text-muted">({entry.actorRole})</span>
                    </td>
                    <td className="px-3 py-1.5 border-r border-hairline/40 whitespace-nowrap text-[11px] text-ink font-medium">
                      {entry.entityId}
                    </td>
                    <td className="px-3 py-1.5 border-r border-hairline/40 font-sans text-[11.5px] max-w-md truncate">
                      {entry.details}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[10px] select-all ${
                            isTamperedRow ? 'text-brick underline' : 'text-muted'
                          }`}
                          title={`Full SHA-256: ${entry.hash}\nPrevious: ${entry.previousHash}`}
                        >
                          {entry.hash.slice(0, 12)}…{entry.hash.slice(-8)}
                        </span>
                        {isTamperedRow && (
                          <span className="text-[10px] bg-brick text-white px-1.5 py-0.2 rounded-xs">
                            TAMPERED
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
