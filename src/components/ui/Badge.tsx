import React from 'react';
import type { FDRStatus } from '../../engines/types';
import { useTranslation } from 'react-i18next';

interface BadgeProps {
  status: FDRStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', className = '' }) => {
  const { t } = useTranslation();

  const getStatusStyle = (st: string) => {
    switch (st) {
      case 'active':
      case 'released':
        return 'bg-green-bg text-green-confirmed border-green-confirmed/40';
      case 'verified':
      case 'renewed':
        return 'bg-brass-light text-brass border-brass/40';
      case 'under_scrutiny':
      case 'submitted':
        return 'bg-blue-bg text-blue-system border-blue-system/40';
      case 'expiring':
      case 'renewal_pending':
      case 'release_requested':
        return 'bg-ochre-bg text-ochre border-ochre/40';
      case 'discrepancy':
      case 'rejected':
      case 'matured':
        return 'bg-brick-bg text-brick border-brick/40';
      default:
        return 'bg-paper text-muted border-hairline';
    }
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.2',
    md: 'text-xs px-2 py-0.5',
  };

  const label = t(`status.${status}`, status.replace(/_/g, ' '));

  return (
    <span
      className={`inline-flex items-center rounded-sm font-mono uppercase font-medium border ${getStatusStyle(
        status,
      )} ${sizeClasses[size]} ${className}`}
    >
      {label}
    </span>
  );
};
