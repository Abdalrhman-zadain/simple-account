"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  LuChevronRight as ChevronRight,
  LuPanelLeftClose as PanelLeftClose,
  LuPanelLeftOpen as PanelLeftOpen,
  LuWalletMinimal as WalletMinimal,
  LuBadgeCheck as BadgeCheck,
  LuShoppingCart as ShoppingCart,
  LuPackage as Package,
  // LuBadgeDollarSign as BadgeDollarSign,
  // LuBuilding2 as Building2,
  LuChartPie as ChartPie,
  LuUsers as Users,
} from "react-icons/lu";

import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { useSettings } from "@/providers/settings-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  getAgingReport,
  getAccountOptions,
  getAccounts,
  getAccountSubtypes,
  getBankCashAccounts,
  getBankReconciliations,
  getBankCashTransactions,
  getCreditNotes,
  getCustomers,
  getFiscalYears,
  getInventoryGoodsReceipts,
  getInventoryGoodsIssues,
  getInventoryItems,
  getInventoryAdjustments,
  getInventoryStockLedger,
  getInventoryTransfers,
  getInventoryWarehouses,
  getJournalEntryTypes,
  getSalesInvoices,
  getSuppliers,
  getSegmentDefinitions,
} from "@/lib/api";

type NavGroup = {
  labelKey: TranslationKey;
  items: Array<{
    href: string;
    labelKey: TranslationKey;
    icon: any;
    children?: Array<{
      href: string;
      labelKey: TranslationKey;
    }>;
  }>;
};

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.ledger",
    items: [
      { href: "/accounts", labelKey: "nav.item.chartOfAccounts", icon: BookOpen },
      { href: "/bank-cash-accounts", labelKey: "nav.item.bankCashAccounts", icon: WalletMinimal },
      { href: "/bank-reconciliations", labelKey: "nav.item.bankReconciliations", icon: BadgeCheck },
      { href: "/sales-receivables", labelKey: "nav.item.salesReceivables", icon: Users },
      {
        href: "/purchases",
        labelKey: "nav.item.purchases",
        icon: ShoppingCart,
        children: [
          { href: "/purchases?tab=suppliers", labelKey: "purchases.workspace.suppliers" },
          { href: "/purchases?tab=requests", labelKey: "purchases.workspace.requests" },
          { href: "/purchases?tab=orders", labelKey: "purchases.workspace.orders" },
          { href: "/purchases?tab=invoices", labelKey: "purchases.workspace.invoices" },
          { href: "/purchases?tab=payments", labelKey: "purchases.workspace.payments" },
          { href: "/purchases?tab=notes", labelKey: "purchases.workspace.debitNotes" },
        ],
      },
      { href: "/inventory", labelKey: "nav.item.inventory", icon: Package },
      // { href: "/payroll", labelKey: "nav.item.payroll", icon: BadgeDollarSign },
      // { href: "/fixed-assets", labelKey: "nav.item.fixedAssets", icon: Building2 },
      { href: "/reporting", labelKey: "nav.item.reporting", icon: ChartPie },
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
    items: [{ href: "/audit", labelKey: "nav.item.auditTrail", icon: ShieldCheck }],
  },
  {
    labelKey: "nav.group.system",
    items: [{ href: "/settings", labelKey: "nav.item.settings", icon: Settings2 }],
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated, logout, user, token } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();
  const [openSidebarGroups, setOpenSidebarGroups] = useState<Record<string, boolean>>({});

  const toggleSidebarGroup = (href: string) => {
    setOpenSidebarGroups((current) => ({
      ...current,
      [href]: !current[href],
    }));
  };


  const isLoginPage = pathname === "/login" || pathname === "/register";

  if (isLoginPage) {
    return (
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-900">
            <div className="text-primary">
              <SiQuickbooks size={24} />
            </div>
            {t("app.title")}
          </Link>
        </div>
      </header>
    );
  }

  const prefetchForHref = (href: string) => {
    if (!token) return;

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

    if (href.startsWith("/bank-cash-accounts")) {
      void prefetchPostingAccounts();
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token),
        queryFn: () => getBankCashAccounts({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
        queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashTransactions(token, { kind: "RECEIPT" }),
        queryFn: () => getBankCashTransactions({ kind: "RECEIPT" }, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/bank-reconciliations")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
        queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankReconciliations(token),
        queryFn: () => getBankReconciliations({}, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/sales-receivables")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesCustomers(token, {}),
        queryFn: () => getCustomers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesInvoices(token, {}),
        queryFn: () => getSalesInvoices({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesCreditNotes(token, {}),
        queryFn: () => getCreditNotes({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bankCashTransactions(token, { kind: "RECEIPT", status: "POSTED" }),
        queryFn: () => getBankCashTransactions({ kind: "RECEIPT", status: "POSTED" }, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.salesAging(token),
        queryFn: () => getAgingReport(undefined, token),
        staleTime: 30_000,
      });
      return;
    }

    if (href.startsWith("/purchases")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.purchaseSuppliers(token, {}),
        queryFn: () => getSuppliers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "LIABILITY", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "LIABILITY" }, token),
        staleTime: 5 * 60 * 1000,
      });
      return;
    }

    if (href.startsWith("/inventory")) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryItems(token, {}),
        queryFn: () => getInventoryItems({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryWarehouses(token, {}),
        queryFn: () => getInventoryWarehouses({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryGoodsReceipts(token, {}),
        queryFn: () => getInventoryGoodsReceipts({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryGoodsIssues(token, {}),
        queryFn: () => getInventoryGoodsIssues({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryTransfers(token, {}),
        queryFn: () => getInventoryTransfers({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryAdjustments(token, {}),
        queryFn: () => getInventoryAdjustments({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.inventoryStockLedger(token, {}),
        queryFn: () => getInventoryStockLedger({}, token),
        staleTime: 30_000,
      });
      void queryClient.prefetchQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "ASSET", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "ASSET" }, token),
        staleTime: 5 * 60 * 1000,
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
  };

  return (
    <aside
      className={cn(
        "fixed ltr:left-0 rtl:right-0 top-0 z-40 flex h-full flex-col ltr:border-r rtl:border-l border-gray-200 bg-white",
        isCollapsed ? "w-20" : "w-60",
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute top-24 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 ltr:-right-4 rtl:-left-4"
        aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
        title={isCollapsed ? "Open sidebar" : "Close sidebar"}
      >
        {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>

      <div className={cn("flex items-center border-b border-gray-200 px-6 py-2.5", isCollapsed ? "justify-center" : "gap-4")}>
        <SiQuickbooks className="h-10 w-10 text-primary" />
        <div className={cn(isCollapsed && "sr-only")}>
          <div className="text-base font-black tracking-tight text-gray-900">{t("app.title")}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("app.subtitle")}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-6 px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <span className={cn("mb-2 block px-3 text-[9px] font-black uppercase tracking-[0.22em] text-gray-400", isCollapsed && "sr-only")}>
              {t(group.labelKey)}
            </span>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const hasChildren = Boolean(item.children?.length);
                const isGroupOpen = Boolean(openSidebarGroups[item.href]);
                return (
                  <div key={item.href}>
                    <div
                      className={cn(
                        "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300 hover:bg-gray-50 active:translate-y-0",
                        isCollapsed && "justify-center",
                        isActive
                          ? "border border-gray-200 bg-gray-100 text-gray-900 shadow-sm"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      <Link
                        href={item.href}
                        title={!isCollapsed ? undefined : (t(item.labelKey) as string)}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                        <span className={cn("flex-1 truncate", isCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                      </Link>

                      {hasChildren && !isCollapsed && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleSidebarGroup(item.href);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                          aria-label={isGroupOpen ? "Close section" : "Open section"}
                          title={isGroupOpen ? "Close section" : "Open section"}
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform rtl:rotate-180",
                              isGroupOpen && "ltr:rotate-90 rtl:rotate-90",
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {item.children && isGroupOpen && !isCollapsed && (
                      <div className="mt-1.5 space-y-1 pe-2 ps-8">
                        {item.children.map((child) => {
                          const childTab = child.href.split("tab=")[1];
                          const currentTab = searchParams.get("tab") || "suppliers";
                          const isChildActive = pathname.startsWith("/purchases") && currentTab === childTab;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "block rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                                isChildActive
                                  ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                                  : "border-transparent bg-white/60 text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
                              )}
                            >
                              {t(child.labelKey)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isHydrated && isAuthenticated && (
        <div className="border-t border-gray-200 p-2">
          <div className={cn("group flex items-center gap-2 rounded-xl p-2 transition-all hover:bg-gray-50", isCollapsed && "justify-center")}>
            <div className={cn("min-w-0 flex-1", isCollapsed && "sr-only")}>
              <div className="max-w-[110px] truncate text-[11px] font-bold text-gray-900">{user?.name || "User"}</div>
              <div className="max-w-[110px] truncate text-[9px] text-gray-500">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-black tracking-widest text-slate-500 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              {language === "ar" ? "EN" : "AR"}
            </button>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className={cn(
                "shrink-0 rounded-md p-1 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 ltr:rotate-0 rtl:rotate-180",
                isCollapsed && "sr-only",
              )}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
