"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/generate", label: "Generate blog" },
];

export function AdminShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-slate-200 md:flex">
        <div className="border-b border-sidebar-border px-5 py-6">
          <div className="text-lg font-semibold tracking-tight text-white">Admin</div>
          <p className="mt-1 text-xs text-slate-400">SEO SaaS control</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{userName}</div>
              <div className="truncate text-xs text-slate-500">{userEmail}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-card md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold text-primary">Admin</span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-muted"
            >
              Sign out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2">
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-primary text-white" : "text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
