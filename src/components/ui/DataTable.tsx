'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  showPagination?: boolean;
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No data available',
  showPagination = false,
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
}: DataTableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-muted border-b border-border-subtle">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 font-label-md text-label-md text-on-surface-variant ${col.width || ''} ${alignClasses[col.align || 'left']}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={String(item[keyField])}
                  onClick={() => onRowClick?.(item)}
                  className={`hover:bg-surface-container-low transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 ${col.width || ''} ${alignClasses[col.align || 'left']}`}
                    >
                      {col.render
                        ? col.render(item, index)
                        : String(item[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && data.length > 0 && (
        <div className="p-3 border-t border-border-subtle flex justify-between items-center bg-surface-muted">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-border-subtle rounded bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) {
                  page = currentPage - 2 + i;
                }
                if (page > totalPages) {
                  page = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  className={`px-3 py-1 border rounded font-tabular-nums text-body-sm ${
                    currentPage === page
                      ? 'border-primary bg-primary-container text-primary font-medium'
                      : 'border-border-subtle bg-surface hover:bg-surface-container'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-border-subtle rounded bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}