import type { AccountsQuery } from "@/types/api";
export { getApiBaseUrl } from "@/lib/config/api";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function buildAccountQuery(params: AccountsQuery) {
  const searchParams = new URLSearchParams();

  if (params.type) {
    searchParams.set("type", params.type);
  }

  if (params.isActive) {
    searchParams.set("isActive", params.isActive);
  }

  if (params.isPosting) {
    searchParams.set("isPosting", params.isPosting);
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.parentAccountId !== undefined) {
    searchParams.set("parentAccountId", params.parentAccountId === null ? "null" : params.parentAccountId);
  }

  if (params.usage) {
    searchParams.set("usage", params.usage);
  }

  if (params.view) {
    searchParams.set("view", params.view);
  }

  return searchParams.toString();
}

export function formatCurrency(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
