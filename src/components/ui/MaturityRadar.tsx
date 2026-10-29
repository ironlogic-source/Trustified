import React from 'react';
import type { FDR } from '../../engines/types';
import { formatCrore } from '../../engines/formatters';
import { useClockStore } from '../../stores/clockStore';
import { useFDRStore } from '../../stores/fdrStore';
import { Calendar, FilterX } from 'lucide-react';

interface MaturityRadarProps {
  fdrs: FDR[];
  className?: string;
}

export const MaturityRadar: React.FC<MaturityRadarProps> = ({ fdrs, className = '' }) => {
  const currentDate = useClockStore((state) => state.currentDate);
  const selectedMonthYear = useFDRStore((state) => state.filters.monthYear);
  const setFilters = useFDRStore((state) => state.filters);
  const updateFilters = useFDRStore((state) => state.setFilters);

  // Generate 12 months starting from currentDate's year-month
  const baseDate = new Date(currentDate);
  const months: { key: string; label: string; year: number; monthName: string; totalAmount: number; count: number }[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    const monthName = d.toLocaleString('en-IN', { month: 'short' });
    const label = `${monthName} ${String(year).slice(2)}`;

    months.push({
      key,
      label,
      year,
      monthName,
      totalAmount: 0,
      count: 0,
    });
  }

  // Populate amounts from FDRs
  let maxAmount = 0;
  for (const f of fdrs) {
    if (f.status === 'released' || f.status === 'rejected') continue;
    const fdrMonthKey = f.maturityDate.slice(0, 7); // YYYY-MM
    const target = months.find((m) => m.key === fdrMonthKey);
    if (target) {
      target.totalAmount += f.amount;
      target.count += 1;
      if (target.totalAmount > maxAmount) {
        maxAmount = target.totalAmount;
      }
    }
  }

  const handleCellClick = (key: string) => {
    if (selectedMonthYear === key) {
      updateFilters({ monthYear: null });
    } else {
      updateFilters({ monthYear: key });
    }
  };

  return (
    <div className={`bg-surface border border-hairline p-4 rounded-sm shadow-subtle ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-ink" />
          <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wider">
            12-Month Maturity Radar
          </h2>
          <span className="text-xs text-muted font-normal">
            (Intensity = Total ₹ Maturing)
          </span>
        </div>

        {selectedMonthYear && (
          <button
            onClick={() => updateFilters({ monthYear: null })}
            className="text-xs text-brick hover:underline flex items-center gap-1 font-mono font-medium"
          >
            <FilterX size={12} />
            Clear Filter ({selectedMonthYear})
          </button>
        )}
      </div>

      {/* 12-month calendar heatmap cells */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {months.map((m) => {
          const ratio = maxAmount > 0 ? m.totalAmount / maxAmount : 0;
          const isSelected = selectedMonthYear === m.key;

          // Color intensity ladder (using Kavach palette ochre/brick/green)
          let bgColor = 'bg-paper';
          let textColor = 'text-muted';
          let borderClass = 'border-hairline';

          if (ratio > 0.75) {
            bgColor = 'bg-brick/20 hover:bg-brick/30';
            textColor = 'text-brick font-bold';
            borderClass = 'border-brick/50';
          } else if (ratio > 0.4) {
            bgColor = 'bg-ochre/20 hover:bg-ochre/30';
            textColor = 'text-ochre font-bold';
            borderClass = 'border-ochre/50';
          } else if (ratio > 0.1) {
            bgColor = 'bg-blue-bg hover:bg-blue-bg/80';
            textColor = 'text-blue-system font-medium';
            borderClass = 'border-blue-system/30';
          } else if (m.count > 0) {
            bgColor = 'bg-paper hover:bg-hairline/40';
            textColor = 'text-body font-medium';
          }

          if (isSelected) {
            borderClass = 'ring-2 ring-ink border-ink font-bold';
          }

          return (
            <button
              key={m.key}
              onClick={() => handleCellClick(m.key)}
              title={`${m.label}: ${formatCrore(m.totalAmount)} across ${m.count} instrument(s)`}
              className={`p-2.5 rounded-sm border ${borderClass} ${bgColor} transition-all duration-fast text-center flex flex-col justify-between h-[72px] cursor-pointer focus-visible:outline-none`}
            >
              <div className="text-[11px] font-mono tracking-wide text-muted font-medium">
                {m.label}
              </div>
              <div className={`font-mono text-xs ${textColor}`}>
                {m.totalAmount > 0 ? formatCrore(m.totalAmount) : '—'}
              </div>
              <div className="text-[10px] font-mono text-muted/70">
                {m.count > 0 ? `${m.count} FDRs` : '0'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
