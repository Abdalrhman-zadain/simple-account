"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Search as SearchIcon,
  Database,
  Eye,
  Edit,
  UserMinus,
  UserCheck,
  Loader2,
  ArrowUpRight,
  X,
  PlusCircle,
  Command,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import {
  getAccountsTree,
  deactivateAccount,
  activateAccount,
  getAccountTransactions,
  getAccountById,
} from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { ACCOUNT_TYPES, AccountType, Account, AccountTreeNode } from "@/types/api";
import { Field, Input } from "@/components/forms";
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function AccountsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Unified Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Parsed Filters
  const filters = useMemo(() => {
    const params: Record<string, string> = {
      search: searchQuery,
    };

    if (searchQuery.includes("type:")) {
      const match = searchQuery.match(/type:(\w+)/i);
      if (match) {
        params.type = match[1].toUpperCase();
        params.search = searchQuery.replace(/type:\w+/i, "").trim();
      }
    }

    if (searchQuery.includes("status:")) {
      const match = searchQuery.match(/status:(\w+)/i);
      if (match) {
        params.isActive = match[1].toLowerCase() === "active" ? "true" : "false";
        params.search = params.search.replace(/status:\w+/i, "").trim();
      }
    }

    if (searchQuery.includes("is:")) {
      const match = searchQuery.match(/is:(\w+)/i);
      if (match) {
        params.isPosting = match[1].toLowerCase() === "posting" ? "true" : "false";
        params.search = params.search.replace(/is:\w+/i, "").trim();
      }
    }

    return params;
  }, [searchQuery]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // We always use the Tree query because the user wants a hierarchical table
  const treeQuery = useQuery({
    queryKey: ["accounts-tree", token, filters],
    queryFn: () => getAccountsTree({
      search: filters.search,
      type: filters.type as any,
      isActive: filters.isActive as any,
      isPosting: filters.isPosting as any
    }, token),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateAccount(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateAccount(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });

  const handleViewDetails = (id: string) => {
    setSelectedAccountId(id);
    setIsDetailOpen(true);
  };

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

  const flattenedSuggestions = useMemo(() => {
    const input = searchQuery.toLowerCase();
    if (!input) return [];
    return COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(input));
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <SectionHeading
        title="Chart of Accounts"
        description="Navigate your account hierarchy. Use the search bar for advanced filtering (e.g., type:Asset)."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => treeQuery.refetch()}
            >
              <RefreshCw className={treeQuery.isPending ? "h-4 w-4 animate-spin mr-2" : "h-4 w-4 mr-2"} />
              Sync
            </Button>
            <Link href="/accounts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </Link>
          </div>
        }
      />

      {/* Advanced Command Search */}
      <Card className="border border-white/5 bg-panel/30 p-4 backdrop-blur-xl relative overflow-visible z-50">
        <div ref={searchRef} className="relative max-w-2xl mx-auto">
          <div className="relative group">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by code, name, or use commands (type:Asset, status:Active, is:Posting)..."
              className="pl-12 h-12 bg-black/40 border-white/10 focus:ring-teal-500/20 text-base"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && flattenedSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/5">
                Suggestions
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {flattenedSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.value}
                    onClick={() => {
                      setSearchQuery(suggestion.value + " ");
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                      {suggestion.label}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded">
                      {suggestion.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tree Table */}
      <div className="flex gap-6 min-h-[600px]">
        <Card className="flex-1 overflow-hidden p-0 border border-white/5 bg-panel/40 backdrop-blur-xl shadow-xl min-w-0">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <Database className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Account List</h2>
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mt-0.5">
                  Hierarchical View
                </p>
              </div>
            </div>
            <StatusPill
              label={treeQuery.isError ? "Error" : treeQuery.isPending ? "Syncing..." : "Live"}
              tone={treeQuery.isError ? "warning" : treeQuery.isPending ? "neutral" : "positive"}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Account Name</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Code</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Balance</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {treeQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-teal-500 mx-auto mb-2" />
                      <span className="text-zinc-500">Loading hierarchy...</span>
                    </td>
                  </tr>
                ) : !treeQuery.data?.length ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <SearchIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <span className="text-zinc-500 text-sm">No accounts found.</span>
                    </td>
                  </tr>
                ) : (
                  treeQuery.data.map((node) => (
                    <TreeTableRow
                      key={node.id}
                      node={node}
                      selectedId={selectedAccountId}
                      onSelect={handleViewDetails}
                      onToggleActive={(id, active) => active ? deactivateMutation.mutate(id) : activateMutation.mutate(id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Detail Panel */}
        {selectedAccountId && isDetailOpen && (
          <div className="w-[420px] shrink-0 sticky top-6 self-start">
            <Card className="border border-white/5 bg-panel/40 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 bg-black/20">
                <span className="text-sm font-bold text-white">Account Workspace</span>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-auto max-h-[calc(100vh-180px)] p-6">
                <AccountDetailsView accountId={selectedAccountId} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tree Table Row ───────────────────────────────────────────────────────────

function TreeTableRow({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onToggleActive,
}: {
  node: AccountTreeNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <>
      <tr
        onClick={() => onSelect(node.id)}
        className={cn(
          "group cursor-pointer transition-all duration-200 border-l-4",
          isSelected ? "bg-teal-500/10 border-teal-500 shadow-inner" : "hover:bg-white/[0.03] border-transparent",
          !node.isActive && "opacity-50 grayscale-[0.5]"
        )}
      >
        <td className="px-5 py-4 min-w-[300px]" style={{ paddingLeft: `${depth * 28 + 20}px` }}>
          <div className="flex items-center gap-3">
            {/* Expansion Icon [+] / [-] */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/40 text-[10px] font-black transition-all",
                  isExpanded ? "text-amber-400 border-amber-500/30" : "text-teal-400 border-teal-500/30"
                )}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <div className="h-5 w-5 flex items-center justify-center text-zinc-700">
                <div className="h-1 w-1 rounded-full bg-current" />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className={cn(
                "text-sm tracking-tight transition-colors truncate",
                hasChildren ? "font-bold text-white group-hover:text-amber-400" : "font-medium text-zinc-300 group-hover:text-teal-400"
              )}>
                {node.name}
              </span>
              {node.nameAr && (
                <span className="text-[10px] text-zinc-500 font-arabic truncate" dir="rtl">{node.nameAr}</span>
              )}
            </div>
          </div>
        </td>

        <td className="px-5 py-4">
          <span className="font-mono text-xs font-bold text-zinc-500 tracking-wider">
            {node.code}
          </span>
        </td>

        <td className="px-5 py-4">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 uppercase tracking-widest shrink-0">
            {node.type}
          </span>
        </td>

        <td className="px-5 py-4 text-center">
          <StatusPill label={node.isActive ? "Active" : "Inactive"} tone={node.isActive ? "positive" : "neutral"} />
        </td>

        <td className="px-5 py-4 text-right">
          <span className={cn(
            "font-mono text-sm font-black tabular-nums transition-all",
            parseFloat(node.currentBalance) > 0 ? "text-teal-400" :
              parseFloat(node.currentBalance) < 0 ? "text-rose-400" : "text-zinc-500"
          )}>
            {formatCurrency(node.currentBalance)}
          </span>
        </td>

        <td className="px-5 py-4 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {/* Add Child Shortcut */}
            {!node.isPosting && (
              <Link href={`/accounts/new?parentAccountId=${node.id}`}>
                <button
                  className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-teal-500/10 hover:text-teal-400"
                  title="Add Child Account"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </Link>
            )}
            <button
              onClick={() => onSelect(node.id)}
              className="rounded-lg p-2 text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              title="View Entry"
            >
              <Eye className="h-4 w-4" />
            </button>
            <Link href={`/accounts/edit/${node.id}`}>
              <button className="rounded-lg p-2 text-zinc-400 transition-all hover:bg-white/10 hover:text-white" title="Modify Settings">
                <Edit className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </td>
      </tr>

      {isExpanded && node.children.map((child) => (
        <TreeTableRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleActive={onToggleActive}
        />
      ))}
    </>
  );
}

// ─── Shared Components ─────────────────────────────────────────────────────────
// (Reusing AccountDetailsView from previous implementation)

function AccountDetailsView({ accountId }: { accountId: string }) {
  const { token } = useAuth();

  const accountQuery = useQuery({
    queryKey: ["account", accountId, token],
    queryFn: () => getAccountById(accountId!, token),
  });

  const transactionsQuery = useQuery({
    queryKey: ["account-transactions", accountId, token],
    queryFn: () => getAccountTransactions({ accountId }, token),
    enabled: !!accountId,
  });

  if (accountQuery.isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
      <span className="text-xs font-medium tracking-widest uppercase opacity-50">Fetching account data...</span>
    </div>
  );

  if (!accountQuery.data) return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
      <p className="text-rose-400 text-sm font-bold">Account profile could not be retrieved.</p>
    </div>
  );

  const account = accountQuery.data;
  const transactions = transactionsQuery.data?.transactions ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Identity Card */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 rounded bg-teal-500/10 text-[10px] font-bold text-teal-400 border border-teal-500/20 uppercase tracking-tighter mb-2">
              {account.code}
            </span>
            <h3 className="text-2xl font-black text-white leading-none tracking-tight truncate">{account.name}</h3>
            {account.nameAr && (
              <p className="text-lg text-zinc-500 mt-2 font-arabic" dir="rtl">{account.nameAr}</p>
            )}
          </div>
          <div className="shrink-0 pt-2">
            <StatusPill label={account.isActive ? "Active" : "Inactive"} tone={account.isActive ? "positive" : "neutral"} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill label={account.isPosting ? "Posting" : "Header / Group"} tone={account.isPosting ? "positive" : "warning"} />
          <span className="px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {account.type}
          </span>
        </div>
      </div>

      {/* Financial Position */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20 shadow-lg shadow-teal-500/10">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-400/60 mb-1">Current Ledger Balance</div>
        <div className="text-4xl font-black tabular-nums text-white flex items-baseline gap-2">
          {formatCurrency(account.currentBalance)}
          <span className="text-sm font-bold opacity-30 text-teal-400">{account.currencyCode || "JOD"}</span>
        </div>
      </div>

      {/* Account Heritage */}
      {account.parentAccount && (
        <div className="grid gap-4">
          <div className="relative pl-6 py-4 border-l-2 border-dashed border-white/10">
            <div className="absolute top-0 left-[-5px] h-2 w-2 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-[-5px] h-2 w-2 rounded-full bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Parent Node</span>
            <Link href={`/accounts?id=${account.parentAccount.id}`} className="group inline-flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-500 font-bold bg-white/5 px-2 py-1 rounded group-hover:bg-teal-500/10 group-hover:text-teal-400 transition-colors">
                {account.parentAccount.code}
              </span>
              <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{account.parentAccount.name}</span>
            </Link>
          </div>
        </div>
      )}

      {/* GL Insight Link */}
      {account.isPosting && (
        <Link href={`/general-ledger?accountId=${account.id}`}>
          <button className="w-full group relative overflow-hidden flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all">
            <div className="flex items-center gap-4 z-10">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-teal-950 transition-colors">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="text-sm font-black text-white block">Detailed Statement</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transaction History</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-700 group-hover:text-teal-500 transition-colors z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </Link>
      )}

      {/* Recent Ledger History */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Live Feed</span>
          <span className="flex items-center gap-2 text-[10px] font-bold text-teal-500 animate-pulse">
            <div className="h-1 w-1 rounded-full bg-current" />
            Real Time
          </span>
        </div>
        {transactionsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center italic text-zinc-500 text-sm">
            No entries captured for this period.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 8).map((tx) => {
              const dr = parseFloat(tx.debitAmount);
              const cr = parseFloat(tx.creditAmount);
              const isDebit = dr > 0;
              return (
                <div key={tx.id} className="group p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-teal-400 block mb-0.5">{tx.reference}</span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{formatDate(tx.entryDate)}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-mono text-sm font-black tabular-nums block",
                        isDebit ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {isDebit ? "DR" : "CR"} {formatCurrency(isDebit ? dr : cr)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Technical Audit */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
        <div>
          <span className="text-[9px] font-bold uppercase text-zinc-600 block mb-1">Creation Record</span>
          <span className="text-[10px] font-medium text-zinc-400">{formatDate(account.createdAt)}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold uppercase text-zinc-600 block mb-1">Last Modification</span>
          <span className="text-[10px] font-medium text-zinc-400">{formatDate(account.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
