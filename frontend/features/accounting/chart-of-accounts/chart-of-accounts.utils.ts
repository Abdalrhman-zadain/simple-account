import { AccountTableRow } from "@/types/api";

import { ActiveFilterChip, ChartAccountType, CommandSuggestion } from "./chart-of-accounts.types";

export const COMMANDS: CommandSuggestion[] = [
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

export const TYPE_STYLES: Record<ChartAccountType, { badge: string; dot: string; label: string }> = {
  ASSET: { badge: "bg-sky-500/10 text-sky-700 border-sky-500/20", dot: "bg-sky-500", label: "accountType.ASSET" },
  LIABILITY: { badge: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500", label: "accountType.LIABILITY" },
  EQUITY: { badge: "bg-violet-500/10 text-violet-700 border-violet-500/20", dot: "bg-violet-500", label: "accountType.EQUITY" },
  REVENUE: { badge: "bg-teal-500/10 text-teal-700 border-teal-500/20", dot: "bg-teal-500", label: "accountType.REVENUE" },
  EXPENSE: { badge: "bg-rose-500/10 text-rose-700 border-rose-500/20", dot: "bg-rose-500", label: "accountType.EXPENSE" },
};

export function buildSearchFilters(searchQuery: string) {
  const params: Record<string, string> = { search: searchQuery };

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
}

export function collectStats(nodes: AccountTableRow[]): Record<ChartAccountType, number> {
  const counts: Record<ChartAccountType, number> = {
    ASSET: 0,
    LIABILITY: 0,
    EQUITY: 0,
    REVENUE: 0,
    EXPENSE: 0,
  };

  for (const node of nodes) {
    if (node.type in counts) {
      counts[node.type as ChartAccountType]++;
    }
  }

  return counts;
}

export function collectTotalBalance(nodes: AccountTableRow[]): number {
  let total = 0;

  for (const node of nodes) {
    total += parseFloat(node.currentBalance);
  }

  return total;
}

export function getCommandSuggestions(searchQuery: string) {
  const input = searchQuery.toLowerCase();
  if (!input) {
    return [];
  }

  return COMMANDS.filter((command) => command.label.toLowerCase().includes(input));
}

export function getActiveFilterChips(searchQuery: string): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const typeMatch = searchQuery.match(/type:(\w+)/i);
  const statusMatch = searchQuery.match(/status:(\w+)/i);
  const isMatch = searchQuery.match(/is:(\w+)/i);

  if (typeMatch) {
    chips.push({ label: `type: ${typeMatch[1].toUpperCase()}`, remove: typeMatch[0] });
  }
  if (statusMatch) {
    chips.push({ label: `status: ${statusMatch[1].toLowerCase()}`, remove: statusMatch[0] });
  }
  if (isMatch) {
    chips.push({ label: `is: ${isMatch[1].toLowerCase()}`, remove: isMatch[0] });
  }

  return chips;
}

export function removeFilterToken(searchQuery: string, token: string) {
  return searchQuery.replace(new RegExp(token.replace(":", "\\:"), "i"), "").trim();
}
