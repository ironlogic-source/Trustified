import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  selectedId?: string | null;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  onRowClick,
  selectedId,
  pageSize = 15,
  className = '',
  emptyMessage = 'No records found matching criteria',
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className={`border border-hairline bg-surface rounded-sm overflow-hidden flex flex-col ${className}`}>
      {/* Table Container with Sticky Header */}
      <div className="overflow-x-auto flex-1 max-h-[640px] relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#EFECE6] border-b border-hairline sticky top-0 z-10 text-ink uppercase tracking-wider font-semibold font-sans">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-3 py-2.5 select-none font-semibold text-[11px] border-r border-hairline/60 last:border-r-0 ${
                        canSort ? 'cursor-pointer hover:bg-hairline/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        {canSort && (
                          <span className="text-muted">
                            {sortDirection === 'asc' ? (
                              <ChevronUp size={13} className="text-ink" />
                            ) : sortDirection === 'desc' ? (
                              <ChevronDown size={13} className="text-ink" />
                            ) : (
                              <ChevronsUpDown size={12} className="opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-hairline">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-muted font-sans text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedId === row.original.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onRowClick) {
                        onRowClick(row.original);
                      }
                    }}
                    className={`h-[36px] min-h-[36px] transition-colors duration-fast border-b border-hairline/50 text-body hover:bg-paper/80 focus-visible:bg-paper focus-visible:outline-none cursor-pointer ${
                      isSelected ? 'bg-blue-bg/40 font-medium border-l-2 border-l-ink' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-1.5 whitespace-nowrap text-[12.5px] border-r border-hairline/40 last:border-r-0"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-paper/80 border-t border-hairline px-3 py-2 flex items-center justify-between text-xs text-muted font-mono select-none">
        <div>
          {t('table.showing')}{' '}
          <strong className="text-ink">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>{' '}
          -{' '}
          <strong className="text-ink">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}
          </strong>{' '}
          {t('table.of')}{' '}
          <strong className="text-ink">{table.getFilteredRowModel().rows.length}</strong>{' '}
          {t('table.records')}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 border border-hairline rounded-sm hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed text-ink"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {Math.max(1, table.getPageCount())}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 border border-hairline rounded-sm hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed text-ink"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
