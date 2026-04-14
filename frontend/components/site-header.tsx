"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SiQuickbooks } from "react-icons/si";
import {
  LuBookOpen as BookOpen,
  LuFileText as FileText,
  LuChartColumn as BarChart2,
  LuSettings2 as Settings2,
  LuCalendar as Calendar,
  LuShieldCheck as ShieldCheck,
  LuLogOut as LogOut,
  LuUser as User,
  LuCirclePlus as PlusCircle,
  LuChevronRight as ChevronRight,
  LuPanelLeftClose as PanelLeftClose,
  LuPanelLeftOpen as PanelLeftOpen,
} from "react-icons/lu";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/providers/settings-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  getAccounts,
  getAccountOptions,
  getFiscalYears,
  getJournalEntryTypes,
  getSegmentDefinitions,
  getAccountSubtypes,
} from "@/lib/api";

type NavGroup = {
  labelKey: TranslationKey;
  items: Array<{
    href: string;
    labelKey: TranslationKey;
    icon: any;
  }>;
};

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.ledger",
    items: [
      { href: "/accounts", labelKey: "nav.item.chartOfAccounts", icon: BookOpen },
      { href: "/journal-entries", labelKey: "nav.item.journalEntries", icon: FileText },
      { href: "/general-ledger", labelKey: "nav.item.generalLedger", icon: BarChart2 },
    ],
  },
  {
    labelKey: "nav.group.setup",
    items: [
      { href: "/master-data", labelKey: "nav.item.masterData", icon: Settings2 },
      { href: "/fiscal", labelKey: "nav.item.fiscalPeriods", icon: Calendar },
    ],
  },
  {
    labelKey: "nav.group.control",
    items: [
      { href: "/audit", labelKey: "nav.item.auditTrail", icon: ShieldCheck },
    ],
  },
  {
    labelKey: "nav.group.system",
    items: [
      { href: "/settings", labelKey: "nav.item.settings", icon: Settings2 },
    ],
  },
];

export function SiteHeader({
  isCollapsed = false,
  onToggleCollapsed,
}: {
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated, logout, user, token } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();

  const isLoginPage = pathname === "/login" || pathname === "/register";

  if (isLoginPage) {
    return (
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-900">
            <SiQuickbooks className="h-6 w-6 text-primary" />
            {t("app.title")}
          </Link>
        </div>
      </header>
    );
  }

  const prefetchForHref = (href: string) => {
    if (!token) return;

    // Accounts list needed in multiple screens (posting + active subset).
    const prefetchPostingAccounts = () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
        staleTime: 5 * 60 * 1000,
      });

    if (href.startsWith("/accounts")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { parentAccountId: null }),
        queryFn: () => getAccounts({ parentAccountId: null }, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/journal-entries")) {
      void prefetchPostingAccounts();
      void queryClient.prefetchQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/general-ledger")) {
      void prefetchPostingAccounts();
      return;
    }

    if (href.startsWith("/master-data")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.segmentDefinitions(token),
        queryFn: () => getSegmentDefinitions(token),
        staleTime: 10 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accountSubtypes(token),
        queryFn: () => getAccountSubtypes(token),
        staleTime: 10 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/fiscal")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.fiscalYears(token),
        queryFn: () => getFiscalYears(token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/audit")) {
      return;
    }
  };

  return (
    <aside
      className={cn(
        "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-full flex-col ltr:border-r rtl:border-l border-gray-200 bg-white",
        isCollapsed ? "w-20" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center border-b border-gray-200 px-5 py-6", isCollapsed ? "justify-center" : "gap-3")}>
        <SiQuickbooks className="h-8 w-8 text-primary" />
        <div className={cn(isCollapsed && "sr-only")}>
          <div className="text-sm font-bold tracking-tight text-gray-900">{t("app.title")}</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500">{t("app.subtitle")}</div>
        </div>
      </div>

      <div className="px-3 pt-3 space-y-2">
        <button
          type="button"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className={cn(
            "flex w-full items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700",
            isCollapsed ? "justify-center" : "justify-between",
          )}
          aria-label={t("language.toggle.aria")}
          title={t("language.toggle.aria")}
        >
          <span className={cn(isCollapsed && "sr-only")}>
            {language === "ar" ? t("language.arabicShort") : t("language.englishShort")}
          </span>
          <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-black tracking-widest text-gray-600", isCollapsed && "sr-only")}>
            {language === "ar" ? "RTL" : "LTR"}
          </span>
          <span className={cn("font-black tracking-widest text-gray-600", !isCollapsed && "sr-only")}>
            {language === "ar" ? "AR" : "EN"}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "flex w-full items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700",
            isCollapsed ? "justify-center" : "justify-between",
          )}
          aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          <span className={cn(isCollapsed && "sr-only")}>{isCollapsed ? "Open" : "Close"}</span>
        </button>
      </div>


      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <span className={cn("mb-2 block px-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400", isCollapsed && "sr-only")}>
              {t(group.labelKey)}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onMouseEnter={() => prefetchForHref(item.href)}
                    title={!isCollapsed ? undefined : (t(item.labelKey) as string)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isCollapsed && "justify-center",
                      isActive
                        ? "bg-gray-100 text-gray-900 border border-gray-200"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                    <span className={cn("flex-1 truncate", isCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                    {isActive && !isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-gray-400 ltr:rotate-0 rtl:rotate-180" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      {isHydrated && isAuthenticated && (
        <div className="border-t border-gray-200 p-3">
          <div className={cn("flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 transition-all group", isCollapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <div className={cn("flex-1 min-w-0", isCollapsed && "sr-only")}>
              <div className="truncate text-xs font-bold text-gray-900">{user?.name || "User"}</div>
              <div className="truncate text-[10px] text-gray-500">{user?.email}</div>
            </div>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className={cn("shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all ltr:rotate-0 rtl:rotate-180", isCollapsed && "sr-only")}
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
