import React from 'react';
import type { RiskFactor } from '../../engines/types';
import { getRiskBand } from '../../engines/risk-score';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskScoreGaugeProps {
  score: number;
  factors?: RiskFactor[];
  institutionName?: string;
  showFactors?: boolean;
  className?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  factors = [],
  institutionName,
  showFactors = true,
  className = '',
}) => {
  const band = getRiskBand(score);

  const bandConfigs = {
    low: {
      color: 'text-green-confirmed',
      bg: 'bg-green-bg',
      border: 'border-green-confirmed',
      barColor: 'bg-green-confirmed',
      label: 'Low Risk',
      icon: ShieldCheck,
      description: 'Satisfactory regulatory compliance and verified banking instruments.',
    },
    moderate: {
      color: 'text-ochre',
      bg: 'bg-ochre-bg',
      border: 'border-ochre',
      barColor: 'bg-ochre',
      label: 'Moderate Risk',
      icon: AlertTriangle,
      description: 'Portfolio contains maturing deposits or unverified institutional updates.',
    },
    high: {
      color: 'text-brick',
      bg: 'bg-brick-bg',
      border: 'border-brick',
      barColor: 'bg-brick',
      label: 'High Risk (Flagged)',
      icon: ShieldAlert,
      description: 'Critical integrity violations, document reuse, or severe discrepancy detected.',
    },
  };

  const current = bandConfigs[band];
  const Icon = current.icon;

  return (
    <div className={`bg-surface border border-hairline p-5 rounded-sm shadow-subtle ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {institutionName && (
            <div className="text-xs text-muted font-medium mb-0.5 truncate max-w-sm">
              {institutionName}
            </div>
          )}
          <h3 className="font-sans font-semibold text-sm text-ink uppercase tracking-wider flex items-center gap-1.5">
            Composite Risk Assessment
          </h3>
          <p className="text-xs text-muted mt-0.5">{current.description}</p>
        </div>

        {/* Big Score Box */}
        <div
          className={`flex flex-col items-center justify-center min-w-[76px] px-3 py-2 rounded-sm border ${current.border} ${current.bg}`}
        >
          <div className="flex items-center gap-1">
            <Icon size={14} className={current.color} />
            <span className={`font-mono text-2xl font-bold ${current.color}`}>{score}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-body">
            / 100
          </span>
          <span className={`text-[10px] font-mono uppercase font-bold mt-0.5 ${current.color}`}>
            {current.label}
          </span>
        </div>
      </div>

      {/* Visual meter bar with 3 segments (0-30, 31-60, 61-100) */}
      <div className="space-y-1.5 mb-4">
        <div className="relative h-2.5 bg-paper border border-hairline rounded-sm overflow-hidden flex">
          <div className="w-[30%] bg-green-confirmed/20 border-r border-hairline" title="0-30 Low" />
          <div className="w-[30%] bg-ochre/20 border-r border-hairline" title="31-60 Moderate" />
          <div className="w-[40%] bg-brick/20" title="61-100 High" />

          {/* Pointer indicator */}
          <div
            style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
            className="absolute top-0 bottom-0 w-1 bg-ink -ml-0.5 shadow-sm"
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted">
          <span>0 (Low)</span>
          <span>30</span>
          <span>60</span>
          <span>100 (Critical)</span>
        </div>
      </div>

      {/* Factor Breakdown */}
      {showFactors && factors.length > 0 && (
        <div className="border-t border-hairline pt-3 mt-3">
          <div className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
            Weighted Factor Contributions
          </div>
          <div className="space-y-2">
            {factors.map((f) => {
              const contributionPct = (f.score / f.maxScore) * 100;
              const isHighContrib = f.score >= f.weight * 0.6;
              return (
                <div key={f.name} className="text-xs">
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-body font-medium">{f.description}</span>
                    <span className="font-mono text-muted">
                      <strong className={isHighContrib ? 'text-brick font-semibold' : 'text-ink'}>
                        {f.score.toFixed(1)}
                      </strong>{' '}
                      / {f.weight} pts
                    </span>
                  </div>
                  <div className="h-1.5 bg-paper rounded-none overflow-hidden border border-hairline/60">
                    <div
                      style={{ width: `${contributionPct}%` }}
                      className={`h-full ${
                        isHighContrib ? 'bg-brick' : f.score > 0 ? 'bg-ochre' : 'bg-green-confirmed'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
