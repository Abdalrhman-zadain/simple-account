import { getApiBaseUrl } from "@/lib/config/api";
import { clearSession } from "@/lib/storage";
import { buildAccountQuery } from "@/lib/utils";
import {
    Account,
    AccountOption,
    AccountsQuery,
    AccountSubtype,
    AccountTableRow,
    AccountTreeNode,
    ApiCheckResult,
    ApiErrorShape,
    AuditLogEntry,
    BankCashAccount,
    BankCashAccountsQuery,
    BankCashAccountTransactionsResponse,
    BankCashTransaction,
    BankCashTransactionsQuery,
    BankReconciliation,
    BankReconciliationsQuery,
    BankReconciliationListItem,
    CreateAccountPayload,
    CreateAccountSubtypePayload,
    CreateBankCashAccountPayload,
    CreateBankReconciliationMatchPayload,
    CreateBankReconciliationPayload,
    CreateBankStatementLinePayload,
    CreatePaymentPayload,
    CreateReceiptPayload,
    CreateTransferPayload,
    CreateJournalEntryPayload,
    CreateJournalEntryTypePayload,
    CreatePaymentMethodTypePayload,
    CreateSegmentValuePayload,
    FiscalPeriod,
    FiscalYear,
    JournalEntriesQuery,
    JournalEntry,
    JournalEntryType,
    LedgerQuery,
    LedgerResponse,
    LoginPayload,
    LoginResponse,
    PaymentMethodType,
    RegisterPayload,
    RegisterResponse,
    ImportBankStatementLinesPayload,
    SegmentDefinition,
    SegmentValue,
    UpdateAccountPayload,
    UpdateAccountSubtypePayload,
    UpdateBankCashAccountPayload,
    UpdateBankCashTransactionPayload,
    UpdateJournalEntryTypePayload,
    UpdatePaymentMethodTypePayload,
    UpdateSegmentValuePayload
} from "@/types/api";

export class ApiError extends Error {
  status: number;
  details?: ApiErrorShape | string;

  constructor(message: string, status: number, details?: ApiErrorShape | string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    // If the backend says our session is unauthorized, clear local session so
    // the UI can recover cleanly (e.g. after token expiry or JWT secret changes).
    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.assign("/login");
      }
    }
    throw normalizeApiError(response.status, body);
  }

  return body as T;
}

function normalizeApiError(status: number, body: unknown) {
  if (typeof body === "string") {
    return new ApiError(body || "Unexpected API error", status, body);
  }

  const payload = (body ?? {}) as ApiErrorShape;
  const message = Array.isArray(payload.message)
    ? payload.message.join(", ")
    : payload.message || payload.error || "Unexpected API error";

  return new ApiError(message, status, payload);
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(params: AccountsQuery = {}, token?: string | null) {
  const query = buildAccountQuery(params);
  const suffix = query ? `?${query}` : "";
  return apiRequest<Account[]>(`/accounts${suffix}`, { token });
}

export async function getAccountOptions(params: AccountsQuery = {}, token?: string | null) {
  const query = buildAccountQuery({ ...params, view: "selector" });
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountOption[]>(`/accounts${suffix}`, { token });
}

export async function getAccountTableRows(params: AccountsQuery = {}, token?: string | null) {
  const query = buildAccountQuery({ ...params, view: "table" });
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountTableRow[]>(`/accounts${suffix}`, { token });
}

export async function getAccountsTree(params: AccountsQuery = {}, token?: string | null) {
  const query = buildAccountQuery(params);
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountTreeNode[]>(`/accounts/hierarchy/tree${suffix}`, { token });
}

export async function getAccountById(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}`, { token });
}

export async function createAccount(payload: CreateAccountPayload, token?: string | null) {
  return apiRequest<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAccount(id: string, payload: UpdateAccountPayload, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateAccount(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}/deactivate`, { method: "POST", token });
}

