import type { AccountsQuery, BankCashAccountsQuery, JournalEntriesQuery } from "@/types/api";

type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;

function normalizeObject(value: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(value).sort();
  for (const key of keys) {
    const v = value[key];
    if (v === undefined) continue;
    out[key] = v;
  }
  return out;
}

export const queryKeys = {
  accounts(token: string | null, params: AccountsQuery = {}) {
    return ["accounts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  accountById(token: string | null, id: string | null) {
    return ["account", token, id] as const;
  },
  bankCashAccounts(token: string | null, params: BankCashAccountsQuery = {}) {
    return ["bank-cash-accounts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankCashAccountTransactions(token: string | null, id: string | null, params: { dateFrom?: string; dateTo?: string } = {}) {
    return ["bank-cash-account-transactions", token, id, normalizeObject(params as Record<string, unknown>)] as const;
  },
  journalEntries(token: string | null, params: JournalEntriesQuery = {}) {
    return ["journal-entries", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  journalEntryById(token: string | null, id: string | null) {
    return ["journal-entry", token, id] as const;
  },
  journalEntryTypes(token: string | null) {
    return ["journal-entry-types", token] as const;
  },
  accountSubtypes(token: string | null) {
    return ["account-subtypes", token] as const;
  },
  paymentMethodTypes(token: string | null) {
    return ["payment-method-types", token] as const;
  },
  segmentDefinitions(token: string | null) {
    return ["segment-definitions", token] as const;
  },
  fiscalYears(token: string | null) {
    return ["fiscal-years", token] as const;
  },
  auditLog(token: string | null, params: { entity?: string; entityId?: string; limit?: number } = {}) {
    return ["audit-log", token, normalizeObject(params as Record<string, unknown>)] as const;
  },
};
