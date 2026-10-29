import React from 'react';
import { useTranslation } from 'react-i18next';
import { Unplug } from 'lucide-react';

interface MockAdapterTagProps {
  className?: string;
}

export const MockAdapterTag: React.FC<MockAdapterTagProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted px-1.5 py-0.5 border border-dashed border-hairline bg-paper/70 rounded-sm select-none ${className}`}
      title="This integration operates via a deterministic in-memory simulated adapter"
    >
      <Unplug size={10} className="opacity-70" />
      <span>{t('common.mockAdapter', 'Mock adapter')}</span>
    </span>
  );
};