export async function activateAccount(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}/activate`, { method: "POST", token });
}

export async function getNextAccountCode(
  parentId?: string | null,
  opts?: { isPosting?: boolean; type?: string },
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (parentId) searchParams.set("parentId", parentId);
  if (typeof opts?.isPosting === "boolean") searchParams.set("isPosting", String(opts.isPosting));
  if (opts?.type) searchParams.set("type", opts.type);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<string>(`/accounts/next-code${query}`, { token });
}

export async function getAccountTransactions(params: LedgerQuery, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<LedgerResponse>(`/general-ledger${suffix}`, { token });
}

// ─── Payment Methods ─────────────────────────────────────────────────────

export async function getBankCashAccounts(params: BankCashAccountsQuery = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankCashAccount[]>(`/bank-cash-accounts${suffix}`, { token });
}

export async function createBankCashAccount(payload: CreateBankCashAccountPayload, token?: string | null) {
  return apiRequest<BankCashAccount>("/bank-cash-accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateBankCashAccount(id: string, payload: UpdateBankCashAccountPayload, token?: string | null) {
  return apiRequest<BankCashAccount>(`/bank-cash-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateBankCashAccount(id: string, token?: string | null) {
  return apiRequest<BankCashAccount>(`/bank-cash-accounts/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function getBankCashAccountTransactions(
  id: string,
  params: { dateFrom?: string; dateTo?: string } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankCashAccountTransactionsResponse>(`/bank-cash-accounts/${id}/transactions${suffix}`, { token });
}

export async function getBankCashTransactions(params: BankCashTransactionsQuery = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.kind) searchParams.set("kind", params.kind);
  if (params.status) searchParams.set("status", params.status);
  if (params.bankCashAccountId) searchParams.set("bankCashAccountId", params.bankCashAccountId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankCashTransaction[]>(`/bank-cash-transactions${suffix}`, { token });
}

export async function getBankCashTransactionById(id: string, token?: string | null) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}`, { token });
}

export async function createReceiptTransaction(payload: CreateReceiptPayload, token?: string | null) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/receipts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createPaymentTransaction(payload: CreatePaymentPayload, token?: string | null) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/payments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createTransferTransaction(payload: CreateTransferPayload, token?: string | null) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateBankCashTransaction(id: string, payload: UpdateBankCashTransactionPayload, token?: string | null) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postBankCashTransaction(id: string, token?: string | null) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function getBankReconciliations(params: BankReconciliationsQuery = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.bankCashAccountId) searchParams.set("bankCashAccountId", params.bankCashAccountId);
  if (params.status) searchParams.set("status", params.status);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankReconciliationListItem[]>(`/bank-reconciliations${suffix}`, { token });
}

export async function getBankReconciliationById(id: string, token?: string | null) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${id}`, { token });
}

export async function createBankReconciliation(payload: CreateBankReconciliationPayload, token?: string | null) {
  return apiRequest<BankReconciliation>("/bank-reconciliations", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createBankStatementLine(
  reconciliationId: string,
  payload: CreateBankStatementLinePayload,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/statement-lines`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function importBankStatementLines(
  reconciliationId: string,
  payload: ImportBankStatementLinesPayload,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/statement-lines/import`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createBankReconciliationMatch(
  reconciliationId: string,
  payload: CreateBankReconciliationMatchPayload,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/matches`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deleteBankReconciliationMatch(reconciliationId: string, matchId: string, token?: string | null) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/matches/${matchId}`, {
    method: "DELETE",
    token,
  });
}

export async function reconcileBankReconciliationMatch(reconciliationId: string, matchId: string, token?: string | null) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/matches/${matchId}/reconcile`, {
    method: "POST",
    token,
  });
}

export async function completeBankReconciliation(reconciliationId: string, token?: string | null) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${reconciliationId}/complete`, {
    method: "POST",
    token,
  });
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export async function getSegmentDefinitions(token?: string | null) {
  return apiRequest<SegmentDefinition[]>("/segments/definitions", { token });
}

export async function getMasterData(token?: string | null) {
  return apiRequest<SegmentDefinition[]>("/segments/master-data", { token });
}

// ─── Account Subtypes (Categories) ─────────────────────────────────────────────

export async function getAccountSubtypes(token?: string | null) {
  return apiRequest<AccountSubtype[]>("/account-subtypes", { token });
}

export async function createAccountSubtype(payload: CreateAccountSubtypePayload, token?: string | null) {
  return apiRequest<AccountSubtype>("/account-subtypes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAccountSubtype(id: string, payload: UpdateAccountSubtypePayload, token?: string | null) {
  return apiRequest<AccountSubtype>(`/account-subtypes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateAccountSubtype(id: string, token?: string | null) {
  return apiRequest<AccountSubtype>(`/account-subtypes/${id}`, { method: "DELETE", token });
}

// ─── Payment Method Types ─────────────────────────────────────────────────────

export async function getPaymentMethodTypes(token?: string | null) {
  return apiRequest<PaymentMethodType[]>("/payment-method-types", { token });
}

