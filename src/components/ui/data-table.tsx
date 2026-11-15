import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/paper";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  empty?: ReactNode;
  rowHref?: (row: T) => string;
  minWidth?: number;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  empty,
  rowHref,
  minWidth = 720,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="ledger-table" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(column.align === "right" && "num", column.align === "center" && "text-center", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="!h-auto !border-0 !p-0">
                {empty ?? <EmptyState title="Belum ada data" description="Data akan tampil setelah transaksi dibuat." />}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className={rowHref ? "group" : undefined}>
                {columns.map((column, index) => {
                  const content = column.render(row);
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        column.align === "right" && "num",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {rowHref && index === 0 ? (
                        <Link href={rowHref(row)} className="font-medium text-ink underline-offset-4 group-hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
