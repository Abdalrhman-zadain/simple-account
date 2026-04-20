import type {
  AccountsQuery,
  BankCashAccountsQuery,
  BankCashTransactionsQuery,
  BankReconciliationsQuery,
  CustomersQuery,
  JournalEntriesQuery,
  PurchaseRequestsQuery,
  SalesDocumentsQuery,
  SuppliersQuery,
} from "@/types/api";

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
  bankCashTransactions(token: string | null, params: BankCashTransactionsQuery = {}) {
    return ["bank-cash-transactions", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankReconciliations(token: string | null, params: BankReconciliationsQuery = {}) {
    return ["bank-reconciliations", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  bankReconciliationById(token: string | null, id: string | null) {
    return ["bank-reconciliation", token, id] as const;
  },
  salesCustomers(token: string | null, params: CustomersQuery = {}) {
    return ["sales-customers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseSuppliers(token: string | null, params: SuppliersQuery = {}) {
    return ["purchase-suppliers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseRequests(token: string | null, params: PurchaseRequestsQuery = {}) {
    return ["purchase-requests", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseRequestById(token: string | null, id: string | null) {
    return ["purchase-request", token, id] as const;
  },
  purchaseSupplierBalance(token: string | null, supplierId: string | null) {
    return ["purchase-supplier-balance", token, supplierId] as const;
  },
  purchaseSupplierTransactions(token: string | null, supplierId: string | null) {
    return ["purchase-supplier-transactions", token, supplierId] as const;
  },
  salesCustomerBalance(token: string | null, customerId: string | null) {
    return ["sales-customer-balance", token, customerId] as const;
  },
  salesCustomerTransactions(token: string | null, customerId: string | null) {
    return ["sales-customer-transactions", token, customerId] as const;
  },
  salesQuotations(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-quotations", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesOrders(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-orders", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesInvoices(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-invoices", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesCreditNotes(token: string | null, params: SalesDocumentsQuery = {}) {
    return ["sales-credit-notes", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  salesReceipts(token: string | null, params: { customerId?: string; search?: string } = {}) {
    return ["sales-receipts", token, normalizeObject(params as Record<string, unknown>)] as const;
  },
  salesAging(token: string | null, asOfDate?: string) {
    return ["sales-aging", token, asOfDate ?? null] as const;
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