export async function createPaymentMethodType(payload: CreatePaymentMethodTypePayload, token?: string | null) {
  return apiRequest<PaymentMethodType>("/payment-method-types", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePaymentMethodType(id: string, payload: UpdatePaymentMethodTypePayload, token?: string | null) {
  return apiRequest<PaymentMethodType>(`/payment-method-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivatePaymentMethodType(id: string, token?: string | null) {
  return apiRequest<PaymentMethodType>(`/payment-method-types/${id}`, { method: "DELETE", token });
}

// ─── Journal Entry Types ───────────────────────────────────────────────────────

export async function getJournalEntryTypes(token?: string | null) {
  return apiRequest<JournalEntryType[]>("/journal-entry-types", { token });
}

export async function createJournalEntryType(payload: CreateJournalEntryTypePayload, token?: string | null) {
  return apiRequest<JournalEntryType>("/journal-entry-types", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateJournalEntryType(id: string, payload: UpdateJournalEntryTypePayload, token?: string | null) {
  return apiRequest<JournalEntryType>(`/journal-entry-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateJournalEntryType(id: string, token?: string | null) {
  return apiRequest<JournalEntryType>(`/journal-entry-types/${id}`, { method: "DELETE", token });
}

export async function getSegmentValues(definitionId: string, token?: string | null) {
  return apiRequest<SegmentValue[]>(`/segments/definitions/${definitionId}/values`, { token });
}

export async function createSegmentValue(definitionId: string, payload: CreateSegmentValuePayload, token?: string | null) {
  return apiRequest<SegmentValue>(`/segments/definitions/${definitionId}/values`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSegmentValue(id: string, payload: UpdateSegmentValuePayload, token?: string | null) {
  return apiRequest<SegmentValue>(`/segments/values/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateSegmentValue(id: string, token?: string | null) {
  return apiRequest<SegmentValue>(`/segments/values/${id}`, { method: "DELETE", token });
}

// ─── Fiscal ───────────────────────────────────────────────────────────────────

export async function getFiscalStatus(token?: string | null) {
  return apiRequest<{ currentPeriod: FiscalPeriod; openYears: number[] }>("/fiscal/status", { token });
}

export async function getFiscalYears(token?: string | null) {
  return apiRequest<FiscalYear[]>("/fiscal/years", { token });
}

export async function createFiscalYear(year: number, token?: string | null) {
  return apiRequest<FiscalYear>("/fiscal/years", {
    method: "POST",
    body: JSON.stringify({ year }),
    token,
  });
}

export async function getFiscalPeriods(token?: string | null) {
  return apiRequest<FiscalPeriod[]>("/fiscal/periods", { token });
}

export async function closeFiscalPeriod(id: string, token?: string | null) {
  return apiRequest<FiscalPeriod>(`/fiscal/periods/${id}/close`, { method: "POST", token });
}

export async function openFiscalPeriod(id: string, token?: string | null) {
  return apiRequest<FiscalPeriod>(`/fiscal/periods/${id}/open`, { method: "POST", token });
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(params: JournalEntriesQuery = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.reference) searchParams.set("reference", params.reference);
  if (params.search) searchParams.set("search", params.search);
  if (params.journalEntryTypeId) searchParams.set("journalEntryTypeId", params.journalEntryTypeId);
  if (typeof params.includeLines === "boolean") searchParams.set("includeLines", String(params.includeLines));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<JournalEntry[]>(`/journal-entries${suffix}`, { token });
}

export async function getJournalEntryById(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}`, { token });
}

export async function createJournalEntry(payload: CreateJournalEntryPayload, token?: string | null) {
  return apiRequest<JournalEntry>("/journal-entries", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postJournalEntry(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}/post`, { method: "POST", token });
}

export async function reverseJournalEntry(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}/reverse`, { method: "POST", token });
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function getAuditLog(params: { entity?: string; entityId?: string; limit?: number } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.entity) searchParams.set("entity", params.entity);
  if (params.entityId) searchParams.set("entityId", params.entityId);
  if (params.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<AuditLogEntry[]>(`/audit${suffix}`, { token });
}

export async function runApiCheck(token?: string | null) {
  const data = await getAccounts({}, token);
  const result: ApiCheckResult = {
    baseUrl: getApiBaseUrl(),
    usedAuth: Boolean(token),
    hasToken: Boolean(token),
    data,
  };
  return result;
}
