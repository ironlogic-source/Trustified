import React, { useEffect, useState } from 'react';
import { getSecuredAmount, getClaimedAmount } from '../../engines/trust-tier';
import { formatCrore } from '../../engines/formatters';
import type { FDR } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

interface HeadlineFigureProps {
  fdrs: FDR[];
}

export const HeadlineFigure: React.FC<HeadlineFigureProps> = ({ fdrs }) => {
  const { t } = useTranslation();
  const targetSecured = getSecuredAmount(fdrs);
  const targetClaimed = getClaimedAmount(fdrs);

  const [animatedSecured, setAnimatedSecured] = useState(0);
  const [animatedClaimed, setAnimatedClaimed] = useState(0);

  useEffect(() => {
    // Smooth 800ms ease-out count-up on load
    const duration = 800;
    const steps = 30;
    const intervalTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedSecured(Math.floor(targetSecured * ease));
      setAnimatedClaimed(Math.floor(targetClaimed * ease));

      if (currentStep >= steps) {
        setAnimatedSecured(targetSecured);
        setAnimatedClaimed(targetClaimed);
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [targetSecured, targetClaimed]);

  const securedPercentage =
    targetClaimed > 0 ? ((targetSecured / targetClaimed) * 100).toFixed(1) : '0';

  return (
    <div className="bg-surface border border-hairline p-6 rounded-sm shadow-subtle relative overflow-hidden">
      {/* Decorative hairline watermark stamp */}
      <div className="absolute right-6 -bottom-6 opacity-5 pointer-events-none">
        <ShieldCheck size={160} className="text-ink" />
      </div>

      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono font-semibold block mb-1">
            Aggregate Regulatory Portfolio Guarantee
          </span>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink tracking-tight flex flex-wrap items-baseline gap-2">
            <span className="text-green-confirmed font-bold">
              {formatCrore(animatedSecured)}
            </span>
            <span className="text-body font-normal text-base md:text-lg">
              {t('dashboard.secured')} {t('dashboard.of')}
            </span>
            <span className="text-ink font-semibold">
              {formatCrore(animatedClaimed)}
            </span>
            <span className="text-body font-normal text-base md:text-lg">
              {t('dashboard.claimed')}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-paper/60 border border-hairline px-4 py-2.5 rounded-sm">
          <div className="text-right">
            <div className="text-[11px] uppercase font-mono text-muted tracking-wider">
              Secured Ratio
            </div>
            <div className="font-mono text-lg font-bold text-green-confirmed">
              {securedPercentage}%
            </div>
          </div>
          <div className="h-8 w-px bg-hairline" />
          <div className="text-right">
            <div className="text-[11px] uppercase font-mono text-muted tracking-wider">
              Total Instruments
            </div>
            <div className="font-mono text-lg font-bold text-ink">
              {fdrs.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
