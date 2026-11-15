"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LedgerMark } from "@/components/brand/LedgerMark";
import { ToastProvider } from "@/components/ui/toast";
import { CompanySwitcher } from "@/components/layout/CompanySwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { QuickActions, NotificationBell } from "@/components/layout/HeaderMenus";
import { NAV_GROUPS } from "@/components/layout/nav";

export interface MembershipOption {
  companyId: string;
  companyName: string;
  role: string;
}

export interface AppShellProps {
  user: { name: string; email: string };
  memberships: MembershipOption[];
  activeCompanyId: string;
  notificationCount: number;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SidebarContent({
  user,
  memberships,
  activeCompanyId,
  onNavigate,
}: {
  user: AppShellProps["user"];
  memberships: MembershipOption[];
  activeCompanyId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeCompany = memberships.find((membership) => membership.companyId === activeCompanyId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <LedgerMark size={34} className="text-paper" />
        <div>
          <p className="font-display text-lg font-semibold leading-none tracking-tight text-paper">FinCorp</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-gold">Buku Kas</p>
        </div>
      </div>

      <div className="stitched mx-5" />

      <div className="px-3 py-4">
        <CompanySwitcher memberships={memberships} activeCompanyId={activeCompanyId} />
      </div>

      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-[13px] transition-colors duration-150",
                        active
                          ? "bg-paper/10 font-medium text-paper"
                          : "text-paper/70 hover:bg-paper/5 hover:text-paper",
                      )}
                    >
                      {active ? (
                        <span aria-hidden="true" className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gold" />
                      ) : null}
                      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="stitched mx-5" />
      <div className="shrink-0 p-3">
        {activeCompany ? (
          <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/40">
            {activeCompany.role === "ADMIN" ? "Admin" : activeCompany.role === "ACCOUNTANT" ? "Akuntan" : "Pengamat"}
          </p>
        ) : null}
        <UserMenu user={user} />
      </div>
    </div>
  );
}

export function AppShell({ user, memberships, activeCompanyId, notificationCount, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusables = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Lewati ke konten
      </a>

      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[272px] bg-forest-deep lg:block">
        <SidebarContent user={user} memberships={memberships} activeCompanyId={activeCompanyId} />
      </aside>

      {drawerOpen ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="absolute inset-y-0 left-0 w-[min(86vw,300px)] bg-forest-deep shadow-2xl"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Tutup menu"
              className="absolute right-3 top-3 z-10 rounded p-1 text-paper/70 hover:text-paper"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent
              user={user}
              memberships={memberships}
              activeCompanyId={activeCompanyId}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[272px]">
        <header className="app-header sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-rule bg-paper/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="no-print rounded-[3px] border border-rule bg-card p-2 text-ink-soft lg:hidden"
            aria-label="Buka menu navigasi"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <form action="/search" method="get" role="search" className="hidden max-w-sm flex-1 items-center sm:flex">
            <label htmlFor="global-search" className="sr-only">
              Cari di FinCorp
            </label>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input
                id="global-search"
                name="q"
                type="search"
                placeholder="Cari faktur, jurnal, akun…"
                className="h-9 w-full rounded-[3px] border border-rule bg-card pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-faint focus:border-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <QuickActions />
            <NotificationBell count={notificationCount} />
            <div className="hidden h-6 w-px bg-rule md:block" />
            <div className="hidden md:block">
              <CompanySwitcher memberships={memberships} activeCompanyId={activeCompanyId} compact />
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
