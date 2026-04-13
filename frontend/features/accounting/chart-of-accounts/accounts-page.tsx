"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { LuRefreshCw as RefreshCw, LuPlus as Plus, LuDatabase as Database, LuPen as Edit, LuCirclePlus as PlusCircle, LuChevronRight as ChevronRight, LuChevronLeft as ChevronLeft, LuSearch as Search, LuX as X, LuTrendingUp as TrendingUp, LuTrendingDown as TrendingDown, LuLayers as Layers, LuDollarSign as DollarSign, LuHouse as Home, LuPower as Power, LuPowerOff as PowerOff } from "react-icons/lu";

import { getAccounts, getAccountById, activateAccount, deactivateAccount } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Account } from "@/types/api";
import { Input } from "@/components/forms";
import { Card, SectionHeading, StatusPill, Button } from "@/components/ui";

// ─── Constants & Types ────────────────────────────────────────────────────────

const COMMANDS = [
  { label: "type: ASSET", value: "type:ASSET", category: "Filter" },
  { label: "type: LIABILITY", value: "type:LIABILITY", category: "Filter" },
  { label: "type: EQUITY", value: "type:EQUITY", category: "Filter" },
  { label: "type: REVENUE", value: "type:REVENUE", category: "Filter" },
  { label: "type: EXPENSE", value: "type:EXPENSE", category: "Filter" },
  { label: "is: posting", value: "is:posting", category: "Filter" },
  { label: "is: header", value: "is:header", category: "Filter" },
  { label: "status: active", value: "status:active", category: "Filter" },
  { label: "status: inactive", value: "status:inactive", category: "Filter" },
];

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

