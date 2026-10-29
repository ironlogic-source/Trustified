import React from 'react';
import type { TrustTier } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import { Check, ShieldCheck, Cpu, FileText } from 'lucide-react';

interface TrustTierSealProps {
  tier: TrustTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const TrustTierSeal: React.FC<TrustTierSealProps> = ({
  tier,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const { t } = useTranslation();

  const getTierDetails = () => {
    switch (tier) {
      case 'bank_confirmed':
        return {
          label: t('tier.bank_confirmed'),
          icon: Check,
          badgeClass:
            'bg-green-confirmed text-white border-green-confirmed shadow-subtle',
          outerBorder: 'border-green-confirmed/40',
          indicator: 'Secured',
        };
      case 'officer_verified':
        return {
          label: t('tier.officer_verified'),
          icon: ShieldCheck,
          badgeClass: 'bg-brass-light text-brass border-brass',
          outerBorder: 'border-brass/40',
          indicator: 'Verified',
        };
      case 'system_validated':
        return {
          label: t('tier.system_validated'),
          icon: Cpu,
          badgeClass: 'bg-blue-bg text-blue-system border-blue-system',
          outerBorder: 'border-blue-system/40',
          indicator: 'Validated',
        };
      case 'submitted':
      default:
        return {
          label: t('tier.submitted'),
          icon: FileText,
          badgeClass: 'bg-paper text-muted border-hairline',
          outerBorder: 'border-hairline/60',
          indicator: 'Unverified',
        };
    }
  };

  const details = getTierDetails();
  const Icon = details.icon;

  const sizeClasses = {
    sm: 'text-[10px] py-0.5 px-2 tracking-wider',
    md: 'text-[11px] py-1 px-2.5 tracking-widest',
    lg: 'text-xs py-1.5 px-3.5 tracking-widest font-semibold',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      title={`Trust Level: ${details.label}`}
    >
      {/* Outer pseudo stamp double border */}
      <div
        className={`inline-flex items-center gap-1.5 font-mono uppercase font-medium rounded-sm border ${details.badgeClass} ${sizeClasses[size]}`}
      >
        {showIcon && <Icon size={iconSizes[size]} className="stroke-[2.2]" />}
        <span>{details.label}</span>
      </div>
    </div>
  );
};
