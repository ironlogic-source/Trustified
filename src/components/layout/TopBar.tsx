import React, { useState } from 'react';
import { useAuthStore, ROLE_PROFILES } from '../../stores/authStore';
import { useClockStore } from '../../stores/clockStore';
import { useAlertStore } from '../../stores/alertStore';
import type { UserRole } from '../../engines/types';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  RotateCcw,
  Search,
  Languages,
  UserCheck,
  ChevronDown,
  Bell,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

interface TopBarProps {
  onOpenCommandPalette: () => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenCommandPalette }) => {
  const { t, i18n } = useTranslation();
  const currentRole = useAuthStore((state) => state.currentRole);
  const currentUser = useAuthStore((state) => state.currentUser);
  const setRole = useAuthStore((state) => state.setRole);

  const currentDate = useClockStore((state) => state.currentDate);
  const isCustomDate = useClockStore((state) => state.isCustomDate);
  const setDate = useClockStore((state) => state.setDate);
  const resetToToday = useClockStore((state) => state.resetToToday);
  const advanceDays = useClockStore((state) => state.advanceDays);

  const alerts = useAlertStore((state) => state.alerts);
  const refreshAlerts = useAlertStore((state) => state.refreshAlerts);

  const [dateInputVal, setDateInputVal] = useState(currentDate);

  const handleDateChange = (newDate: string) => {
    setDateInputVal(newDate);
    setDate(newDate);
    refreshAlerts();
  };

  const handleResetToday = () => {
    resetToToday();
    setDateInputVal('2026-10-27');
    refreshAlerts();
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const roles: { role: UserRole; title: string; color: string }[] = [
    { role: 'institution', title: t('roles.institution'), color: 'bg-body' },
    { role: 'scrutiny_officer', title: t('roles.scrutiny_officer'), color: 'bg-blue-system' },
    { role: 'regional_officer', title: t('roles.regional_officer'), color: 'bg-ochre' },
    { role: 'bank_verifier', title: t('roles.bank_verifier'), color: 'bg-green-confirmed' },
    { role: 'authority', title: t('roles.authority'), color: 'bg-brass' },
    { role: 'admin', title: t('roles.admin'), color: 'bg-brick' },
  ];

  return (
    <header className="h-12 min-h-[48px] bg-surface border-b border-hairline px-4 flex items-center justify-between z-20 sticky top-0 select-none">
      {/* Left: Quick search & simulated clock */}
      <div className="flex items-center gap-3">
        {/* Command palette search trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted bg-paper hover:bg-hairline/40 border border-hairline rounded-sm transition-colors duration-fast w-56 md:w-64 text-left font-sans"
        >
          <Search size={14} className="text-muted shrink-0" />
          <span className="truncate">Search FDR, Inst, Rule...</span>
          <kbd className="ml-auto font-mono text-[10px] bg-surface border border-hairline px-1 py-0.2 rounded-sm text-body">
            Ctrl+K
          </kbd>
        </button>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-hairline hidden md:block" />

        {/* Simulated Clock Widget */}
        <div className="flex items-center gap-2">
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-sm font-mono transition-colors ${
                  isCustomDate
                    ? 'border-ochre bg-ochre-bg text-ochre font-semibold'
                    : 'border-hairline bg-paper text-body hover:bg-hairline/30'
                }`}
                title="Adjust Simulated Date to test maturity escalations"
              >
                <Calendar size={13} className={isCustomDate ? 'text-ochre' : 'text-ink'} />
                <span>{currentDate}</span>
                {isCustomDate && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1 bg-ochre/20 rounded-sm">
                    Simulated
                  </span>
                )}
                <SlidersHorizontal size={11} className="opacity-60 ml-0.5" />
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                className="z-50 bg-surface border border-hairline p-4 rounded-sm shadow-modal w-72 text-xs space-y-3"
                sideOffset={6}
              >
                <div className="flex items-center justify-between border-b border-hairline pb-2">
                  <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                    Simulated Platform Clock
                  </span>
                  <button
                    onClick={handleResetToday}
                    className="text-[11px] text-ink hover:underline flex items-center gap-1 font-mono"
                  >
                    <RotateCcw size={11} />
                    Reset to Today
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1 font-mono">
                    Target Clock Date (YYYY-MM-DD):
                  </label>
                  <input
                    type="date"
                    value={dateInputVal}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-paper border border-hairline px-2 py-1.5 text-xs font-mono rounded-sm text-ink focus:outline-none focus:border-ink"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-muted font-mono">Quick Date Shift:</div>
                  <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                    <button
                      onClick={() => advanceDays(7)}
                      className="px-2 py-1 bg-paper hover:bg-hairline border border-hairline rounded-sm text-center"
                    >
                      +7d
                    </button>
                    <button
                      onClick={() => advanceDays(30)}
                      className="px-2 py-1 bg-paper hover:bg-hairline border border-hairline rounded-sm text-center"
                    >
                      +30d
                    </button>
                    <button
                      onClick={() => advanceDays(60)}
                      className="px-2 py-1 bg-paper hover:bg-hairline border border-hairline rounded-sm text-center"
                    >
                      +60d
                    </button>
                    <button
                      onClick={() => advanceDays(90)}
                      className="px-2 py-1 bg-paper hover:bg-hairline border border-hairline rounded-sm text-center"
                    >
                      +90d
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-muted leading-relaxed">
                  Advancing clock triggers automated maturity detection and the
                  90/60/30/15/7-day regulatory escalation ladder.
                </p>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {isCustomDate && (
            <button
              onClick={handleResetToday}
              className="text-xs text-muted hover:text-brick flex items-center gap-1 font-mono"
              title="Reset clock to seed reference date (2026-10-27)"
            >
              <RotateCcw size={12} />
              <span className="hidden lg:inline">{t('actions.resetToday')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Language toggle, Alerts icon, Role switcher */}
      <div className="flex items-center gap-3">
        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2 py-1 text-xs border border-hairline bg-paper hover:bg-hairline/40 rounded-sm font-medium text-body"
          title="Switch Language (English / हिन्दी)"
        >
          <Languages size={13} className="text-ink" />
          <span className="font-mono">{i18n.language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Role Switcher Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-2.5 py-1 text-xs border border-hairline bg-surface hover:bg-paper rounded-sm transition-colors duration-fast">
              <span className="w-2 h-2 rounded-full bg-brass" />
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-ink leading-tight text-[11px] uppercase tracking-wider">
                  {t(`roles.${currentRole}`)}
                </div>
                <div className="text-[10px] text-muted font-mono truncate max-w-[130px]">
                  {currentUser.name}
                </div>
              </div>
              <ChevronDown size={13} className="text-muted ml-0.5" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 bg-surface border border-hairline p-1.5 rounded-sm shadow-modal w-64 text-xs space-y-1"
              sideOffset={4}
            >
              <div className="px-2 py-1.5 border-b border-hairline text-muted font-mono text-[10px] uppercase tracking-wider">
                Select Operating Persona
              </div>

              {roles.map((r) => {
                const isSelected = currentRole === r.role;
                const profile = ROLE_PROFILES[r.role];

                return (
                  <DropdownMenu.Item
                    key={r.role}
                    onClick={() => setRole(r.role)}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded-sm cursor-pointer select-none outline-none ${
                      isSelected ? 'bg-paper font-semibold border-l-2 border-l-ink' : 'hover:bg-paper/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1 ${r.color}`} />
                    <div className="flex-1">
                      <div className="text-ink text-xs">{r.title}</div>
                      <div className="text-[10px] text-muted font-mono truncate">
                        {profile.name}
                      </div>
                    </div>
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
};