const TYPE_STYLES: Record<AccountType, { badge: string; dot: string; label: string }> = {
  ASSET: { badge: "bg-sky-500/10 text-sky-700 border-sky-500/20", dot: "bg-sky-500", label: "Asset" },
  LIABILITY: { badge: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500", label: "Liability" },
  EQUITY: { badge: "bg-violet-500/10 text-violet-700 border-violet-500/20", dot: "bg-violet-500", label: "Equity" },
  REVENUE: { badge: "bg-teal-500/10 text-teal-700 border-teal-500/20", dot: "bg-teal-500", label: "Revenue" },
  EXPENSE: { badge: "bg-rose-500/10 text-rose-700 border-rose-500/20", dot: "bg-rose-500", label: "Expense" },
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function collectStats(nodes: Account[]): Record<AccountType, number> {
  const counts: Record<AccountType, number> = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };
  for (const n of nodes) {
    if (n.type in counts) counts[n.type as AccountType]++;
  }
  return counts;
}

function collectTotalBalance(nodes: Account[]): number {
  let total = 0;
  for (const n of nodes) {
    total += parseFloat(n.currentBalance);
  }
  return total;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function AccountsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId") || null;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => {
    const params: Record<string, string> = { search: searchQuery };
    if (searchQuery.includes("type:")) {
      const match = searchQuery.match(/type:(\w+)/i);
      if (match) { params.type = match[1].toUpperCase(); params.search = searchQuery.replace(/type:\w+/i, "").trim(); }
    }
    if (searchQuery.includes("status:")) {
      const match = searchQuery.match(/status:(\w+)/i);
      if (match) { params.isActive = match[1].toLowerCase() === "active" ? "true" : "false"; params.search = params.search.replace(/status:\w+/i, "").trim(); }
    }
    if (searchQuery.includes("is:")) {
      const match = searchQuery.match(/is:(\w+)/i);
      if (match) { params.isPosting = match[1].toLowerCase() === "posting" ? "true" : "false"; params.search = params.search.replace(/is:\w+/i, "").trim(); }
    }
    return params;
  }, [searchQuery]);

  const isSearching = !!(filters.search || filters.type || filters.isActive || filters.isPosting);

  // Fetch current parent if it exists (for breadcrumbs/context)
  const { data: parentAccount } = useQuery({
    queryKey: ["account", parentId, token],
    queryFn: () => (parentId ? getAccountById(parentId, token) : null),
    enabled: !!parentId,
  });

  // Fetch current level accounts
  const accountsQuery = useQuery({
    queryKey: ["accounts", token, parentId, filters],
    queryFn: () => getAccounts({
      // Search is global, navigation is hierarchical
      parentAccountId: isSearching ? undefined : parentId,
      search: filters.search,
      type: filters.type as any,
      isActive: filters.isActive as any,
      isPosting: filters.isPosting as any,
    }, token),
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const input = searchQuery.toLowerCase();
    if (!input) return [];
    return COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(input));
  }, [searchQuery]);

  // Compute active filter chips from the search query
  const activeFilters = useMemo(() => {
    const chips: { label: string; remove: string }[] = [];
    const typeMatch = searchQuery.match(/type:(\w+)/i);
    const statusMatch = searchQuery.match(/status:(\w+)/i);
    const isMatch = searchQuery.match(/is:(\w+)/i);
    if (typeMatch) chips.push({ label: `type: ${typeMatch[1].toUpperCase()}`, remove: typeMatch[0] });
    if (statusMatch) chips.push({ label: `status: ${statusMatch[1].toLowerCase()}`, remove: statusMatch[0] });
    if (isMatch) chips.push({ label: `is: ${isMatch[1].toLowerCase()}`, remove: isMatch[0] });
    return chips;
  }, [searchQuery]);

  const removeFilter = (token: string) => {
    setSearchQuery(prev => prev.replace(new RegExp(token.replace(":", "\\:"), "i"), "").trim());
  };

  const navigateTo = (id: string | null) => {
    // Copies the current URL query key/value pairs, not account rows. Time/space: O(n) in query length.
    const params = new URLSearchParams(searchParams.toString());
    // parentId is the selected header account; removing it returns to the root account level.
    if (id) params.set("parentId", id);
    else params.delete("parentId");
    router.push(`/accounts?${params.toString()}`);
  };

  const stats = useMemo(() => collectStats(accountsQuery.data ?? []), [accountsQuery.data]);
  const totalBalance = useMemo(() => collectTotalBalance(accountsQuery.data ?? []), [accountsQuery.data]);
  const currentAccounts = accountsQuery.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <SectionHeading
        title={parentAccount ? parentAccount.name : "Chart of Accounts"}
        description={parentAccount ? `Children of ${parentAccount.code}` : "Manage your root account hierarchy."}
        action={
          <div className="flex items-center gap-3">
            <Link href={parentId ? `/accounts/new?parentAccountId=${parentId}` : "/accounts/new"}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New {parentId ? "Child" : "Account"}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Breadcrumbs / Navigation Control */}
      <div className="flex items-center gap-3 py-1 text-sm text-gray-500">
        <button
          onClick={() => navigateTo(null)}
          className="flex items-center gap-1.5 hover:text-teal-400 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="font-semibold">Root</span>
        </button>
        {parentAccount && (
          <>
            <ChevronRight className="h-4 w-4 opacity-30" />
            {parentAccount.parentAccount && (
              <>
                <button
                  onClick={() => navigateTo(parentAccount && parentAccount.parentAccountId ? parentAccount.parentAccountId : null)}
                  className="hover:text-teal-400 transition-colors"
                >
                  ...
                </button>
                <ChevronRight className="h-4 w-4 opacity-30" />
              </>
            )}
            <span className="text-gray-900 font-bold">{parentAccount.name}</span>
          </>
        )}
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.entries(TYPE_STYLES) as [AccountType, (typeof TYPE_STYLES)[AccountType]][]).map(([type, style]) => (
          <button
            key={type}
            onClick={() => setSearchQuery(`type:${type} `)}
            className={cn(
              "group flex flex-col gap-1 rounded-2xl border p-3 text-left transition-all hover:scale-[1.02] hover:shadow-lg",
              style.badge,
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{style.label}</span>
            <span className="text-2xl font-black tabular-nums">{stats[type]}</span>
            <span className="text-[10px] opacity-50">accounts</span>
          </button>
        ))}
        <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Net Balance</span>
          <span className={cn("text-lg font-black tabular-nums font-mono", totalBalance >= 0 ? "text-teal-400" : "text-rose-400")}>
            {formatCurrency(String(totalBalance))}
          </span>
          <span className="text-[10px] text-gray-600">all accounts</span>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="app-surface p-4 relative overflow-visible z-50">
        <div ref={searchRef} className="relative max-w-2xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search or filter: type:Asset, status:Active, is:Posting…"
              className="app-field h-12 focus:ring-teal-500/20 pl-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map(chip => (
                <span
                  key={chip.remove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300"
                >
                  {chip.label}
                  <button onClick={() => removeFilter(chip.remove)} className="hover:text-gray-900 transition-colors ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200">
                Suggestions
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.value}
                    onClick={() => { setSearchQuery(suggestion.value + " "); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{suggestion.label}</span>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{suggestion.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Accounts List Table */}
      <Card className="overflow-hidden app-surface p-0">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg border border-gray-200 text-teal-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Accounts View</h2>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500 mt-0.5">
                {parentId ? "Child Accounts" : "Root Accounts"}
              </p>
            </div>
          </div>
          <StatusPill
            label={accountsQuery.isError ? "Error" : accountsQuery.isPending ? "Syncing…" : "Live"}
            tone={accountsQuery.isError ? "warning" : accountsQuery.isPending ? "neutral" : "positive"}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Account Details</th>
                <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Role</th>
                <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Balance</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accountsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-teal-500/50" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading accounts...</span>
                  </td>
                </tr>
              ) : currentAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Database className="mx-auto mb-4 h-10 w-10 text-gray-300 opacity-30" />
                    <p className="text-sm font-medium text-gray-500">No accounts found at this level.</p>
                  </td>
                </tr>
              ) : (
                currentAccounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    // Only header accounts can be opened; posting accounts are leaf accounts.
                    onEnter={() => !account.isPosting && navigateTo(account.id)}
                    isSearching={isSearching}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AccountRow({ account, onEnter, isSearching }: { account: Account; onEnter: () => void; isSearching?: boolean }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const balanceNum = parseFloat(account.currentBalance);
  const style = TYPE_STYLES[account.type];

  // Action mutations
  const activateMutation = useMutation({
    mutationFn: () => activateAccount(account.id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateAccount(account.id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  return (
    <tr
      className={cn(
        "group transition-all hover:bg-gray-50",
        !account.isPosting && "cursor-pointer"
      )}
      // Guard row clicks too, so posting accounts never navigate into a child level.
      onClick={() => !account.isPosting && onEnter()}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className={cn("h-1.5 w-1.5 rounded-full ring-4 shadow-[0_0_8px]", style.dot.replace("bg-", "ring-").replace("bg-", "text-"), style.dot)} />
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold transition-colors", account.isActive ? "text-gray-900 group-hover:text-teal-400" : "text-gray-500 line-through")}>
                {account.name}
              </span>
              {!account.isPosting && <ChevronRight className="h-3 w-3 text-gray-600 group-hover:text-teal-500 transition-transform group-hover:translate-x-0.5" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-[11px] font-mono font-medium text-gray-500">{account.code}</div>
              {isSearching && account.parentAccount && (
                <>
                  <div className="h-1 w-1 rounded-full bg-zinc-700" />
                  <div className="text-[10px] font-medium text-teal-500/70 truncate max-w-[200px] uppercase tracking-wider">
                    in {account.parentAccount.name}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <StatusPill
            label={account.isPosting ? "Posting" : "Header"}
            tone={account.isPosting ? "positive" : "neutral"}
          />
          {!account.isActive && (
            <StatusPill
              label="Inactive"
              tone="warning"
            />
          )}
          {!account.isPosting && (
            <span className="text-[9px] font-bold uppercase tracking-tighter text-teal-500/50 group-hover:text-teal-400 group-hover:translate-x-1 transition-all">
              Go to level
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-4 text-right tabular-nums">
        <span className={cn(
          "font-mono text-sm font-bold",
          balanceNum > 0 ? "text-teal-400" : balanceNum < 0 ? "text-rose-400" : "text-gray-600",
        )}>
          {formatCurrency(account.currentBalance)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!account.isPosting && (
            <Link
              href={`/accounts/new?parentAccountId=${account.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-teal-500/10 hover:text-teal-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Add Child Account"
            >
              <PlusCircle className="h-4 w-4" />
            </Link>
          )}
          <Link
            href={`/accounts/edit/${account.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Edit Account"
          >
            <Edit className="h-4 w-4" />
          </Link>
          {account.isActive ? (
            <button
              onClick={(e) => { e.stopPropagation(); deactivateMutation.mutate(); }}
              disabled={deactivateMutation.isPending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-50"
              title="Deactivate Account"
            >
              <PowerOff className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); activateMutation.mutate(); }}
              disabled={activateMutation.isPending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-teal-500/10 hover:text-teal-400 transition-colors disabled:opacity-50"
              title="Activate Account"
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

