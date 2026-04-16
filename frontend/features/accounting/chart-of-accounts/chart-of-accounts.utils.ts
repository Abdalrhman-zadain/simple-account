import { AccountTableRow } from "@/types/api";

import { AccountsSearchFilters, ActiveFilterChip, ChartAccountType, CommandSuggestion } from "./chart-of-accounts.types";

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

function tokenizeSearchQuery(searchQuery: string) {
  return searchQuery
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function parseFilterToken(token: string) {
  const [rawPrefix, ...rest] = token.split(":");
  const prefix = rawPrefix?.toLowerCase();
  const value = rest.join(":");

  if (!prefix || !value) {
    return null;
  }

  return { prefix, value };
}

export function buildSearchFilters(searchQuery: string) {
  const tokens = tokenizeSearchQuery(searchQuery);
  const params: AccountsSearchFilters = {
    search: "",
    type: [],
    isActive: [],
    isPosting: [],
  };
  const searchTerms: string[] = [];

  for (const token of tokens) {
    const parsed = parseFilterToken(token);

    if (parsed?.prefix === "type") {
      const typeValue = parsed.value.toUpperCase() as ChartAccountType;

      if (Object.prototype.hasOwnProperty.call(TYPE_STYLES, typeValue)) {
        params.type.push(typeValue);
        continue;
      }
    }

    if (parsed?.prefix === "status") {
      const value = parsed.value.toLowerCase();

      if (value === "active" || value === "inactive") {
        params.isActive.push(value === "active" ? "true" : "false");
        continue;
      }
    }

    if (parsed?.prefix === "is") {
      const value = parsed.value.toLowerCase();

      if (value === "posting" || value === "header") {
        params.isPosting.push(value === "posting" ? "true" : "false");
        continue;
      }
    }

    searchTerms.push(token);
  }

  params.type = unique(params.type);
  params.isActive = unique(params.isActive);
  params.isPosting = unique(params.isPosting);
  params.search = searchTerms.join(" ").trim();

  return params;
}

export function applyAccountFilters(accounts: AccountTableRow[], filters: AccountsSearchFilters) {
  return accounts.filter((account) => {
    if (filters.type.length > 0 && !filters.type.includes(account.type as ChartAccountType)) {
      return false;
    }

    const accountStatus = account.isActive ? "true" : "false";
    if (filters.isActive.length > 0 && !filters.isActive.includes(accountStatus)) {
      return false;
    }

    const accountRole = account.isPosting ? "true" : "false";
    if (filters.isPosting.length > 0 && !filters.isPosting.includes(accountRole)) {
      return false;
    }

    return true;
  });
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
  const hasTrailingSpace = /\s$/.test(searchQuery);
  const tokens = searchQuery.trimStart().split(/\s+/).filter(Boolean);
  const activeToken = (hasTrailingSpace ? "" : tokens.at(-1) ?? "").toLowerCase();
  const normalizedToken = activeToken.replace(/\s+/g, "");
  const activeFilters = new Set(tokenizeSearchQuery(searchQuery).map((token) => token.toLowerCase()));

  if (!normalizedToken) {
    return COMMANDS.filter((command) => !activeFilters.has(command.value.toLowerCase()));
  }

  return COMMANDS.filter(
    (command) =>
      !activeFilters.has(command.value.toLowerCase()) &&
      (command.label.toLowerCase().replace(/\s+/g, "").includes(normalizedToken) ||
        command.value.toLowerCase().includes(normalizedToken)),
  );
}

export function getActiveFilterChips(searchQuery: string): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const token of tokenizeSearchQuery(searchQuery)) {
    const parsed = parseFilterToken(token);

    if (parsed?.prefix === "type") {
      const typeValue = parsed.value.toUpperCase() as ChartAccountType;
      if (Object.prototype.hasOwnProperty.call(TYPE_STYLES, typeValue)) {
        chips.push({ label: `type: ${typeValue}`, remove: token });
      }
      continue;
    }

    if (parsed?.prefix === "status") {
      const value = parsed.value.toLowerCase();
      if (value === "active" || value === "inactive") {
        chips.push({ label: `status: ${value}`, remove: token });
      }
      continue;
    }

    if (parsed?.prefix === "is") {
      const value = parsed.value.toLowerCase();
      if (value === "posting" || value === "header") {
        chips.push({ label: `is: ${value}`, remove: token });
      }
    }
  }

  return chips;
}

export function removeFilterToken(searchQuery: string, token: string) {
  const normalized = token.toLowerCase();
  return tokenizeSearchQuery(searchQuery)
    .filter((item) => item.toLowerCase() !== normalized)
    .join(" ");
}

export function appendSearchFilter(searchQuery: string, value: string) {
  const tokens = tokenizeSearchQuery(searchQuery);
  const normalizedValue = value.toLowerCase();

  if (tokens.some((token) => token.toLowerCase() === normalizedValue)) {
    return `${tokens.join(" ")} `.trimStart();
  }

  return `${[...tokens, value].join(" ")} `.trimStart();
}
