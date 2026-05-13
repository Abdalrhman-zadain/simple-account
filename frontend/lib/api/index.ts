import { getApiBaseUrl } from "@/lib/config/api";
import { clearSession } from "@/lib/storage";
import { buildAccountQuery } from "@/lib/utils";
import {
  AgingReport,
  Account,
  AccountOption,
  AccountsQuery,
  InventoryItem,
  InventoryGoodsIssue,
  InventoryGoodsIssuesResponse,
  InventoryGoodsIssuesQuery,
  InventoryAdjustment,
  InventoryAdjustmentsResponse,
  InventoryAdjustmentsQuery,
  InventoryStockMovement,
  InventoryStockLedgerResponse,
  InventoryStockLedgerQuery,
  InventoryItemsQuery,
  InventoryItemsResponse,
  InventoryGoodsReceipt,
  InventoryGoodsReceiptsResponse,
  InventoryGoodsReceiptsQuery,
  InventoryTransfer,
  InventoryTransfersResponse,
  InventoryTransfersQuery,
  InventoryWarehouse,
  InventoryPolicy,
  InventoryItemCategory,
  InventoryItemCategoriesQuery,
  InventoryItemGroup,
  InventoryMasterDataQuery,
  InventoryUnitOfMeasure,
  InventoryWarehousesQuery,
  AccountSubtype,
  AccountTableRow,
  AccountTreeNode,
  ApiCheckResult,
  ApiErrorShape,
  AuditLogEntry,
  AllocateReceiptPayload,
  AdjustPayslipPayload,
  AssignEmployeeComponentPayload,
  AssignPayrollGroupComponentPayload,
  BankCashAccount,
  BankCashAccountsQuery,
  BankCashAccountTransactionsResponse,
  BankCashTransaction,
  BankCashTransactionsQuery,
  BankReconciliation,
  BankReconciliationsQuery,
  BankReconciliationListItem,
  Customer,
  CustomerBalance,
  CustomerReceipt,
  CustomerTransaction,
  ConvertPurchaseRequestToOrderPayload,
  CustomersQuery,
  SalesRepresentative,
  SalesRepresentativesQuery,
  CreateDebitNotePayload,
  CreateInventoryItemPayload,
  CreateInventoryItemCategoryPayload,
  CreateInventoryGoodsIssuePayload,
  CreateInventoryGoodsReceiptPayload,
  CreateInventoryItemGroupPayload,
  CreateInventoryTransferPayload,
  CreateInventoryAdjustmentPayload,
  CreateInventoryUnitOfMeasurePayload,
  CreateInventoryWarehousePayload,
  CreateAccountPayload,
  CreateAccountSubtypePayload,
  CreateCreditNotePayload,
  CreateCustomerPayload,
  CreateSalesRepresentativePayload,
  CreatePurchaseRequestPayload,
  CreatePurchaseOrderPayload,
  CreatePurchaseReceiptPayload,
  CreatePurchaseInvoicePayload,
  CreateSupplierPaymentPayload,
  CreateSupplierPayload,
  CreateTaxPayload,
  CreateTaxTreatmentPayload,
  CreateBankCashAccountPayload,
  CreateLinkedBankCashAccountPayload,
  CreateLinkedBankCashAccountResponse,
  CreateBankReconciliationMatchPayload,
  CreateBankReconciliationPayload,
  CreateBankStatementLinePayload,
  CreatePaymentPayload,
  CreatePayrollComponentPayload,
  CreatePayrollEmployeePayload,
  CreatePayrollGroupPayload,
  CreatePayrollPaymentPayload,
  CreatePayrollPeriodPayload,
  CreatePayrollRulePayload,
  CreateFixedAssetAcquisitionPayload,
  CreateFixedAssetCategoryPayload,
  CreateFixedAssetDepreciationRunPayload,
  CreateFixedAssetDisposalPayload,
  CreateFixedAssetPayload,
  CreateFixedAssetTransferPayload,
  CreateReceiptPayload,
  CreateCustomerReceiptPayload,
  CreateSalesInvoicePayload,
  CreateSalesOrderPayload,
  CreateSalesQuotationPayload,
  CreateTransferPayload,
  GenerateInventoryBarcodeResponse,
  CreateJournalEntryPayload,
  CreateJournalEntryTypePayload,
  CreatePaymentMethodTypePayload,
  CreatePaymentTermPayload,
  CreateSegmentValuePayload,
  FiscalPeriod,
  FiscalYear,
  DebitNote,
  DebitNotesQuery,
  DueDateCalculationMethod,
  JournalEntriesQuery,
  JournalEntry,
  JournalEntryType,
  LedgerQuery,
  LedgerResponse,
  LoginPayload,
  LoginResponse,
  PaymentMethodType,
  PayrollComponent,
  PayrollEmployee,
  PayrollGroup,
  PayrollPayment,
  PayrollPeriod,
  PayrollRule,
  PayrollSummary,
  FixedAsset,
  FixedAssetAcquisition,
  FixedAssetCategory,
  FixedAssetDepreciationRun,
  FixedAssetDisposal,
  FixedAssetSummary,
  FixedAssetTransfer,
  ReportingActivityEntry,
  ReportingAuditReport,
  ReportingBalanceSheetReport,
  ReportingCatalogItem,
  ReportingCashMovementReport,
  ReportingDefinition,
  ReportingDefinitionPayload,
  ReportingExportPayload,
  ReportingExportResult,
  ReportingGeneralLedgerReport,
  ReportingProfitLossReport,
  ReportingQuery,
  ReportingSnapshot,
  ReportingSnapshotPayload,
  ReportingSummary,
  ReportingTrialBalanceReport,
  ReportingWarning,
  Payslip,
  EmployeePayrollComponent,
  ReceiptAllocationResult,
  RegisterPayload,
  RegisterResponse,
  ImportBankStatementLinesPayload,
  SegmentDefinition,
  SegmentValue,
  SalesOrder,
  SalesQuotation,
  SalesInvoice,
  PurchaseRequest,
  PurchaseRequestConversionResult,
  PurchaseOrder,
  PurchasePolicy,
  PurchaseReceipt,
  PurchaseInvoice,
  SupplierPayment,
  PurchaseOrdersQuery,
  PurchaseInvoicesQuery,
  PurchaseRequestsQuery,
  SupplierPaymentsQuery,
  Supplier,
  SupplierBalance,
  Tax,
  TaxTreatment,
  PaymentTerm,
  PurchaseRequestStatusNotePayload,
  PostSalesInvoicePayload,
  SupplierTransactionsResponse,
  SuppliersQuery,
  CreditNote,
  SalesDocumentsQuery,
  UpdateAccountPayload,
  UpdateAccountSubtypePayload,
  UpdateInventoryItemPayload,
  UpdateInventoryItemCategoryPayload,
  UpdateInventoryGoodsIssuePayload,
  UpdateInventoryGoodsReceiptPayload,
  UpdateInventoryItemGroupPayload,
  UpdateInventoryTransferPayload,
  UpdateInventoryAdjustmentPayload,
  UpdateInventoryUnitOfMeasurePayload,
  UpdateInventoryWarehousePayload,
  UpdateInventoryPolicyPayload,
  UpdateBankCashAccountPayload,
  UpdateBankCashTransactionPayload,
  UpdateDebitNotePayload,
  UpdateCreditNotePayload,
  UpdateCustomerPayload,
  UpdateSalesRepresentativePayload,
  UpdateJournalEntryTypePayload,
  UpdatePaymentMethodTypePayload,
  UpdatePayrollComponentPayload,
  UpdatePayrollEmployeePayload,
  UpdatePayrollGroupPayload,
  UpdatePayrollPaymentPayload,
  UpdatePayrollPeriodPayload,
  UpdatePayrollRulePayload,
  UpdateFixedAssetCategoryPayload,
  UpdateFixedAssetPayload,
  UpdateSalesOrderPayload,
  UpdateSalesQuotationPayload,
  UpdateSalesInvoicePayload,
  UpdatePurchaseRequestPayload,
  UpdatePurchaseOrderPayload,
  UpdatePurchaseReceiptPayload,
  UpdatePurchaseInvoicePayload,
  UpdateSupplierPaymentPayload,
  UpdateSupplierPayload,
  UpdateTaxPayload,
  UpdateTaxTreatmentPayload,
  UpdatePaymentTermPayload,
  UpdateSegmentValuePayload,
} from "@/types/api";

