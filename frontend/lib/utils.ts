import type { AccountsQuery } from "@/types/api";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
  return raw.replace(/\/+$/, "");
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
