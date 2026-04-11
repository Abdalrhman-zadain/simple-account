"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  BarChart2,
  Settings2,
  Calendar,
  ShieldCheck,
  LogOut,
  User,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Ledger",
    items: [
      { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
      { href: "/journal-entries", label: "Journal Entries", icon: FileText },
      { href: "/general-ledger", label: "General Ledger", icon: BarChart2 },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/master-data", label: "Master Data", icon: Settings2 },
      { href: "/fiscal", label: "Fiscal Periods", icon: Calendar },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/audit", label: "Audit Trail", icon: ShieldCheck },
    ],
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isHydrated, logout, user } = useAuth();

  const isLoginPage = pathname === "/login" || pathname === "/register";

  if (isLoginPage) {
    return (
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-teal-400 to-violet-500 shadow-lg shadow-teal-500/20" />
            Genius ERP
          </Link>
        </div>
      </header>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-white/5 bg-background/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 shadow-lg shadow-teal-500/20">
          <span className="text-xs font-black text-white">G</span>
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Genius ERP</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">General Ledger</div>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-3 pt-4">
        <Link href="/accounts/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/20 py-2.5 text-xs font-bold text-teal-400 transition-all hover:bg-teal-500/20 hover:text-teal-300">
          <PlusCircle className="h-4 w-4" />
          New Account
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <span className="mb-2 block px-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
              {group.label}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-teal-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-teal-500/50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      {isHydrated && isAuthenticated && (
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition-all group">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-bold text-zinc-300">{user?.name || "User"}</div>
              <div className="truncate text-[10px] text-zinc-600">{user?.email}</div>
            </div>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