export class ApiError extends Error {
  status: number;
  details?: ApiErrorShape | string;

  constructor(
    message: string,
    status: number,
    details?: ApiErrorShape | string,
  ) {
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

export async function getAccounts(
  params: AccountsQuery = {},
  token?: string | null,
) {
  const query = buildAccountQuery(params);
  const suffix = query ? `?${query}` : "";
  return apiRequest<Account[]>(`/accounts${suffix}`, { token });
}

export async function getAccountOptions(
  params: AccountsQuery = {},
  token?: string | null,
) {
  const query = buildAccountQuery({ ...params, view: "selector" });
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountOption[]>(`/accounts${suffix}`, { token });
}

export async function getAccountTableRows(
  params: AccountsQuery = {},
  token?: string | null,
) {
  const query = buildAccountQuery({ ...params, view: "table" });
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountTableRow[]>(`/accounts${suffix}`, { token });
}

export async function getAccountsTree(
  params: AccountsQuery = {},
  token?: string | null,
) {
  const query = buildAccountQuery(params);
  const suffix = query ? `?${query}` : "";
  return apiRequest<AccountTreeNode[]>(`/accounts/hierarchy/tree${suffix}`, {
    token,
  });
}

export async function getAccountById(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}`, { token });
}

export async function createAccount(
  payload: CreateAccountPayload,
  token?: string | null,
) {
  return apiRequest<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload,
  token?: string | null,
) {
  return apiRequest<Account>(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deleteAccount(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function deactivateAccount(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function activateAccount(id: string, token?: string | null) {
  return apiRequest<Account>(`/accounts/${id}/activate`, {
    method: "POST",
    token,
  });
}

export async function getNextAccountCode(
  parentId?: string | null,
  opts?: { isPosting?: boolean; type?: string },
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (parentId) searchParams.set("parentId", parentId);
  if (typeof opts?.isPosting === "boolean")
    searchParams.set("isPosting", String(opts.isPosting));
  if (opts?.type) searchParams.set("type", opts.type);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiRequest<string>(`/accounts/next-code${query}`, { token });
}

export async function getAccountTransactions(
  params: LedgerQuery,
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<LedgerResponse>(`/general-ledger${suffix}`, { token });
}

// ─── Payment Methods ─────────────────────────────────────────────────────

export async function getBankCashAccounts(
  params: BankCashAccountsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankCashAccount[]>(`/bank-cash-accounts${suffix}`, {
    token,
  });
}

export async function createBankCashAccount(
  payload: CreateBankCashAccountPayload,
  token?: string | null,
) {
  return apiRequest<BankCashAccount>("/bank-cash-accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createLinkedBankCashAccount(
  payload: CreateLinkedBankCashAccountPayload,
  token?: string | null,
) {
  return apiRequest<CreateLinkedBankCashAccountResponse>(
    "/bank-cash-accounts/linked-account",
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function updateBankCashAccount(
  id: string,
  payload: UpdateBankCashAccountPayload,
  token?: string | null,
) {
  return apiRequest<BankCashAccount>(`/bank-cash-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateBankCashAccount(
  id: string,
  token?: string | null,
) {
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
  return apiRequest<BankCashAccountTransactionsResponse>(
    `/bank-cash-accounts/${id}/transactions${suffix}`,
    { token },
  );
}

export async function getBankCashTransactions(
  params: BankCashTransactionsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.kind) searchParams.set("kind", params.kind);
  if (params.status) searchParams.set("status", params.status);
  if (params.bankCashAccountId)
    searchParams.set("bankCashAccountId", params.bankCashAccountId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankCashTransaction[]>(`/bank-cash-transactions${suffix}`, {
    token,
  });
}

export async function getBankCashTransactionById(
  id: string,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}`, {
    token,
  });
}

export async function createReceiptTransaction(
  payload: CreateReceiptPayload,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/receipts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createPaymentTransaction(
  payload: CreatePaymentPayload,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/payments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createTransferTransaction(
  payload: CreateTransferPayload,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>("/bank-cash-transactions/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateBankCashTransaction(
  id: string,
  payload: UpdateBankCashTransactionPayload,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postBankCashTransaction(
  id: string,
  token?: string | null,
) {
  return apiRequest<BankCashTransaction>(`/bank-cash-transactions/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function getBankReconciliations(
  params: BankReconciliationsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.bankCashAccountId)
    searchParams.set("bankCashAccountId", params.bankCashAccountId);
  if (params.status) searchParams.set("status", params.status);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<BankReconciliationListItem[]>(
    `/bank-reconciliations${suffix}`,
    { token },
  );
}

export async function getBankReconciliationById(
  id: string,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(`/bank-reconciliations/${id}`, {
    token,
  });
}

export async function createBankReconciliation(
  payload: CreateBankReconciliationPayload,
  token?: string | null,
) {
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
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/statement-lines`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function importBankStatementLines(
  reconciliationId: string,
  payload: ImportBankStatementLinesPayload,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/statement-lines/import`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function createBankReconciliationMatch(
  reconciliationId: string,
  payload: CreateBankReconciliationMatchPayload,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/matches`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function deleteBankReconciliationMatch(
  reconciliationId: string,
  matchId: string,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/matches/${matchId}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function reconcileBankReconciliationMatch(
  reconciliationId: string,
  matchId: string,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/matches/${matchId}/reconcile`,
    {
      method: "POST",
      token,
    },
  );
}

export async function completeBankReconciliation(
  reconciliationId: string,
  token?: string | null,
) {
  return apiRequest<BankReconciliation>(
    `/bank-reconciliations/${reconciliationId}/complete`,
    {
      method: "POST",
      token,
    },
  );
}

export async function getInventoryItems(
  params: InventoryItemsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.type) searchParams.set("type", params.type);
  if (params.itemGroupId) searchParams.set("itemGroupId", params.itemGroupId);
  if (params.itemCategoryId) searchParams.set("itemCategoryId", params.itemCategoryId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryItemsResponse>(`/inventory/items${suffix}`, {
    token,
  });
}

export async function getInventoryItemGroups(
  params: InventoryMasterDataQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryItemGroup[]>(`/inventory/item-groups${suffix}`, {
    token,
  });
}

export async function getInventoryItemCategories(
  params: InventoryItemCategoriesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.itemGroupId) searchParams.set("itemGroupId", params.itemGroupId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryItemCategory[]>(
    `/inventory/item-categories${suffix}`,
    { token },
  );
}

export async function getInventoryUnitsOfMeasure(
  params: InventoryMasterDataQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryUnitOfMeasure[]>(
    `/inventory/units-of-measure${suffix}`,
    { token },
  );
}

export async function getInventoryWarehouses(
  params: InventoryWarehousesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.isTransit) searchParams.set("isTransit", params.isTransit);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryWarehouse[]>(`/inventory/warehouses${suffix}`, {
    token,
  });
}

