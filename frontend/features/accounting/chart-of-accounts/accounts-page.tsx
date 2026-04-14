"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LuPlus as Plus } from "react-icons/lu";

import { activateAccount, deactivateAccount, getAccountById, getAccountTableRows } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { Button, PageSkeleton, SectionHeading } from "@/components/ui";

import {
  buildSearchFilters,
  collectStats,
  collectTotalBalance,
  getActiveFilterChips,
  getCommandSuggestions,
  removeFilterToken,
} from "./chart-of-accounts.utils";
import { AccountsBreadcrumbs } from "./components/accounts-breadcrumbs";
import { AccountsSearchBar } from "./components/accounts-search-bar";
import { AccountsStatsSummary } from "./components/accounts-stats-summary";
import { AccountsTable } from "./components/accounts-table";

export function AccountsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId") || null;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filters = useMemo(() => buildSearchFilters(searchQuery), [searchQuery]);
  const isSearching = !!(filters.search || filters.type || filters.isActive || filters.isPosting);

  const { data: parentAccount } = useQuery({
    queryKey: ["account", parentId, token],
    queryFn: () => (parentId ? getAccountById(parentId, token) : null),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, {
      parentAccountId: isSearching ? undefined : parentId,
      search: filters.search,
      type: filters.type as any,
      isActive: filters.isActive as any,
      isPosting: filters.isPosting as any,
      view: "table",
    }),
    queryFn: () =>
      getAccountTableRows(
        {
          parentAccountId: isSearching ? undefined : parentId,
          search: filters.search,
          type: filters.type as any,
          isActive: filters.isActive as any,
          isPosting: filters.isPosting as any,
          view: "table",
        },
        token,
      ),
    staleTime: 30_000,
  });

  const suggestions = useMemo(() => getCommandSuggestions(searchQuery), [searchQuery]);
  const activeFilters = useMemo(() => getActiveFilterChips(searchQuery), [searchQuery]);
  const currentAccounts = accountsQuery.data ?? [];
  const stats = useMemo(() => collectStats(currentAccounts), [currentAccounts]);
  const totalBalance = useMemo(() => collectTotalBalance(currentAccounts), [currentAccounts]);

  const activateMutation = useMutation({
    mutationFn: (accountId: string) => activateAccount(accountId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (accountId: string) => deactivateAccount(accountId, token),
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
        title={parentAccount ? parentAccount.name : t("accounts.title.root")}
        description={parentAccount ? t("accounts.title.childrenOf", { code: parentAccount.code }) : t("accounts.description.root")}
        action={
          <div className="flex items-center gap-3">
            <Link href={parentId ? `/accounts/new?parentAccountId=${parentId}` : "/accounts/new"}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {parentId ? t("accounts.button.newChild") : t("accounts.button.newAccount")}
              </Button>
            </Link>
          </div>
        }
      />

      <AccountsBreadcrumbs parentAccount={parentAccount} onNavigate={navigateTo} />

      <AccountsStatsSummary
        stats={stats}
        totalBalance={totalBalance}
        onSelectType={(type) => setSearchQuery(`type:${type} `)}
      />

      <AccountsSearchBar
        searchQuery={searchQuery}
        activeFilters={activeFilters}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onSearchChange={setSearchQuery}
        onShowSuggestions={() => setShowSuggestions(true)}
        onHideSuggestions={() => setShowSuggestions(false)}
        onRemoveFilter={(token) => setSearchQuery((prev) => removeFilterToken(prev, token))}
        onSelectSuggestion={(value) => {
          setSearchQuery(`${value} `);
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
        onEnter={navigateTo}
        actions={{
          onActivate: (accountId) => activateMutation.mutate(accountId),
          onDeactivate: (accountId) => deactivateMutation.mutate(accountId),
          isMutating: (accountId) =>
            (activateMutation.isPending && activateMutation.variables === accountId) ||
            (deactivateMutation.isPending && deactivateMutation.variables === accountId),
        }}
      />
    </div>
  );
}
