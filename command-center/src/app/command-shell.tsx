"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./actions";

export type StaffUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

type CommandShellProps = {
  staff: StaffUser | null;
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard", short: "DB" },
  { href: "/leads", label: "Lead Management", short: "LD" },
  { href: "/cleaning", label: "AI Cleaning Lab", short: "CL" },
  { href: "/users", label: "User Management", short: "US" },
  { href: "/health", label: "System Health", short: "SH" },
];

export function CommandShell({ staff, children }: CommandShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapse

  return (
    <div className="flex min-h-screen bg-[#f0f0f0] text-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r-2 border-black bg-white p-4 shadow-[4px_0_0_0_rgba(0,0,0,1)] transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0 w-72" : "-translate-x-full w-72 md:translate-x-0"
        } ${
          collapsed ? "md:w-20" : "md:w-72"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="rounded-sm border-2 border-black bg-black px-2 py-1 text-[11px] font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                title={collapsed ? "Expandera sidebar" : "Fäll ihop sidebar"}
              >
                {collapsed ? "»" : "«"}
              </button>
            </div>
            <div className={collapsed ? "md:hidden" : ""}>
              <div className="inline-flex items-baseline gap-1">
                <span className="text-lg font-black tracking-tight">
                  Kollahär!
                </span>
                <span className="rounded-sm border-2 border-black bg-yellow-300 px-1.5 py-0.5 text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  HQ
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Command Center
              </p>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden rounded-sm border-2 border-black bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>

        <nav
          className={`flex-1 space-y-1 ${
            collapsed ? "md:items-center md:space-y-2 md:pt-2" : ""
          }`}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center rounded-md border-2 border-black px-3 py-2 text-[11px] font-semibold uppercase tracking-wide shadow-[3px_3px_0_0_rgba(0,0,0,1)] ${
                  active
                    ? "bg-black text-white"
                    : "bg-[#f5f5f5] text-slate-900 hover:bg-yellow-200"
                } ${collapsed ? "md:text-[10px] md:px-0 md:py-2" : ""}`}
                onClick={() => setOpen(false)}
              >
                {collapsed ? item.short : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t-2 border-black pt-4">
          <div className="flex items-center justify-between gap-2">
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {staff?.name || "Okänd användare"}
                </p>
                <p className="truncate text-[11px] text-slate-600">
                  {staff?.email || "no-email@kollahar.se"}
                </p>
                {staff && (
                  <span className="mt-1 inline-flex items-center rounded-sm border-2 border-black bg-fuchsia-300 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    SUPERADMIN
                  </span>
                )}
              </div>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-red-400 text-[15px] font-black text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-red-500"
                title="Logga ut"
              >
                ⏻
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b-2 border-black bg-white px-3 shadow-[0_4px_0_0_rgba(0,0,0,1)] md:hidden">
        <button
          type="button"
          className="rounded-sm border-2 border-black bg-black px-2 py-1 text-[11px] font-bold text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <span className="text-xs font-black uppercase tracking-wide">
          Command Center
        </span>
        <span className="text-[10px] font-semibold text-slate-600">
          {staff?.role || "Guest"}
        </span>
      </div>

      {/* Main content */}
      <main
        className={`flex-1 px-3 pb-6 pt-14 md:px-6 md:pt-6 ${
          collapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

