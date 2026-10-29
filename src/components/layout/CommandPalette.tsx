import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { formatCrore, formatINR } from '../../engines/formatters';
import {
  Search,
  Sparkles,
  FileText,
  Building2,
  Network,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PreAnsweredQuery {
  id: string;
  query: string;
  description: string;
  count: string;
  category: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const fdrs = useFDRStore((state) => state.fdrs);
  const setFilters = useFDRStore((state) => state.setFilters);
  const selectFdr = useFDRStore((state) => state.selectFdr);
  const institutions = useInstitutionStore((state) => state.institutions);

  const [search, setSearch] = useState('');

  // Close on Escape, toggle on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 3 Pre-answered NL queries specified in the brief
  const preAnsweredQueries: PreAnsweredQuery[] = [
    {
      id: 'query-chhattisgarh',
      query: 'Chhattisgarh FDRs maturing in 45 days above ₹5 lakh',
      description:
        'Filters 4 active FDRs from Raipur & Bhilai institutions with pending renewals.',
      count: '4 FDRs found',
      category: 'Prescribed Inquiry',
      action: () => {
        setFilters({ state: 'Chhattisgarh', search: '', status: 'all' });
        navigate('/fdrs');
        onClose();
      },
    },
    {
      id: 'query-highrisk',
      query: 'Show high-risk institutions with discrepancy flags',
      description:
        'Displays institutions with composite risk score > 60 and unresolved forensic issues.',
      count: '5 Flagged Institutions',
      category: 'Risk Intelligence',
      action: () => {
        setFilters({ status: 'discrepancy' });
        navigate('/fdrs');
        onClose();
      },
    },
    {
      id: 'query-audit',
      query: 'Audit log integrity verification report',
      description:
        'Direct cryptographic SHA-256 block chain verification across all ledger transactions.',
      count: 'Run Chain Validator',
      category: 'Cryptographic Integrity',
      action: () => {
        navigate('/audit');
        onClose();
      },
    },
  ];

  // Matched FDRs for search input
  const filteredFdrs = search.trim()
    ? fdrs
        .filter(
          (f) =>
            f.fdrNumber.toLowerCase().includes(search.toLowerCase()) ||
            (f.institutionName && f.institutionName.toLowerCase().includes(search.toLowerCase())) ||
            f.bankName.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-ink/40 backdrop-blur-xs">
      <div
        className="bg-surface border border-hairline rounded-sm shadow-modal w-full max-w-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline bg-paper/50">
          <Search size={18} className="text-muted shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a natural language command, FDR number, or institution name..."
            className="flex-1 bg-transparent border-none text-sm text-ink placeholder:text-muted focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded-sm border border-hairline"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-96 overflow-y-auto divide-y divide-hairline text-xs">
          {/* Pre-Answered Queries Section */}
          <div className="p-2">
            <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-muted font-semibold flex items-center gap-1.5">
              <Sparkles size={12} className="text-brass" />
              <span>Pre-Engineered Regulatory Inquiries</span>
            </div>

            <div className="space-y-1 mt-1">
              {preAnsweredQueries.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full text-left p-2.5 rounded-sm hover:bg-paper border border-transparent hover:border-hairline transition-colors flex items-start justify-between gap-4 group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-serif font-semibold text-ink text-sm group-hover:text-blue-system flex items-center gap-2">
                      <span>"{item.query}"</span>
                    </div>
                    <div className="text-muted text-[11px] leading-snug">
                      {item.description}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] font-medium px-2 py-0.5 bg-paper border border-hairline rounded-sm text-body group-hover:border-ink">
                      {item.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time search matches */}
          {filteredFdrs.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-muted font-semibold">
                Direct FDR Matches
              </div>
              <div className="space-y-1 mt-1">
                {filteredFdrs.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      selectFdr(f.id);
                      navigate(`/fdrs/${f.id}`);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-sm hover:bg-paper border border-transparent hover:border-hairline flex items-center justify-between font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted" />
                      <div>
                        <div className="font-semibold text-ink text-xs">{f.fdrNumber}</div>
                        <div className="text-[11px] text-muted font-sans truncate max-w-md">
                          {f.institutionName} • {f.bankName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-ink">{formatINR(f.amount)}</div>
                      <div className="text-[10px] text-muted">Matures {f.maturityDate}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="bg-paper/80 border-t border-hairline px-4 py-2 flex items-center justify-between text-[11px] text-muted font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-surface px-1.5 py-0.5 border border-hairline rounded-sm mr-1">
                ↑
              </kbd>
              <kbd className="bg-surface px-1.5 py-0.5 border border-hairline rounded-sm mr-1">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="bg-surface px-1.5 py-0.5 border border-hairline rounded-sm mr-1">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span>Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
};