export async function getInventoryGoodsReceipts(
  params: InventoryGoodsReceiptsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryGoodsReceiptsResponse>(
    `/inventory/goods-receipts${suffix}`,
    { token },
  );
}

export async function getInventoryGoodsIssues(
  params: InventoryGoodsIssuesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryGoodsIssuesResponse>(
    `/inventory/goods-issues${suffix}`,
    { token },
  );
}

export async function getInventoryTransfers(
  params: InventoryTransfersQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.sourceWarehouseId)
    searchParams.set("sourceWarehouseId", params.sourceWarehouseId);
  if (params.destinationWarehouseId)
    searchParams.set("destinationWarehouseId", params.destinationWarehouseId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryTransfersResponse>(
    `/inventory/transfers${suffix}`,
    { token },
  );
}

export async function getInventoryAdjustments(
  params: InventoryAdjustmentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.reason?.trim()) searchParams.set("reason", params.reason.trim());
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryAdjustmentsResponse>(
    `/inventory/adjustments${suffix}`,
    { token },
  );
}

export async function getInventoryStockLedger(
  params: InventoryStockLedgerQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.itemId) searchParams.set("itemId", params.itemId);
  if (params.warehouseId) searchParams.set("warehouseId", params.warehouseId);
  if (params.movementType)
    searchParams.set("movementType", params.movementType);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.page && params.page > 0)
    searchParams.set("page", String(params.page));
  if (params.limit && params.limit > 0)
    searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<InventoryStockLedgerResponse>(
    `/inventory/stock-ledger${suffix}`,
    { token },
  );
}

export async function getInventoryPolicy(token?: string | null) {
  return apiRequest<InventoryPolicy>("/inventory/policy", { token });
}

