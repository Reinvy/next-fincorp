import Link from "next/link";
import { cn } from "@/lib/utils";

function buildHref(basePath: string, searchParams: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
  className,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const linkClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-[3px] border border-rule px-2 font-mono text-[11px] text-ink-soft hover:bg-paper-light";

  return (
    <nav aria-label="Navigasi halaman" className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={buildHref(basePath, searchParams, page - 1)} className={linkClass} rel="prev">
            Sebelumnya
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildHref(basePath, searchParams, page + 1)} className={linkClass} rel="next">
            Berikutnya
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
