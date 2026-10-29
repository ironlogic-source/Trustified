import React from 'react';
import type { FDR } from '../../engines/types';
import { formatCrore } from '../../engines/formatters';
import { useTranslation } from 'react-i18next';

interface TrustBarProps {
  fdrs: FDR[];
  className?: string;
}

export const TrustBar: React.FC<TrustBarProps> = ({ fdrs, className = '' }) => {
  const { t } = useTranslation();

  // Aggregate amounts by tier (in paise)
  const totals = {
    bank_confirmed: 0,
    officer_verified: 0,
    system_validated: 0,
    submitted: 0,
  };

  let grandTotal = 0;

  for (const f of fdrs) {
    if (f.status === 'rejected') continue;
    const tier = f.trustTier || 'submitted';
    totals[tier] = (totals[tier] || 0) + f.amount;
    grandTotal += f.amount;
  }

  const safeTotal = grandTotal > 0 ? grandTotal : 1;

  const segments = [
    {
      tier: 'bank_confirmed' as const,
      label: t('tier.bank_confirmed'),
      amount: totals.bank_confirmed,
      pct: (totals.bank_confirmed / safeTotal) * 100,
      color: 'bg-green-confirmed',
      textColor: 'text-green-confirmed',
      dotColor: '#1F7A4D',
    },
    {
      tier: 'officer_verified' as const,
      label: t('tier.officer_verified'),
      amount: totals.officer_verified,
      pct: (totals.officer_verified / safeTotal) * 100,
      color: 'bg-brass',
      textColor: 'text-brass',
      dotColor: '#A8842C',
    },
    {
      tier: 'system_validated' as const,
      label: t('tier.system_validated'),
      amount: totals.system_validated,
      pct: (totals.system_validated / safeTotal) * 100,
      color: 'bg-blue-system',
      textColor: 'text-blue-system',
      dotColor: '#2B5FA8',
    },
    {
      tier: 'submitted' as const,
      label: t('tier.submitted'),
      amount: totals.submitted,
      pct: (totals.submitted / safeTotal) * 100,
      color: 'bg-[#C2BCB0]',
      textColor: 'text-muted',
      dotColor: '#C2BCB0',
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* The 4-segment progress bar */}
      <div className="h-3 w-full bg-hairline/40 rounded-sm overflow-hidden flex shadow-inner">
        {segments.map((seg) => {
          if (seg.pct <= 0) return null;
          return (
            <div
              key={seg.tier}
              style={{ width: `${seg.pct}%` }}
              className={`h-full ${seg.color} transition-all duration-300 relative group`}
              title={`${seg.label}: ${formatCrore(seg.amount)} (${seg.pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {segments.map((seg) => (
          <div key={seg.tier} className="flex items-center justify-between border-l-2 pl-2 border-hairline hover:border-ink transition-colors">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: seg.dotColor }}
              />
              <span className="text-body font-medium">{seg.label}</span>
            </div>
            <div className="text-right font-mono">
              <span className="font-semibold text-ink">{formatCrore(seg.amount)}</span>
              <span className="text-muted ml-1 text-[11px]">({seg.pct.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