export async function updateInventoryPolicy(
  payload: UpdateInventoryPolicyPayload,
  token?: string | null,
) {
  return apiRequest<InventoryPolicy>("/inventory/policy", {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getInventoryItemById(id: string, token?: string | null) {
  return apiRequest<InventoryItem>(`/inventory/items/${id}`, { token });
}

export async function getInventoryWarehouseById(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryWarehouse>(`/inventory/warehouses/${id}`, {
    token,
  });
}

export async function getInventoryGoodsReceiptById(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>(`/inventory/goods-receipts/${id}`, {
    token,
  });
}

export async function getInventoryGoodsIssueById(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>(`/inventory/goods-issues/${id}`, {
    token,
  });
}

export async function getInventoryTransferById(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryTransfer>(`/inventory/transfers/${id}`, { token });
}

export async function getInventoryAdjustmentById(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>(`/inventory/adjustments/${id}`, {
    token,
  });
}

export async function createInventoryItem(
  payload: CreateInventoryItemPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItem>("/inventory/items", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryItemGroup(
  payload: CreateInventoryItemGroupPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItemGroup>("/inventory/item-groups", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryItemCategory(
  payload: CreateInventoryItemCategoryPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItemCategory>("/inventory/item-categories", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryUnitOfMeasure(
  payload: CreateInventoryUnitOfMeasurePayload,
  token?: string | null,
) {
  return apiRequest<InventoryUnitOfMeasure>("/inventory/units-of-measure", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function generateInventoryBarcode(token?: string | null) {
  return apiRequest<GenerateInventoryBarcodeResponse>(
    "/inventory/items/generate-barcode",
    {
      method: "POST",
      token,
    },
  );
}

export async function createInventoryWarehouse(
  payload: CreateInventoryWarehousePayload,
  token?: string | null,
) {
  return apiRequest<InventoryWarehouse>("/inventory/warehouses", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryGoodsReceipt(
  payload: CreateInventoryGoodsReceiptPayload,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>("/inventory/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryGoodsIssue(
  payload: CreateInventoryGoodsIssuePayload,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>("/inventory/goods-issues", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryTransfer(
  payload: CreateInventoryTransferPayload,
  token?: string | null,
) {
  return apiRequest<InventoryTransfer>("/inventory/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentPayload,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>("/inventory/adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryItemPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItem>(`/inventory/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryItemGroup(
  id: string,
  payload: UpdateInventoryItemGroupPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItemGroup>(`/inventory/item-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryItemCategory(
  id: string,
  payload: UpdateInventoryItemCategoryPayload,
  token?: string | null,
) {
  return apiRequest<InventoryItemCategory>(
    `/inventory/item-categories/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function updateInventoryUnitOfMeasure(
  id: string,
  payload: UpdateInventoryUnitOfMeasurePayload,
  token?: string | null,
) {
  return apiRequest<InventoryUnitOfMeasure>(
    `/inventory/units-of-measure/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function updateInventoryWarehouse(
  id: string,
  payload: UpdateInventoryWarehousePayload,
  token?: string | null,
) {
  return apiRequest<InventoryWarehouse>(`/inventory/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryGoodsReceipt(
  id: string,
  payload: UpdateInventoryGoodsReceiptPayload,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>(`/inventory/goods-receipts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryGoodsIssue(
  id: string,
  payload: UpdateInventoryGoodsIssuePayload,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>(`/inventory/goods-issues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryTransfer(
  id: string,
  payload: UpdateInventoryTransferPayload,
  token?: string | null,
) {
  return apiRequest<InventoryTransfer>(`/inventory/transfers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateInventoryAdjustment(
  id: string,
  payload: UpdateInventoryAdjustmentPayload,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>(`/inventory/adjustments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateInventoryItem(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryItem>(`/inventory/items/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function deactivateInventoryItemGroup(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryItemGroup>(
    `/inventory/item-groups/${id}/deactivate`,
    {
      method: "POST",
      token,
    },
  );
}

export async function deactivateInventoryItemCategory(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryItemCategory>(
    `/inventory/item-categories/${id}/deactivate`,
    {
      method: "POST",
      token,
    },
  );
}

export async function deactivateInventoryUnitOfMeasure(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryUnitOfMeasure>(
    `/inventory/units-of-measure/${id}/deactivate`,
    {
      method: "POST",
      token,
    },
  );
}

export async function deactivateInventoryWarehouse(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryWarehouse>(
    `/inventory/warehouses/${id}/deactivate`,
    {
      method: "POST",
      token,
    },
  );
}

export async function postInventoryGoodsReceipt(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>(
    `/inventory/goods-receipts/${id}/post`,
    {
      method: "POST",
      token,
    },
  );
}

export async function postInventoryGoodsIssue(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>(`/inventory/goods-issues/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function postInventoryTransfer(id: string, token?: string | null) {
  return apiRequest<InventoryTransfer>(`/inventory/transfers/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function postInventoryAdjustment(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>(`/inventory/adjustments/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function cancelInventoryGoodsReceipt(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>(
    `/inventory/goods-receipts/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelInventoryGoodsIssue(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>(
    `/inventory/goods-issues/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelInventoryTransfer(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryTransfer>(`/inventory/transfers/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export async function cancelInventoryAdjustment(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>(
    `/inventory/adjustments/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reverseInventoryGoodsReceipt(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsReceipt>(
    `/inventory/goods-receipts/${id}/reverse`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reverseInventoryGoodsIssue(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryGoodsIssue>(
    `/inventory/goods-issues/${id}/reverse`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reverseInventoryTransfer(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryTransfer>(`/inventory/transfers/${id}/reverse`, {
    method: "POST",
    token,
  });
}

export async function reverseInventoryAdjustment(
  id: string,
  token?: string | null,
) {
  return apiRequest<InventoryAdjustment>(
    `/inventory/adjustments/${id}/reverse`,
    {
      method: "POST",
      token,
    },
  );
}

// ─── Sales & Receivables ──────────────────────────────────────────────────────

export async function getSuppliers(
  params: SuppliersQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<Supplier[]>(`/purchases/suppliers${suffix}`, { token });
}

export async function getSupplierById(
  id: string,
  token?: string | null,
) {
  return apiRequest<Supplier>(`/purchases/suppliers/${id}`, { token });
}

export async function createSupplier(
  payload: CreateSupplierPayload,
  token?: string | null,
) {
  return apiRequest<Supplier>("/purchases/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSupplier(
  id: string,
  payload: UpdateSupplierPayload,
  token?: string | null,
) {
  return apiRequest<Supplier>(`/purchases/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateSupplier(id: string, token?: string | null) {
  return apiRequest<Supplier>(`/purchases/suppliers/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function getSupplierBalance(
  supplierId: string,
  token?: string | null,
) {
  return apiRequest<SupplierBalance>(
    `/purchases/suppliers/${supplierId}/balance`,
    { token },
  );
}

export async function getSupplierTransactions(
  supplierId: string,
  token?: string | null,
) {
  return apiRequest<SupplierTransactionsResponse>(
    `/purchases/suppliers/${supplierId}/transactions`,
    { token },
  );
}

export async function getPurchaseRequests(
  params: PurchaseRequestsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PurchaseRequest[]>(
    `/purchases/purchase-requests${suffix}`,
    { token },
  );
}

export async function getPurchaseRequestById(
  id: string,
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(`/purchases/purchase-requests/${id}`, {
    token,
  });
}

export async function createPurchaseRequest(
  payload: CreatePurchaseRequestPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>("/purchases/purchase-requests", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePurchaseRequest(
  id: string,
  payload: UpdatePurchaseRequestPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(`/purchases/purchase-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function submitPurchaseRequest(
  id: string,
  payload: PurchaseRequestStatusNotePayload = {},
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(
    `/purchases/purchase-requests/${id}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function approvePurchaseRequest(
  id: string,
  payload: PurchaseRequestStatusNotePayload = {},
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(
    `/purchases/purchase-requests/${id}/approve`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function rejectPurchaseRequest(
  id: string,
  payload: PurchaseRequestStatusNotePayload = {},
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(
    `/purchases/purchase-requests/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function closePurchaseRequest(
  id: string,
  payload: PurchaseRequestStatusNotePayload = {},
  token?: string | null,
) {
  return apiRequest<PurchaseRequest>(
    `/purchases/purchase-requests/${id}/close`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function convertPurchaseRequestToOrder(
  id: string,
  payload: ConvertPurchaseRequestToOrderPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseRequestConversionResult>(
    `/purchases/purchase-requests/${id}/convert-to-order`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function getPurchaseOrders(
  params: PurchaseOrdersQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PurchaseOrder[]>(`/purchases/purchase-orders${suffix}`, {
    token,
  });
}

export async function getPurchaseOrderById(id: string, token?: string | null) {
  return apiRequest<PurchaseOrder>(`/purchases/purchase-orders/${id}`, {
    token,
  });
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseOrder>("/purchases/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePurchaseOrderPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseOrder>(`/purchases/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function issuePurchaseOrder(id: string, token?: string | null) {
  return apiRequest<PurchaseOrder>(`/purchases/purchase-orders/${id}/issue`, {
    method: "POST",
    token,
  });
}

export async function markPurchaseOrderPartiallyReceived(
  id: string,
  token?: string | null,
) {
  return apiRequest<PurchaseOrder>(
    `/purchases/purchase-orders/${id}/mark-partially-received`,
    {
      method: "POST",
      token,
    },
  );
}

export async function markPurchaseOrderFullyReceived(
  id: string,
  token?: string | null,
) {
  return apiRequest<PurchaseOrder>(
    `/purchases/purchase-orders/${id}/mark-fully-received`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelPurchaseOrder(id: string, token?: string | null) {
  return apiRequest<PurchaseOrder>(`/purchases/purchase-orders/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export async function closePurchaseOrder(id: string, token?: string | null) {
  return apiRequest<PurchaseOrder>(`/purchases/purchase-orders/${id}/close`, {
    method: "POST",
    token,
  });
}

export async function createPurchaseReceipt(
  payload: CreatePurchaseReceiptPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseReceipt>("/purchases/purchase-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePurchaseReceipt(
  id: string,
  payload: UpdatePurchaseReceiptPayload,
  token?: string | null,
) {
  return apiRequest<PurchaseReceipt>(`/purchases/purchase-receipts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postPurchaseReceipt(id: string, token?: string | null) {
  return apiRequest<PurchaseReceipt>(
    `/purchases/purchase-receipts/${id}/post`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelPurchaseReceipt(id: string, token?: string | null) {
  return apiRequest<PurchaseReceipt>(
    `/purchases/purchase-receipts/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function getPurchaseInvoices(
  params: PurchaseInvoicesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PurchaseInvoice[]>(
    `/purchases/purchase-invoices${suffix}`,
    { token },
  );
}

export async function getPurchaseInvoiceById(
  id: string,
  token?: string | null,
) {
  return apiRequest<PurchaseInvoice>(`/purchases/purchase-invoices/${id}`, {
    token,
  });
}

export async function createPurchaseInvoice(
  payload: CreatePurchaseInvoicePayload,
  token?: string | null,
) {
  return apiRequest<PurchaseInvoice>("/purchases/purchase-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePurchaseInvoice(
  id: string,
  payload: UpdatePurchaseInvoicePayload,
  token?: string | null,
) {
  return apiRequest<PurchaseInvoice>(`/purchases/purchase-invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postPurchaseInvoice(id: string, token?: string | null) {
  return apiRequest<PurchaseInvoice>(
    `/purchases/purchase-invoices/${id}/post`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reversePurchaseInvoice(
  id: string,
  token?: string | null,
) {
  return apiRequest<PurchaseInvoice>(
    `/purchases/purchase-invoices/${id}/reverse`,
    {
      method: "POST",
      body: JSON.stringify({}),
      token,
    },
  );
}

export async function getSupplierPayments(
  params: SupplierPaymentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<SupplierPayment[]>(
    `/purchases/supplier-payments${suffix}`,
    { token },
  );
}

export async function getSupplierPaymentById(
  id: string,
  token?: string | null,
) {
  return apiRequest<SupplierPayment>(`/purchases/supplier-payments/${id}`, {
    token,
  });
}

export async function createSupplierPayment(
  payload: CreateSupplierPaymentPayload,
  token?: string | null,
) {
  return apiRequest<SupplierPayment>("/purchases/supplier-payments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSupplierPayment(
  id: string,
  payload: UpdateSupplierPaymentPayload,
  token?: string | null,
) {
  return apiRequest<SupplierPayment>(`/purchases/supplier-payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postSupplierPayment(id: string, token?: string | null) {
  return apiRequest<SupplierPayment>(
    `/purchases/supplier-payments/${id}/post`,
    {
      method: "POST",
      token,
    },
  );
}

export async function reverseSupplierPayment(
  id: string,
  token?: string | null,
) {
  return apiRequest<SupplierPayment>(
    `/purchases/supplier-payments/${id}/reverse`,
    {
      method: "POST",
      body: JSON.stringify({}),
      token,
    },
  );
}

export async function cancelSupplierPayment(id: string, token?: string | null) {
  return apiRequest<SupplierPayment>(
    `/purchases/supplier-payments/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function getDebitNotes(
  params: DebitNotesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<DebitNote[]>(`/purchases/debit-notes${suffix}`, { token });
}

export async function getDebitNoteById(id: string, token?: string | null) {
  return apiRequest<DebitNote>(`/purchases/debit-notes/${id}`, { token });
}

export async function createDebitNote(
  payload: CreateDebitNotePayload,
  token?: string | null,
) {
  return apiRequest<DebitNote>("/purchases/debit-notes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateDebitNote(
  id: string,
  payload: UpdateDebitNotePayload,
  token?: string | null,
) {
  return apiRequest<DebitNote>(`/purchases/debit-notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postDebitNote(id: string, token?: string | null) {
  return apiRequest<DebitNote>(`/purchases/debit-notes/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function getPurchasePolicy(token?: string | null) {
  return apiRequest<PurchasePolicy>("/purchases/policy", { token });
}

export async function reverseDebitNote(id: string, token?: string | null) {
  return apiRequest<DebitNote>(`/purchases/debit-notes/${id}/reverse`, {
    method: "POST",
    body: JSON.stringify({}),
    token,
  });
}

export async function cancelDebitNote(id: string, token?: string | null) {
  return apiRequest<DebitNote>(`/purchases/debit-notes/${id}/cancel`, {
    method: "POST",
    token,
  });
}

export async function getCustomers(
  params: CustomersQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.salesRepId) searchParams.set("salesRepId", params.salesRepId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<Customer[]>(`/sales-receivables/customers${suffix}`, {
    token,
  });
}

export async function createCustomer(
  payload: CreateCustomerPayload,
  token?: string | null,
) {
  return apiRequest<Customer>("/sales-receivables/customers", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
  token?: string | null,
) {
  return apiRequest<Customer>(`/sales-receivables/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateCustomer(id: string, token?: string | null) {
  return apiRequest<Customer>(`/sales-receivables/customers/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function getSalesRepresentatives(
  params: SalesRepresentativesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<SalesRepresentative[]>(`/sales-receivables/sales-reps${suffix}`, {
    token,
  });
}

export async function createSalesRepresentative(
  payload: CreateSalesRepresentativePayload,
  token?: string | null,
) {
  return apiRequest<SalesRepresentative>("/sales-receivables/sales-reps", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSalesRepresentative(
  id: string,
  payload: UpdateSalesRepresentativePayload,
  token?: string | null,
) {
  return apiRequest<SalesRepresentative>(`/sales-receivables/sales-reps/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateSalesRepresentative(id: string, token?: string | null) {
  return apiRequest<SalesRepresentative>(`/sales-receivables/sales-reps/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function getCustomerBalance(
  customerId: string,
  token?: string | null,
) {
  return apiRequest<CustomerBalance>(
    `/sales-receivables/customers/${customerId}/balance`,
    { token },
  );
}

export async function getCustomerTransactions(
  customerId: string,
  token?: string | null,
) {
  return apiRequest<CustomerTransaction[]>(
    `/sales-receivables/customers/${customerId}/transactions`,
    { token },
  );
}

export async function getSalesQuotations(
  params: SalesDocumentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<SalesQuotation[]>(
    `/sales-receivables/quotations${suffix}`,
    { token },
  );
}

export async function createSalesQuotation(
  payload: CreateSalesQuotationPayload,
  token?: string | null,
) {
  return apiRequest<SalesQuotation>("/sales-receivables/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSalesQuotation(
  id: string,
  payload: UpdateSalesQuotationPayload,
  token?: string | null,
) {
  return apiRequest<SalesQuotation>(`/sales-receivables/quotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function approveSalesQuotation(id: string, token?: string | null) {
  return apiRequest<SalesQuotation>(
    `/sales-receivables/quotations/${id}/approve`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelSalesQuotation(id: string, token?: string | null) {
  return apiRequest<SalesQuotation>(
    `/sales-receivables/quotations/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function convertQuotationToOrder(
  id: string,
  payload: CreateSalesOrderPayload,
  token?: string | null,
) {
  return apiRequest<SalesOrder>(
    `/sales-receivables/quotations/${id}/convert-to-order`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function convertQuotationToInvoice(
  id: string,
  payload: CreateSalesInvoicePayload,
  token?: string | null,
) {
  return apiRequest<SalesInvoice>(
    `/sales-receivables/quotations/${id}/convert-to-invoice`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function getSalesOrders(
  params: SalesDocumentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<SalesOrder[]>(`/sales-receivables/sales-orders${suffix}`, {
    token,
  });
}

export async function createSalesOrder(
  payload: CreateSalesOrderPayload,
  token?: string | null,
) {
  return apiRequest<SalesOrder>("/sales-receivables/sales-orders", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSalesOrder(
  id: string,
  payload: UpdateSalesOrderPayload,
  token?: string | null,
) {
  return apiRequest<SalesOrder>(`/sales-receivables/sales-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function confirmSalesOrder(id: string, token?: string | null) {
  return apiRequest<SalesOrder>(
    `/sales-receivables/sales-orders/${id}/confirm`,
    {
      method: "POST",
      token,
    },
  );
}

export async function cancelSalesOrder(id: string, token?: string | null) {
  return apiRequest<SalesOrder>(
    `/sales-receivables/sales-orders/${id}/cancel`,
    {
      method: "POST",
      token,
    },
  );
}

export async function convertSalesOrderToInvoice(
  id: string,
  payload: CreateSalesInvoicePayload,
  token?: string | null,
) {
  return apiRequest<SalesInvoice>(
    `/sales-receivables/sales-orders/${id}/convert-to-invoice`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function getSalesInvoices(
  params: SalesDocumentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<SalesInvoice[]>(`/sales-receivables/invoices${suffix}`, {
    token,
  });
}

export async function createSalesInvoice(
  payload: CreateSalesInvoicePayload,
  token?: string | null,
) {
  return apiRequest<SalesInvoice>("/sales-receivables/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateSalesInvoice(
  id: string,
  payload: UpdateSalesInvoicePayload,
  token?: string | null,
) {
  return apiRequest<SalesInvoice>(`/sales-receivables/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postSalesInvoice(
  id: string,
  payload: PostSalesInvoicePayload = {},
  token?: string | null,
) {
  return apiRequest<SalesInvoice>(`/sales-receivables/invoices/${id}/post`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getCreditNotes(
  params: SalesDocumentsQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<CreditNote[]>(`/sales-receivables/credit-notes${suffix}`, {
    token,
  });
}

export async function createCreditNote(
  payload: CreateCreditNotePayload,
  token?: string | null,
) {
  return apiRequest<CreditNote>("/sales-receivables/credit-notes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateCreditNote(
  id: string,
  payload: UpdateCreditNotePayload,
  token?: string | null,
) {
  return apiRequest<CreditNote>(`/sales-receivables/credit-notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postCreditNote(id: string, token?: string | null) {
  return apiRequest<CreditNote>(`/sales-receivables/credit-notes/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function getCustomerReceipts(
  params: { customerId?: string; search?: string } = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<CustomerReceipt[]>(`/sales-receivables/receipts${suffix}`, {
    token,
  });
}

export async function createCustomerReceipt(
  payload: CreateCustomerReceiptPayload,
  token?: string | null,
) {
  return apiRequest<CustomerReceipt>("/sales-receivables/receipts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function allocateReceipt(
  payload: AllocateReceiptPayload,
  token?: string | null,
) {
  return apiRequest<ReceiptAllocationResult>(
    "/sales-receivables/receipt-allocations",
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function getAgingReport(asOfDate?: string, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (asOfDate) searchParams.set("asOfDate", asOfDate);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<AgingReport>(`/sales-receivables/reports/aging${suffix}`, {
    token,
  });
}

// ─── Segments ─────────────────────────────────────────────────────────────────

// Payroll

export async function getPayrollGroups(params: { isActive?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollGroup[]>(`/payroll/groups${suffix}`, { token });
}

export async function createPayrollGroup(payload: CreatePayrollGroupPayload, token?: string | null) {
  return apiRequest<PayrollGroup>("/payroll/groups", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollGroup(id: string, payload: UpdatePayrollGroupPayload, token?: string | null) {
  return apiRequest<PayrollGroup>(`/payroll/groups/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivatePayrollGroup(id: string, token?: string | null) {
  return apiRequest<PayrollGroup>(`/payroll/groups/${id}/deactivate`, { method: "POST", token });
}

export async function assignPayrollGroupComponent(id: string, payload: AssignPayrollGroupComponentPayload, token?: string | null) {
  return apiRequest<EmployeePayrollComponent>(`/payroll/groups/${id}/components`, { method: "POST", body: JSON.stringify(payload), token });
}

export async function getPayrollRules(params: { ruleType?: string; payrollGroupId?: string; isActive?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.ruleType) searchParams.set("ruleType", params.ruleType);
  if (params.payrollGroupId) searchParams.set("payrollGroupId", params.payrollGroupId);
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollRule[]>(`/payroll/rules${suffix}`, { token });
}

export async function createPayrollRule(payload: CreatePayrollRulePayload, token?: string | null) {
  return apiRequest<PayrollRule>("/payroll/rules", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollRule(id: string, payload: UpdatePayrollRulePayload, token?: string | null) {
  return apiRequest<PayrollRule>(`/payroll/rules/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivatePayrollRule(id: string, token?: string | null) {
  return apiRequest<PayrollRule>(`/payroll/rules/${id}/deactivate`, { method: "POST", token });
}

export async function getPayrollEmployees(params: { status?: string; department?: string; payrollGroup?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.department) searchParams.set("department", params.department);
  if (params.payrollGroup) searchParams.set("payrollGroup", params.payrollGroup);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollEmployee[]>(`/payroll/employees${suffix}`, { token });
}

export async function createPayrollEmployee(payload: CreatePayrollEmployeePayload, token?: string | null) {
  return apiRequest<PayrollEmployee>("/payroll/employees", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollEmployee(id: string, payload: UpdatePayrollEmployeePayload, token?: string | null) {
  return apiRequest<PayrollEmployee>(`/payroll/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivatePayrollEmployee(id: string, token?: string | null) {
  return apiRequest<PayrollEmployee>(`/payroll/employees/${id}/deactivate`, { method: "POST", token });
}

export async function assignPayrollEmployeeComponent(id: string, payload: AssignEmployeeComponentPayload, token?: string | null) {
  return apiRequest<EmployeePayrollComponent>(`/payroll/employees/${id}/components`, { method: "POST", body: JSON.stringify(payload), token });
}

export async function getPayrollComponents(params: { type?: string; isActive?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollComponent[]>(`/payroll/components${suffix}`, { token });
}

export async function createPayrollComponent(payload: CreatePayrollComponentPayload, token?: string | null) {
  return apiRequest<PayrollComponent>("/payroll/components", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollComponent(id: string, payload: UpdatePayrollComponentPayload, token?: string | null) {
  return apiRequest<PayrollComponent>(`/payroll/components/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivatePayrollComponent(id: string, token?: string | null) {
  return apiRequest<PayrollComponent>(`/payroll/components/${id}/deactivate`, { method: "POST", token });
}

export async function getPayrollPeriods(params: { status?: string; payrollGroup?: string; dateFrom?: string; dateTo?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.payrollGroup) searchParams.set("payrollGroup", params.payrollGroup);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollPeriod[]>(`/payroll/periods${suffix}`, { token });
}

export async function createPayrollPeriod(payload: CreatePayrollPeriodPayload, token?: string | null) {
  return apiRequest<PayrollPeriod>("/payroll/periods", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollPeriod(id: string, payload: UpdatePayrollPeriodPayload, token?: string | null) {
  return apiRequest<PayrollPeriod>(`/payroll/periods/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function generatePayrollPayslips(id: string, employeeIds?: string[], token?: string | null) {
  return apiRequest<Payslip[]>(`/payroll/periods/${id}/generate-payslips`, { method: "POST", body: JSON.stringify({ employeeIds }), token });
}

export async function postPayrollPeriod(id: string, token?: string | null) {
  return apiRequest<PayrollPeriod>(`/payroll/periods/${id}/post`, { method: "POST", token });
}

export async function closePayrollPeriod(id: string, token?: string | null) {
  return apiRequest<PayrollPeriod>(`/payroll/periods/${id}/close`, { method: "POST", token });
}

export async function reversePayrollPeriod(id: string, token?: string | null) {
  return apiRequest<PayrollPeriod>(`/payroll/periods/${id}/reverse`, { method: "POST", token });
}

export async function getPayslips(params: { status?: string; employeeId?: string; payrollPeriodId?: string; department?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.payrollPeriodId) searchParams.set("payrollPeriodId", params.payrollPeriodId);
  if (params.department) searchParams.set("department", params.department);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<Payslip[]>(`/payroll/payslips${suffix}`, { token });
}

export async function adjustPayslip(id: string, payload: AdjustPayslipPayload, token?: string | null) {
  return apiRequest<Payslip>(`/payroll/payslips/${id}/adjust`, { method: "POST", body: JSON.stringify(payload), token });
}

export async function getPayrollPayments(params: { status?: string; employeeId?: string; payrollPeriodId?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.payrollPeriodId) searchParams.set("payrollPeriodId", params.payrollPeriodId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollPayment[]>(`/payroll/payments${suffix}`, { token });
}

export async function createPayrollPayment(payload: CreatePayrollPaymentPayload, token?: string | null) {
  return apiRequest<PayrollPayment>("/payroll/payments", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updatePayrollPayment(id: string, payload: UpdatePayrollPaymentPayload, token?: string | null) {
  return apiRequest<PayrollPayment>(`/payroll/payments/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function postPayrollPayment(id: string, token?: string | null) {
  return apiRequest<PayrollPayment>(`/payroll/payments/${id}/post`, { method: "POST", token });
}

export async function cancelPayrollPayment(id: string, token?: string | null) {
  return apiRequest<PayrollPayment>(`/payroll/payments/${id}/cancel`, { method: "POST", token });
}

export async function reversePayrollPayment(id: string, token?: string | null) {
  return apiRequest<PayrollPayment>(`/payroll/payments/${id}/reverse`, { method: "POST", token });
}

export async function getPayrollSummary(params: { payrollPeriodId?: string; employeeId?: string; department?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.payrollPeriodId) searchParams.set("payrollPeriodId", params.payrollPeriodId);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.department) searchParams.set("department", params.department);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<PayrollSummary>(`/payroll/reports/summary${suffix}`, { token });
}

export async function getFixedAssetCategories(params: { isActive?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.isActive) searchParams.set("isActive", params.isActive);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAssetCategory[]>(`/fixed-assets/categories${suffix}`, { token });
}

export async function createFixedAssetCategory(payload: CreateFixedAssetCategoryPayload, token?: string | null) {
  return apiRequest<FixedAssetCategory>("/fixed-assets/categories", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updateFixedAssetCategory(id: string, payload: UpdateFixedAssetCategoryPayload, token?: string | null) {
  return apiRequest<FixedAssetCategory>(`/fixed-assets/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivateFixedAssetCategory(id: string, token?: string | null) {
  return apiRequest<FixedAssetCategory>(`/fixed-assets/categories/${id}/deactivate`, { method: "POST", token });
}

export async function getFixedAssets(params: { status?: string; categoryId?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAsset[]>(`/fixed-assets/assets${suffix}`, { token });
}

export async function getFixedAsset(id: string, token?: string | null) {
  return apiRequest<FixedAsset>(`/fixed-assets/assets/${id}`, { token });
}

export async function createFixedAsset(payload: CreateFixedAssetPayload, token?: string | null) {
  return apiRequest<FixedAsset>("/fixed-assets/assets", { method: "POST", body: JSON.stringify(payload), token });
}

export async function updateFixedAsset(id: string, payload: UpdateFixedAssetPayload, token?: string | null) {
  return apiRequest<FixedAsset>(`/fixed-assets/assets/${id}`, { method: "PATCH", body: JSON.stringify(payload), token });
}

export async function deactivateFixedAsset(id: string, token?: string | null) {
  return apiRequest<FixedAsset>(`/fixed-assets/assets/${id}/deactivate`, { method: "POST", token });
}

export async function getFixedAssetAcquisitions(params: { status?: string; assetId?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.assetId) searchParams.set("assetId", params.assetId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAssetAcquisition[]>(`/fixed-assets/acquisitions${suffix}`, { token });
}

export async function createFixedAssetAcquisition(payload: CreateFixedAssetAcquisitionPayload, token?: string | null) {
  return apiRequest<FixedAssetAcquisition>("/fixed-assets/acquisitions", { method: "POST", body: JSON.stringify(payload), token });
}

export async function postFixedAssetAcquisition(id: string, token?: string | null) {
  return apiRequest<FixedAssetAcquisition>(`/fixed-assets/acquisitions/${id}/post`, { method: "POST", token });
}

export async function reverseFixedAssetAcquisition(id: string, token?: string | null) {
  return apiRequest<FixedAssetAcquisition>(`/fixed-assets/acquisitions/${id}/reverse`, { method: "POST", token });
}

export async function getFixedAssetDepreciationRuns(params: { status?: string; assetId?: string; categoryId?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.assetId) searchParams.set("assetId", params.assetId);
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAssetDepreciationRun[]>(`/fixed-assets/depreciation-runs${suffix}`, { token });
}

export async function createFixedAssetDepreciationRun(payload: CreateFixedAssetDepreciationRunPayload, token?: string | null) {
  return apiRequest<FixedAssetDepreciationRun>("/fixed-assets/depreciation-runs", { method: "POST", body: JSON.stringify(payload), token });
}

export async function postFixedAssetDepreciationRun(id: string, token?: string | null) {
  return apiRequest<FixedAssetDepreciationRun>(`/fixed-assets/depreciation-runs/${id}/post`, { method: "POST", token });
}

export async function reverseFixedAssetDepreciationRun(id: string, token?: string | null) {
  return apiRequest<FixedAssetDepreciationRun>(`/fixed-assets/depreciation-runs/${id}/reverse`, { method: "POST", token });
}

export async function getFixedAssetDisposals(params: { status?: string; assetId?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.assetId) searchParams.set("assetId", params.assetId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAssetDisposal[]>(`/fixed-assets/disposals${suffix}`, { token });
}

export async function createFixedAssetDisposal(payload: CreateFixedAssetDisposalPayload, token?: string | null) {
  return apiRequest<FixedAssetDisposal>("/fixed-assets/disposals", { method: "POST", body: JSON.stringify(payload), token });
}

export async function postFixedAssetDisposal(id: string, token?: string | null) {
  return apiRequest<FixedAssetDisposal>(`/fixed-assets/disposals/${id}/post`, { method: "POST", token });
}

export async function reverseFixedAssetDisposal(id: string, token?: string | null) {
  return apiRequest<FixedAssetDisposal>(`/fixed-assets/disposals/${id}/reverse`, { method: "POST", token });
}

export async function getFixedAssetTransfers(params: { status?: string; assetId?: string; search?: string } = {}, token?: string | null) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.assetId) searchParams.set("assetId", params.assetId);
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<FixedAssetTransfer[]>(`/fixed-assets/transfers${suffix}`, { token });
}

export async function createFixedAssetTransfer(payload: CreateFixedAssetTransferPayload, token?: string | null) {
  return apiRequest<FixedAssetTransfer>("/fixed-assets/transfers", { method: "POST", body: JSON.stringify(payload), token });
}

export async function postFixedAssetTransfer(id: string, token?: string | null) {
  return apiRequest<FixedAssetTransfer>(`/fixed-assets/transfers/${id}/post`, { method: "POST", token });
}

export async function reverseFixedAssetTransfer(id: string, token?: string | null) {
  return apiRequest<FixedAssetTransfer>(`/fixed-assets/transfers/${id}/reverse`, { method: "POST", token });
}

export async function getFixedAssetSummary(token?: string | null) {
  return apiRequest<FixedAssetSummary>("/fixed-assets/reports/summary", { token });
}

function buildReportingSearchParams(params: ReportingQuery = {}) {
  const searchParams = new URLSearchParams();
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.comparisonFrom) searchParams.set("comparisonFrom", params.comparisonFrom);
  if (params.comparisonTo) searchParams.set("comparisonTo", params.comparisonTo);
  if (params.basis) searchParams.set("basis", params.basis);
  if (params.includeZeroBalance !== undefined) searchParams.set("includeZeroBalance", String(params.includeZeroBalance));
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.accountType) searchParams.set("accountType", params.accountType);
  if (params.currencyCode) searchParams.set("currencyCode", params.currencyCode);
  if (params.segment3) searchParams.set("segment3", params.segment3);
  if (params.segment4) searchParams.set("segment4", params.segment4);
  if (params.segment5) searchParams.set("segment5", params.segment5);
  if (params.journalEntryTypeId) searchParams.set("journalEntryTypeId", params.journalEntryTypeId);
  if (params.entity) searchParams.set("entity", params.entity);
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString() ? `?${searchParams}` : "";
}

export async function getReportingSummary(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingSummary>(`/reporting/summary${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingTrialBalance(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingTrialBalanceReport>(`/reporting/trial-balance${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingBalanceSheet(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingBalanceSheetReport>(`/reporting/balance-sheet${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingProfitLoss(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingProfitLossReport>(`/reporting/profit-loss${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingCashMovement(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingCashMovementReport>(`/reporting/cash-movement${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingGeneralLedger(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingGeneralLedgerReport>(`/reporting/general-ledger${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingAudit(params: ReportingQuery = {}, token?: string | null) {
  return apiRequest<ReportingAuditReport>(`/reporting/audit${buildReportingSearchParams(params)}`, { token });
}

export async function getReportingCatalog(token?: string | null) {
  return apiRequest<ReportingCatalogItem[]>("/reporting/catalog", { token });
}

export async function getReportingWarnings(token?: string | null) {
  return apiRequest<ReportingWarning[]>("/reporting/warnings", { token });
}

export async function getReportingDefinitions(token?: string | null) {
  return apiRequest<ReportingDefinition[]>("/reporting/definitions", { token });
}

export async function createReportingDefinition(payload: ReportingDefinitionPayload, token?: string | null) {
  return apiRequest<ReportingDefinition>("/reporting/definitions", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateReportingDefinition(id: string, payload: Partial<ReportingDefinitionPayload>, token?: string | null) {
  return apiRequest<ReportingDefinition>(`/reporting/definitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateReportingDefinition(id: string, token?: string | null) {
  return apiRequest<{ id: string; deactivated: boolean }>(`/reporting/definitions/${id}/deactivate`, {
    method: "POST",
    token,
  });
}

export async function getReportingSnapshots(token?: string | null) {
  return apiRequest<ReportingSnapshot[]>("/reporting/snapshots", { token });
}

export async function createReportingSnapshot(payload: ReportingSnapshotPayload, token?: string | null) {
  return apiRequest<ReportingSnapshot>("/reporting/snapshots", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function lockReportingSnapshot(id: string, token?: string | null) {
  return apiRequest<ReportingSnapshot>(`/reporting/snapshots/${id}/lock`, {
    method: "POST",
    token,
  });
}

export async function unlockReportingSnapshot(id: string, token?: string | null) {
  return apiRequest<ReportingSnapshot>(`/reporting/snapshots/${id}/unlock`, {
    method: "POST",
    token,
  });
}

export async function createReportingSnapshotVersion(id: string, payload: { name?: string }, token?: string | null) {
  return apiRequest<ReportingSnapshot>(`/reporting/snapshots/${id}/version`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getReportingActivity(limit = 100, token?: string | null) {
  return apiRequest<ReportingActivityEntry[]>(`/reporting/activity?limit=${limit}`, { token });
}

export async function exportReporting(payload: ReportingExportPayload, token?: string | null) {
  return apiRequest<ReportingExportResult>("/reporting/export", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

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

export async function createAccountSubtype(
  payload: CreateAccountSubtypePayload,
  token?: string | null,
) {
  return apiRequest<AccountSubtype>("/account-subtypes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAccountSubtype(
  id: string,
  payload: UpdateAccountSubtypePayload,
  token?: string | null,
) {
  return apiRequest<AccountSubtype>(`/account-subtypes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateAccountSubtype(
  id: string,
  token?: string | null,
) {
  return apiRequest<AccountSubtype>(`/account-subtypes/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Payment Method Types ─────────────────────────────────────────────────────

export async function getPaymentMethodTypes(token?: string | null) {
  return apiRequest<PaymentMethodType[]>("/payment-method-types", { token });
}

export async function createPaymentMethodType(
  payload: CreatePaymentMethodTypePayload,
  token?: string | null,
) {
  return apiRequest<PaymentMethodType>("/payment-method-types", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePaymentMethodType(
  id: string,
  payload: UpdatePaymentMethodTypePayload,
  token?: string | null,
) {
  return apiRequest<PaymentMethodType>(`/payment-method-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivatePaymentMethodType(
  id: string,
  token?: string | null,
) {
  return apiRequest<PaymentMethodType>(`/payment-method-types/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Taxes ───────────────────────────────────────────────────────────────────

export async function getTaxes(token?: string | null) {
  return apiRequest<Tax[]>("/taxes", { token });
}

export async function getActiveTaxes(token?: string | null) {
  return apiRequest<Tax[]>("/taxes/active", { token });
}

export async function createTax(payload: CreateTaxPayload, token?: string | null) {
  return apiRequest<Tax>("/taxes", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateTax(id: string, payload: UpdateTaxPayload, token?: string | null) {
  return apiRequest<Tax>(`/taxes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deleteTax(id: string, token?: string | null) {
  return apiRequest<Tax>(`/taxes/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function getTaxTreatments(token?: string | null) {
  return apiRequest<TaxTreatment[]>("/taxes/treatments", { token });
}

export async function getActiveTaxTreatments(token?: string | null) {
  return apiRequest<TaxTreatment[]>("/taxes/treatments/active", { token });
}

export async function createTaxTreatment(
  payload: CreateTaxTreatmentPayload,
  token?: string | null,
) {
  return apiRequest<TaxTreatment>("/taxes/treatments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateTaxTreatment(
  id: string,
  payload: UpdateTaxTreatmentPayload,
  token?: string | null,
) {
  return apiRequest<TaxTreatment>(`/taxes/treatments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

// ─── Payment Terms ───────────────────────────────────────────────────────────

export async function getPaymentTerms(token?: string | null) {
  return apiRequest<PaymentTerm[]>("/payment-terms", { token });
}

export async function getActivePaymentTerms(token?: string | null) {
  return apiRequest<PaymentTerm[]>("/payment-terms/active", { token });
}

export async function createPaymentTerm(payload: CreatePaymentTermPayload, token?: string | null) {
  return apiRequest<PaymentTerm>("/payment-terms", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updatePaymentTerm(id: string, payload: UpdatePaymentTermPayload, token?: string | null) {
  return apiRequest<PaymentTerm>(`/payment-terms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deletePaymentTerm(id: string, token?: string | null) {
  return apiRequest<PaymentTerm>(`/payment-terms/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Journal Entry Types ───────────────────────────────────────────────────────

export async function getJournalEntryTypes(token?: string | null) {
  return apiRequest<JournalEntryType[]>("/journal-entry-types", { token });
}

export async function createJournalEntryType(
  payload: CreateJournalEntryTypePayload,
  token?: string | null,
) {
  return apiRequest<JournalEntryType>("/journal-entry-types", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateJournalEntryType(
  id: string,
  payload: UpdateJournalEntryTypePayload,
  token?: string | null,
) {
  return apiRequest<JournalEntryType>(`/journal-entry-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateJournalEntryType(
  id: string,
  token?: string | null,
) {
  return apiRequest<JournalEntryType>(`/journal-entry-types/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function getSegmentValues(
  definitionId: string,
  token?: string | null,
) {
  return apiRequest<SegmentValue[]>(
    `/segments/definitions/${definitionId}/values`,
    { token },
  );
}

export async function createSegmentValue(
  definitionId: string,
  payload: CreateSegmentValuePayload,
  token?: string | null,
) {
  return apiRequest<SegmentValue>(
    `/segments/definitions/${definitionId}/values`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    },
  );
}

export async function updateSegmentValue(
  id: string,
  payload: UpdateSegmentValuePayload,
  token?: string | null,
) {
  return apiRequest<SegmentValue>(`/segments/values/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function deactivateSegmentValue(
  id: string,
  token?: string | null,
) {
  return apiRequest<SegmentValue>(`/segments/values/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Fiscal ───────────────────────────────────────────────────────────────────

export async function getFiscalStatus(token?: string | null) {
  return apiRequest<{ currentPeriod: FiscalPeriod; openYears: number[] }>(
    "/fiscal/status",
    { token },
  );
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
  return apiRequest<FiscalPeriod>(`/fiscal/periods/${id}/close`, {
    method: "POST",
    token,
  });
}

export async function openFiscalPeriod(id: string, token?: string | null) {
  return apiRequest<FiscalPeriod>(`/fiscal/periods/${id}/open`, {
    method: "POST",
    token,
  });
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(
  params: JournalEntriesQuery = {},
  token?: string | null,
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.reference) searchParams.set("reference", params.reference);
  if (params.search) searchParams.set("search", params.search);
  if (params.journalEntryTypeId)
    searchParams.set("journalEntryTypeId", params.journalEntryTypeId);
  if (typeof params.includeLines === "boolean")
    searchParams.set("includeLines", String(params.includeLines));
  const suffix = searchParams.toString() ? `?${searchParams}` : "";
  return apiRequest<JournalEntry[]>(`/journal-entries${suffix}`, { token });
}

export async function getJournalEntryById(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}`, { token });
}

export async function createJournalEntry(
  payload: CreateJournalEntryPayload,
  token?: string | null,
) {
  return apiRequest<JournalEntry>("/journal-entries", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function postJournalEntry(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}/post`, {
    method: "POST",
    token,
  });
}

export async function reverseJournalEntry(id: string, token?: string | null) {
  return apiRequest<JournalEntry>(`/journal-entries/${id}/reverse`, {
    method: "POST",
    token,
  });
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function getAuditLog(
  params: { entity?: string; entityId?: string; limit?: number } = {},
  token?: string | null,
) {
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
