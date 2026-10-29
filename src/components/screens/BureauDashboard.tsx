import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFDRStore } from '../../stores/fdrStore';
import { useAuthStore } from '../../stores/authStore';
import { HeadlineFigure } from '../ui/HeadlineFigure';
import { TrustBar } from '../ui/TrustBar';
import { MaturityRadar } from '../ui/MaturityRadar';
import { DataTable } from '../ui/DataTable';
import { TrustTierSeal } from '../ui/TrustTierSeal';
import { Badge } from '../ui/Badge';
import { formatINR } from '../../engines/formatters';
import type { FDR, FDRStatus, TrustTier } from '../../engines/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  AlertTriangle,
  Building,
  ShieldAlert,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

export const BureauDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fdrs = useFDRStore((state) => state.fdrs);
  const filters = useFDRStore((state) => state.filters);
  const setFilters = useFDRStore((state) => state.setFilters);
  const resetFilters = useFDRStore((state) => state.resetFilters);
  const selectFdr = useFDRStore((state) => state.selectFdr);
  const currentRole = useAuthStore((state) => state.currentRole);

  // Apply filters
  const filteredData = useMemo(() => {
    return fdrs.filter((f) => {
      // Role scope: if Institution, only show their FDRs
      if (currentRole === 'institution' && f.institutionId !== 'INST-001') {
        return false;
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matches =
          f.fdrNumber.toLowerCase().includes(query) ||
          (f.institutionName && f.institutionName.toLowerCase().includes(query)) ||
          f.bankName.toLowerCase().includes(query) ||
          f.ifscCode.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (filters.status !== 'all' && f.status !== filters.status) return false;
      if (filters.trustTier !== 'all' && f.trustTier !== filters.trustTier) return false;
      if (filters.state !== 'all' && f.branchName && !f.branchName.includes(filters.state)) {
        // approximate state check or custom
      }
      if (filters.monthYear) {
        const month = f.maturityDate.slice(0, 7);
        if (month !== filters.monthYear) return false;
      }

      return true;
    });
  }, [fdrs, filters, currentRole]);

  // Table columns definition
  const columns = useMemo<ColumnDef<FDR>[]>(
    () => [
      {
        accessorKey: 'fdrNumber',
        header: t('table.fdrNumber'),
        cell: (info) => (
          <div className="font-mono font-semibold text-ink flex items-center gap-1.5">
            <span>{info.getValue() as string}</span>
            {info.row.original.status === 'discrepancy' && (
              <span title="Discrepancy Detected">
                <AlertTriangle size={12} className="text-brick shrink-0" />
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'institutionName',
        header: t('table.institution'),
        cell: (info) => (
          <div className="max-w-[220px] truncate text-body font-sans" title={info.getValue() as string}>
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'bankName',
        header: t('table.bank'),
        cell: (info) => (
          <div className="font-sans text-muted truncate max-w-[150px]">
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('table.amount'),
        cell: (info) => (
          <span className="font-mono font-medium text-ink">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'maturityDate',
        header: t('table.maturityDate'),
        cell: (info) => (
          <span className="font-mono text-muted">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'trustTier',
        header: t('table.trustTier'),
        cell: (info) => <TrustTierSeal tier={info.getValue() as TrustTier} size="sm" />,
      },
      {
        accessorKey: 'status',
        header: t('table.status'),
        cell: (info) => <Badge status={info.getValue() as FDRStatus} size="sm" />,
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectFdr(info.row.original.id);
              navigate(`/fdrs/${info.row.original.id}`);
            }}
            className="text-xs text-ink hover:text-blue-system flex items-center gap-0.5 font-sans font-medium"
          >
            <span>Inspect</span>
            <ArrowUpRight size={13} />
          </button>
        ),
      },
    ],
    [t, navigate, selectFdr],
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-muted">
            Executive Regulatory Console
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {t('nav.dashboard')}
          </h1>
        </div>

        {/* Quick anomaly notice pill */}
        <div className="flex items-center gap-2 bg-brick-bg border border-brick/40 px-3 py-1.5 rounded-sm text-xs font-mono text-brick">
          <ShieldAlert size={14} className="shrink-0" />
          <span>
            <strong>5 Planted Integrity Anomalies</strong> under active surveillance
          </span>
        </div>
      </div>

      {/* Signature Element 2: Headline Figure + TrustBar */}
      <div className="space-y-3">
        <HeadlineFigure fdrs={fdrs} />
        <div className="bg-surface border border-hairline p-4 rounded-sm shadow-subtle">
          <div className="text-xs uppercase font-mono tracking-wider font-semibold text-muted mb-2">
            Secured Deposit Distribution by Verification Tier
          </div>
          <TrustBar fdrs={fdrs} />
        </div>
      </div>

      {/* Signature Element 3: 12-Month Maturity Radar */}
      <MaturityRadar fdrs={fdrs} />

      {/* FDR Registry Master Table Section */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-base font-semibold text-ink uppercase tracking-wider">
              Permanent Fixed Deposit Registry
            </h2>
            <div className="text-xs text-muted font-mono">
              Displaying {filteredData.length} records matching regulatory filter parameters
            </div>
          </div>

          {/* Table Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                placeholder="Search FDR, Bank, IFSC..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="pl-7 pr-3 py-1 bg-surface border border-hairline text-xs rounded-sm font-sans w-48 focus:outline-none focus:border-ink"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value as any })}
              className="bg-surface border border-hairline text-xs py-1 px-2 rounded-sm font-sans text-body focus:outline-none focus:border-ink"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="verified">Verified</option>
              <option value="expiring">Expiring</option>
              <option value="under_scrutiny">Under Scrutiny</option>
              <option value="discrepancy">Discrepancy</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Trust Tier Filter */}
            <select
              value={filters.trustTier}
              onChange={(e) => setFilters({ trustTier: e.target.value as any })}
              className="bg-surface border border-hairline text-xs py-1 px-2 rounded-sm font-sans text-body focus:outline-none focus:border-ink"
            >
              <option value="all">All Tiers</option>
              <option value="bank_confirmed">Bank Confirmed</option>
              <option value="officer_verified">Officer Verified</option>
              <option value="system_validated">System Validated</option>
              <option value="submitted">Submitted</option>
            </select>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="p-1.5 border border-hairline bg-surface hover:bg-paper rounded-sm text-muted hover:text-ink transition-colors"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Dense 36px TanStack Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          onRowClick={(row) => {
            selectFdr(row.id);
            navigate(`/fdrs/${row.id}`);
          }}
          pageSize={15}
        />
      </div>
    </div>
  );
};
