"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LuReceiptText as ReceiptText,
  LuBadgeCheck as BadgeCheck,
  LuShoppingCart as ShoppingCart,
  LuPackage as Package,
  LuBadgeDollarSign as BadgeDollarSign,
  LuBuilding2 as Building2,
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
  }>;
};

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.group.ledger",
    items: [
      { href: "/accounts", labelKey: "nav.item.chartOfAccounts", icon: BookOpen },
      { href: "/bank-cash-accounts", labelKey: "nav.item.bankCashAccounts", icon: WalletMinimal },
      { href: "/bank-cash-transactions/receipts", labelKey: "nav.item.bankCashTransactions", icon: ReceiptText },
      { href: "/bank-reconciliations", labelKey: "nav.item.bankReconciliations", icon: BadgeCheck },
      { href: "/sales-receivables", labelKey: "nav.item.salesReceivables", icon: Users },
      { href: "/purchases", labelKey: "nav.item.purchases", icon: ShoppingCart },
      { href: "/inventory", labelKey: "nav.item.inventory", icon: Package },
      { href: "/payroll", labelKey: "nav.item.payroll", icon: BadgeDollarSign },
      { href: "/fixed-assets", labelKey: "nav.item.fixedAssets", icon: Building2 },
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
      return;
    }

    if (href.startsWith("/bank-cash-transactions")) {
      void prefetchPostingAccounts();
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
      <div className={cn("flex items-center border-b border-gray-200 px-6 py-8", isCollapsed ? "justify-center" : "gap-4")}>
        <SiQuickbooks className="h-10 w-10 text-primary" />
        <div className={cn(isCollapsed && "sr-only")}>
          <div className="text-base font-black tracking-tight text-gray-900">{t("app.title")}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("app.subtitle")}</div>
        </div>
      </div>

      <div className="space-y-2 px-3 pt-3">
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
          <span
            className={cn(
              "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-black tracking-widest text-gray-600",
              isCollapsed && "sr-only",
            )}
          >
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
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className={cn(isCollapsed && "sr-only")}>{isCollapsed ? "Open" : "Close"}</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-10 px-4 py-8">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <span className={cn("mb-4 block px-3 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400", isCollapsed && "sr-only")}>
              {t(group.labelKey)}
            </span>
            <div className="space-y-1">
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
                      "group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                      isCollapsed && "justify-center",
                      isActive
                        ? "border border-gray-200 bg-gray-100 text-gray-900 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                    <span className={cn("flex-1 truncate", isCollapsed && "sr-only")}>{t(item.labelKey)}</span>
                    {isActive && !isCollapsed && <ChevronRight className="h-4 w-4 text-gray-400 ltr:rotate-0 rtl:rotate-180" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isHydrated && isAuthenticated && (
        <div className="border-t border-gray-200 p-3">
          <div className={cn("group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-gray-50", isCollapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-500">
              <User size={16} />
            </div>
            <div className={cn("min-w-0 flex-1", isCollapsed && "sr-only")}>
              <div className="truncate text-xs font-bold text-gray-900">{user?.name || "User"}</div>
              <div className="truncate text-[10px] text-gray-500">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className={cn(
                "shrink-0 rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 ltr:rotate-0 rtl:rotate-180",
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
