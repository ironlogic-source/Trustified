import React, { useMemo, useState } from 'react';
import { useFDRStore } from '../../stores/fdrStore';
import { useInstitutionStore } from '../../stores/institutionStore';
import { formatCrore, formatINR } from '../../engines/formatters';
import { useClockStore } from '../../stores/clockStore';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Download,
  FileText,
  TrendingUp,
  MapPin,
  Building,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { FDRStatus, TrustTier } from '../../engines/types';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, colorClass = 'text-ink' }) => (
  <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-1">
    <div className="text-[10px] uppercase font-mono tracking-widest text-muted">{label}</div>
    <div className={`font-mono text-2xl font-bold ${colorClass}`}>{value}</div>
    {sub && <div className="text-xs text-muted font-sans">{sub}</div>}
  </div>
);

const STATUS_ORDER: FDRStatus[] = [
  'active', 'expiring', 'under_scrutiny', 'verified', 'submitted',
  'matured', 'renewed', 'release_requested', 'released', 'discrepancy', 'rejected',
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-confirmed',
  expiring: 'bg-brick',
  under_scrutiny: 'bg-blue-system',
  verified: 'bg-brass',
  submitted: 'bg-muted',
  matured: 'bg-ochre',
  renewed: 'bg-green-confirmed',
  release_requested: 'bg-ochre',
  released: 'bg-green-confirmed',
  discrepancy: 'bg-brick',
  rejected: 'bg-brick',
};

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const fdrs = useFDRStore((s) => s.fdrs);
  const institutions = useInstitutionStore((s) => s.institutions);
  const currentDate = useClockStore((s) => s.currentDate);
  const [activeReport, setActiveReport] = useState<'status' | 'trust' | 'maturity' | 'state'>('status');

  // ── Computed aggregates ─────────────────────────────────────────────────────

  const totalAmount = useMemo(() =>
    fdrs.reduce((s, f) => s + (f.status !== 'rejected' ? f.amount : 0), 0), [fdrs]);

  const securedAmount = useMemo(() =>
    fdrs.filter((f) => f.trustTier === 'bank_confirmed' && f.status !== 'rejected')
      .reduce((s, f) => s + f.amount, 0), [fdrs]);

  const expiring30 = useMemo(() => {
    const today = new Date(currentDate);
    return fdrs.filter((f) => {
      const mat = new Date(f.maturityDate);
      const days = Math.ceil((mat.getTime() - today.getTime()) / 86400000);
      return days >= 0 && days <= 30 && f.status !== 'released' && f.status !== 'rejected';
    });
  }, [fdrs, currentDate]);

  const discrepancies = useMemo(() =>
    fdrs.filter((f) => f.status === 'discrepancy'), [fdrs]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<FDRStatus, { count: number; amount: number }>();
    for (const f of fdrs) {
      const curr = map.get(f.status) ?? { count: 0, amount: 0 };
      map.set(f.status, { count: curr.count + 1, amount: curr.amount + f.amount });
    }
    return STATUS_ORDER.map((s) => ({
      status: s,
      label: t(`status.${s}`, { defaultValue: s }),
      ...( map.get(s) ?? { count: 0, amount: 0 }),
    })).filter((r) => r.count > 0);
  }, [fdrs, t]);

  const maxStatusCount = useMemo(() =>
    Math.max(...statusBreakdown.map((r) => r.count), 1), [statusBreakdown]);

  // Trust tier breakdown
  const tierBreakdown = useMemo(() => {
    const tiers: TrustTier[] = ['bank_confirmed', 'officer_verified', 'system_validated', 'submitted'];
    return tiers.map((tier) => {
      const items = fdrs.filter((f) => f.trustTier === tier && f.status !== 'rejected');
      return {
        tier,
        label: t(`tier.${tier}`, { defaultValue: tier }),
        count: items.length,
        amount: items.reduce((s, f) => s + f.amount, 0),
      };
    });
  }, [fdrs, t]);

  // State breakdown
  const stateBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number; institutions: Set<string> }>();
    for (const inst of institutions) {
      const curr = map.get(inst.state) ?? { count: 0, amount: 0, institutions: new Set() };
      curr.institutions.add(inst.id);
      map.set(inst.state, curr);
    }
    for (const fdr of fdrs) {
      const inst = institutions.find((i) => i.id === fdr.institutionId);
      if (inst) {
        const curr = map.get(inst.state);
        if (curr) {
          curr.count += 1;
          curr.amount += fdr.status !== 'rejected' ? fdr.amount : 0;
        }
      }
    }
    return Array.from(map.entries())
      .map(([state, data]) => ({ state, ...data, instCount: data.institutions.size }))
      .sort((a, b) => b.amount - a.amount);
  }, [fdrs, institutions]);

  // Maturity buckets
  const maturityBuckets = useMemo(() => {
    const today = new Date(currentDate);
    const buckets = [
      { label: 'Overdue', min: -Infinity, max: 0, color: 'bg-brick', count: 0, amount: 0 },
      { label: '1–30 days', min: 0, max: 30, color: 'bg-brick', count: 0, amount: 0 },
      { label: '31–60 days', min: 30, max: 60, color: 'bg-ochre', count: 0, amount: 0 },
      { label: '61–90 days', min: 60, max: 90, color: 'bg-ochre', count: 0, amount: 0 },
      { label: '91–180 days', min: 90, max: 180, color: 'bg-blue-system', count: 0, amount: 0 },
      { label: '6–12 months', min: 180, max: 365, color: 'bg-green-confirmed', count: 0, amount: 0 },
      { label: '1–2 years', min: 365, max: 730, color: 'bg-green-confirmed', count: 0, amount: 0 },
      { label: '2+ years', min: 730, max: Infinity, color: 'bg-muted', count: 0, amount: 0 },
    ];
    for (const f of fdrs) {
      if (f.status === 'released' || f.status === 'rejected') continue;
      const days = (new Date(f.maturityDate).getTime() - today.getTime()) / 86400000;
      for (const b of buckets) {
        if (days > b.min && days <= b.max) {
          b.count++;
          b.amount += f.amount;
          break;
        }
      }
    }
    return buckets.filter((b) => b.count > 0);
  }, [fdrs, currentDate]);

  const maxMaturityCount = Math.max(...maturityBuckets.map((b) => b.count), 1);

  // ── Tier color mapping ──────────────────────────────────────────────────────
  const tierColors: Record<string, string> = {
    bank_confirmed: 'bg-green-confirmed',
    officer_verified: 'bg-brass',
    system_validated: 'bg-blue-system',
    submitted: 'bg-muted',
  };

  const reportTabs = [
    { id: 'status' as const, label: 'Status Breakdown', icon: FileText },
    { id: 'trust' as const, label: 'Trust Tier', icon: CheckCircle2 },
    { id: 'maturity' as const, label: 'Maturity Profile', icon: Clock },
    { id: 'state' as const, label: 'State-wise', icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Regulatory Analytics
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Reports & Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted bg-paper px-2.5 py-1.5 border border-hairline rounded-sm">
            As of: <strong className="text-ink">{currentDate}</strong>
          </span>
          <button className="flex items-center gap-1.5 text-xs font-sans text-ink border border-hairline bg-surface hover:bg-paper px-3 py-1.5 rounded-sm transition-colors">
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Instruments"
          value={fdrs.length}
          sub={`Across ${institutions.length} institutions`}
        />
        <StatCard
          label="Portfolio Value"
          value={formatCrore(totalAmount)}
          sub="All active FDRs"
          colorClass="text-ink"
        />
        <StatCard
          label="Bank-Secured"
          value={formatCrore(securedAmount)}
          sub={`${((securedAmount / (totalAmount || 1)) * 100).toFixed(1)}% of portfolio`}
          colorClass="text-green-confirmed"
        />
        <StatCard
          label="Expiring (30d)"
          value={expiring30.length}
          sub={`${formatCrore(expiring30.reduce((s, f) => s + f.amount, 0))} at risk`}
          colorClass={expiring30.length > 0 ? 'text-brick' : 'text-ink'}
        />
      </div>

      {/* Quick Anomaly Summary */}
      {discrepancies.length > 0 && (
        <div className="bg-brick-bg border border-brick/40 p-4 rounded-sm flex items-start gap-3 text-xs">
          <AlertTriangle size={16} className="text-brick shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-brick font-mono uppercase tracking-wider">
              {discrepancies.length} Active Discrepancy Flags
            </div>
            <div className="text-body font-sans leading-relaxed">
              {discrepancies.slice(0, 3).map((d) => (
                <span key={d.id} className="inline-block mr-2 font-mono text-ink">{d.fdrNumber}</span>
              ))}
              {discrepancies.length > 3 && <span className="text-muted">+{discrepancies.length - 3} more</span>}
            </div>
          </div>
        </div>
      )}

      {/* Report Tabs */}
      <div className="space-y-4">
        <div className="flex border border-hairline rounded-sm p-0.5 bg-paper text-xs font-sans w-fit">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-medium transition-colors ${
                  activeReport === tab.id
                    ? 'bg-surface text-ink shadow-subtle'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-surface border border-hairline rounded-sm shadow-subtle overflow-hidden">
          {/* Status Breakdown */}
          {activeReport === 'status' && (
            <div className="divide-y divide-hairline">
              <div className="px-4 py-3 bg-paper/60 flex items-center justify-between">
                <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={15} />
                  FDR Count by Lifecycle Status
                </h2>
                <span className="text-[10px] font-mono text-muted">{fdrs.length} total instruments</span>
              </div>
              <div className="p-4 space-y-3">
                {statusBreakdown.map((row) => (
                  <div key={row.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-body capitalize">{row.label}</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{row.count}</span>
                        <span className="text-muted ml-2 text-[11px]">{formatCrore(row.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-hairline/40 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm transition-all ${STATUS_COLORS[row.status] ?? 'bg-muted'}`}
                        style={{ width: `${(row.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust Tier */}
          {activeReport === 'trust' && (
            <div className="divide-y divide-hairline">
              <div className="px-4 py-3 bg-paper/60">
                <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Deposit Coverage by Trust Tier
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierBreakdown.map((row) => {
                  const pct = totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0;
                  return (
                    <div key={row.tier} className="p-4 bg-paper border border-hairline rounded-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${tierColors[row.tier]}`} />
                          <span className="font-mono text-xs font-semibold text-ink uppercase">{row.label}</span>
                        </div>
                        <span className="font-mono text-lg font-bold text-ink">{row.count}</span>
                      </div>
                      <div className="h-1.5 bg-hairline/40 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm ${tierColors[row.tier]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-muted">
                        <span>{formatCrore(row.amount)}</span>
                        <span className="font-bold text-ink">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maturity Profile */}
          {activeReport === 'maturity' && (
            <div className="divide-y divide-hairline">
              <div className="px-4 py-3 bg-paper/60">
                <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} />
                  Maturity Horizon Profile
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {maturityBuckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-body">{bucket.label}</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{bucket.count} FDRs</span>
                        <span className="text-muted ml-2 text-[11px]">{formatCrore(bucket.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-hairline/40 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${bucket.color}`}
                        style={{ width: `${(bucket.count / maxMaturityCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State-wise */}
          {activeReport === 'state' && (
            <div className="divide-y divide-hairline">
              <div className="px-4 py-3 bg-paper/60 flex items-center justify-between">
                <h2 className="font-sans font-semibold text-xs text-ink uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={15} />
                  State-wise Distribution
                </h2>
                <span className="text-[10px] font-mono text-muted">{stateBreakdown.length} states</span>
              </div>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-[#EFECE6] border-b border-hairline sticky top-0 z-10 text-ink uppercase tracking-wider font-semibold font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-2 text-left border-r border-hairline/60">State</th>
                      <th className="px-4 py-2 text-right border-r border-hairline/60">Institutions</th>
                      <th className="px-4 py-2 text-right border-r border-hairline/60">FDRs</th>
                      <th className="px-4 py-2 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {stateBreakdown.map((row, i) => (
                      <tr key={row.state} className={`hover:bg-paper/60 ${i === 0 ? 'font-semibold' : ''}`}>
                        <td className="px-4 py-2 border-r border-hairline/40 font-sans text-body">
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-muted shrink-0" />
                            {row.state}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-hairline/40 text-right font-mono text-ink">
                          {row.instCount}
                        </td>
                        <td className="px-4 py-2 border-r border-hairline/40 text-right font-mono text-ink">
                          {row.count}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-ink font-bold">
                          {formatCrore(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-muted">Pending Verifications</div>
          <div className="font-mono text-2xl font-bold text-blue-system">
            {fdrs.filter((f) => f.status === 'under_scrutiny' || f.status === 'submitted').length}
          </div>
          <div className="text-xs text-muted font-sans">FDRs awaiting officer review</div>
        </div>
        <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-muted">Upcoming Maturities</div>
          <div className="font-mono text-2xl font-bold text-ochre">
            {expiring30.length}
          </div>
          <div className="text-xs text-muted font-sans">Instruments maturing within 30 days</div>
        </div>
        <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-muted">Missing Documents</div>
          <div className="font-mono text-2xl font-bold text-brick">
            {fdrs.filter((f) => f.status === 'discrepancy').length}
          </div>
          <div className="text-xs text-muted font-sans">FDRs with flagged document issues</div>
        </div>
      </div>
    </div>
  );
};
