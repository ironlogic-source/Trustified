import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '../../engines/types';
import {
  LayoutDashboard,
  FileSpreadsheet,
  UploadCloud,
  Network,
  BellRing,
  KeyRound,
  ScrollText,
  Sliders,
  Shield,
  Layers,
  BarChart2,
} from 'lucide-react';

interface NavItem {
  id: string;
  to: string;
  labelKey: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
  badgeCount?: number;
}

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentRole = useAuthStore((state) => state.currentRole);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      to: '/',
      labelKey: 'nav.dashboard',
      icon: <LayoutDashboard size={16} />,
      allowedRoles: ['scrutiny_officer', 'regional_officer', 'authority', 'admin'],
    },
    {
      id: 'fdrList',
      to: '/fdrs',
      labelKey: 'nav.fdrList',
      icon: <FileSpreadsheet size={16} />,
      allowedRoles: [
        'institution',
        'scrutiny_officer',
        'regional_officer',
        'bank_verifier',
        'authority',
        'admin',
      ],
    },
    {
      id: 'upload',
      to: '/upload',
      labelKey: 'nav.upload',
      icon: <UploadCloud size={16} />,
      allowedRoles: ['institution', 'admin'],
    },
    {
      id: 'fraudGraph',
      to: '/fraud-graph',
      labelKey: 'nav.fraudGraph',
      icon: <Network size={16} />,
      allowedRoles: ['regional_officer', 'authority', 'admin'],
    },
    {
      id: 'alerts',
      to: '/alerts',
      labelKey: 'nav.alerts',
      icon: <BellRing size={16} />,
      allowedRoles: [
        'institution',
        'scrutiny_officer',
        'regional_officer',
        'authority',
        'admin',
      ],
    },
    {
      id: 'release',
      to: '/release',
      labelKey: 'nav.release',
      icon: <KeyRound size={16} />,
      allowedRoles: ['institution', 'regional_officer', 'authority', 'admin'],
    },
    {
      id: 'reports',
      to: '/reports',
      labelKey: 'nav.reports',
      icon: <BarChart2 size={16} />,
      allowedRoles: ['scrutiny_officer', 'regional_officer', 'authority', 'admin'],
    },
    {
      id: 'auditLog',
      to: '/audit',
      labelKey: 'nav.auditLog',
      icon: <ScrollText size={16} />,
      allowedRoles: ['authority', 'admin'],
    },
    {
      id: 'admin',
      to: '/admin',
      labelKey: 'nav.admin',
      icon: <Sliders size={16} />,
      allowedRoles: ['admin'],
    },
  ];

  // Filter items permissible for current persona
  const visibleNav = navItems.filter((item) =>
    item.allowedRoles.includes(currentRole),
  );

  return (
    <aside className="w-60 min-w-[240px] bg-paper border-r border-hairline flex flex-col justify-between select-none h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-12 border-b border-hairline px-4 flex items-center gap-2.5 bg-surface">
          <div className="w-7 h-7 bg-ink rounded-sm flex items-center justify-center text-paper border border-brass shadow-subtle shrink-0">
            <Shield size={15} className="text-white" />
          </div>
          <div className="truncate">
            <div className="font-serif font-bold text-ink text-sm leading-tight tracking-tight">
              FDR-KAVACH
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-muted truncate">
              AICTE Regulation Bureau
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-widest text-muted/80 font-medium">
            Registry Navigation
          </div>

          {visibleNav.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-sans rounded-sm transition-all duration-fast ${
                  isActive
                    ? 'bg-surface font-semibold text-ink shadow-subtle border-l-2 border-l-ink border-y border-r border-hairline/60'
                    : 'text-body hover:bg-surface/80 hover:text-ink'
                }`}
              >
                <span className={isActive ? 'text-ink' : 'text-muted'}>
                  {item.icon}
                </span>
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status Banner */}
      <div className="p-3 border-t border-hairline bg-surface/60 text-[11px] font-mono text-muted space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-confirmed animate-pulse" />
            <span className="text-ink font-medium">Bureau Node</span>
          </span>
          <span className="text-[10px]">v2.4.0</span>
        </div>
        <div className="text-[10px] text-muted truncate">
          AICTE Central Ledger Engine
        </div>
      </div>
    </aside>
  );
};
