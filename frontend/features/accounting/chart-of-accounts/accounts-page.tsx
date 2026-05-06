"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { LuPlus as Plus, LuArrowLeft as ArrowLeft } from "react-icons/lu";

import { activateAccount, deactivateAccount, deleteAccount, getAccountById, getAccountTableRows } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { Button, PageSkeleton, SectionHeading } from "@/components/ui";
import { ExportActions } from "@/components/ui/export-actions";
import { exportOrPrint, formatExportMoney, type ExportMode } from "@/lib/export-print";

import {
  applyAccountFilters,
  appendSearchFilter,
  buildSearchFilters,
  collectStats,
  collectTotalBalance,
  getActiveFilterChips,
  getCommandSuggestions,
  removeFilterToken,
} from "./chart-of-accounts.utils";
import { AccountsBreadcrumbs } from "./components/accounts-breadcrumbs";
import { AccountsSearchBar, AccountsSearchBarHandle } from "./components/accounts-search-bar";
import { AccountsStatsSummary } from "./components/accounts-stats-summary";
import { AccountsTable } from "./components/accounts-table";
import { getLocalizedAccountName } from "./chart-of-accounts.naming";

export function AccountsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId") || null;
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBarRef = useRef<AccountsSearchBarHandle>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const lastScrolledId = useRef<string | null>(null);



  const filters = useMemo(() => buildSearchFilters(searchQuery), [searchQuery]);
  const isSearching = !!(filters.search || filters.type.length || filters.isActive.length || filters.isPosting.length);

  const { data: parentAccount } = useQuery({
    queryKey: ["account", parentId, token],
    queryFn: () => (parentId ? getAccountById(parentId, token) : null),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, {
      parentAccountId: parentId,
      search: filters.search,
      view: "table",
    }),
    queryFn: () =>
      getAccountTableRows(
        {
          parentAccountId: parentId,
          search: filters.search,
          view: "table",
        },
        token,
      ),
    staleTime: 30_000,
  });

  // Autofocus search bar and scroll to view on navigate
  useEffect(() => {
    if (!accountsQuery.isLoading && parentId !== lastScrolledId.current) {
      if (tableAreaRef.current) {
        tableAreaRef.current.scrollIntoView({ behavior: "auto", block: "start" });
        lastScrolledId.current = parentId;
      }
    }

    // Always attempt to focus if mounted
    if (!accountsQuery.isLoading && searchBarRef.current) {
      searchBarRef.current.focus();
    }
  }, [parentId, accountsQuery.isLoading]);

  const suggestions = useMemo(() => getCommandSuggestions(searchQuery), [searchQuery]);
  const activeFilters = useMemo(() => getActiveFilterChips(searchQuery), [searchQuery]);
  const currentAccounts = useMemo(() => applyAccountFilters(accountsQuery.data ?? [], filters), [accountsQuery.data, filters]);
  const stats = useMemo(() => collectStats(currentAccounts), [currentAccounts]);
  const totalBalance = useMemo(() => collectTotalBalance(currentAccounts), [currentAccounts]);
  const exportPermissions = { canPrint: true, canExportPdf: true, canExportExcel: true };

  const handleExport = (mode: ExportMode) => {
    exportOrPrint({
      mode,
      entityType: "table",
      title: parentAccount ? `دليل الحسابات - ${getLocalizedAccountName(parentAccount, language)}` : "دليل الحسابات",
      fileName: "chart-of-accounts",
      currency: "JOD",
      generatedBy: user?.name || user?.email,
      permissions: exportPermissions,
      filters: [
        { label: "المستوى", value: parentAccount ? `${parentAccount.code} - ${getLocalizedAccountName(parentAccount, language)}` : "الجذر" },
        { label: "البحث", value: filters.search || "كل الحسابات" },
        { label: "نوع الحساب", value: filters.type.length ? filters.type.map((type) => t(`accountType.${type}`)).join(", ") : "الكل" },
        {
          label: "الدور",
          value: filters.isPosting.length
            ? filters.isPosting.map((value) => (value === "true" ? "حساب ترحيل" : "حساب رئيسي")).join(", ")
            : "الكل",
        },
        {
          label: "الحالة",
          value: filters.isActive.length
            ? filters.isActive.map((value) => (value === "true" ? "نشط" : "غير نشط")).join(", ")
            : "الكل",
        },
      ],
      columns: [
        { key: "code", label: "رقم الحساب", value: (row) => row.code },
        { key: "name", label: "اسم الحساب", value: (row) => getLocalizedAccountName(row, language) },
        { key: "type", label: "النوع", value: (row) => t(`accountType.${row.type}`) },
        { key: "role", label: "الدور", value: (row) => (row.isPosting ? "حساب ترحيل" : "حساب رئيسي") },
        { key: "status", label: "الحالة", value: (row) => (row.isActive ? "نشط" : "غير نشط") },
        { key: "balance", label: "الرصيد", align: "end", value: (row) => formatExportMoney(row.currentBalance, "JOD") },
      ],
      rows: currentAccounts,
      totals: [{ label: "إجمالي الرصيد", value: formatExportMoney(totalBalance, "JOD") }],
    });
  };

  const activateMutation = useMutation({
    mutationFn: (accountId: string) => activateAccount(accountId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (accountId: string) => deactivateAccount(accountId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const navigateTo = (accountId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (accountId) {
      params.set("parentId", accountId);
    } else {
      params.delete("parentId");
    }

    router.push(`/accounts?${params.toString()}`);
  };

  if (accountsQuery.isLoading && !parentAccount) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 motion-reduce:animate-none">
      <SectionHeading
        title={
          <div className="flex items-center gap-3">
            {parentId && (
              <button
                onClick={() => navigateTo(parentAccount?.parentAccountId ?? null)}
                className="group flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white transition-all hover:border-teal-400 hover:text-teal-400"
                title={t("common.back")}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}
            <span>{parentAccount ? getLocalizedAccountName(parentAccount, language) : t("accounts.title.root")}</span>
          </div>
        }
        description={parentAccount ? t("accounts.title.childrenOf", { code: parentAccount.code }) : t("accounts.description.root")}
        action={
          <div className="flex items-center gap-3">
            <Link href={parentId ? `/accounts/new?parentAccountId=${parentId}` : "/accounts/new"}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {parentId ? t("accounts.button.newChild") : t("accounts.button.newAccount")}
              </Button>
            </Link>
            <ExportActions onAction={handleExport} permissions={exportPermissions} disabled={accountsQuery.isLoading} />
          </div>
        }
      />

      <AccountsBreadcrumbs parentAccount={parentAccount} onNavigate={navigateTo} />

      <AccountsStatsSummary
        stats={stats}
        totalBalance={totalBalance}
        onSelectType={(type) => setSearchQuery((prev) => appendSearchFilter(prev, `type:${type}`))}
      />

      <div ref={tableAreaRef} className="scroll-mt-10 space-y-8">
        <AccountsSearchBar
          ref={searchBarRef}
          searchQuery={searchQuery}
          activeFilters={activeFilters}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onSearchChange={setSearchQuery}
          onShowSuggestions={() => setShowSuggestions(true)}
          onHideSuggestions={() => setShowSuggestions(false)}
          onRemoveFilter={(token) => setSearchQuery((prev) => removeFilterToken(prev, token))}
          onSelectSuggestion={(value) => {
            setSearchQuery((prev) => appendSearchFilter(prev, value));
            setShowSuggestions(false);
          }}
        />

        <AccountsTable
          accounts={currentAccounts}
          isLoading={accountsQuery.isLoading}
          isError={accountsQuery.isError}
          isPending={accountsQuery.isPending}
          isSearching={isSearching}
          parentId={parentId}
          parentType={parentAccount?.type}
          onEnter={navigateTo}
          onBack={() => navigateTo(parentAccount?.parentAccountId ?? null)}
          actions={{
            onActivate: (accountId) => activateMutation.mutate(accountId),
            onDeactivate: (accountId) => deactivateMutation.mutate(accountId),
            onDelete: (accountId) => deleteMutation.mutate(accountId),
            isMutating: (accountId) =>
              (activateMutation.isPending && activateMutation.variables === accountId) ||
              (deactivateMutation.isPending && deactivateMutation.variables === accountId) ||
              (deleteMutation.isPending && deleteMutation.variables === accountId),
          }}
        />
      </div>
    </div>
  );
}
