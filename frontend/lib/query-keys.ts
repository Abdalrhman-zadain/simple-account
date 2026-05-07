import type {
  AccountsQuery,
  InventoryGoodsIssuesQuery,
  InventoryItemsQuery,
  InventoryItemCategoriesQuery,
  InventoryMasterDataQuery,
  InventoryGoodsReceiptsQuery,
  InventoryStockLedgerQuery,
  InventoryTransfersQuery,
  InventoryAdjustmentsQuery,
  InventoryWarehousesQuery,
  BankCashAccountsQuery,
  BankCashTransactionsQuery,
  BankReconciliationsQuery,
  CustomersQuery,
  DebitNotesQuery,
  PurchaseOrdersQuery,
  PurchaseInvoicesQuery,
  SupplierPaymentsQuery,
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
  inventoryItems(token: string | null, params: InventoryItemsQuery = {}) {
    return ["inventory-items", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryItemGroups(token: string | null, params: InventoryMasterDataQuery = {}) {
    return ["inventory-item-groups", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryItemCategories(token: string | null, params: InventoryItemCategoriesQuery = {}) {
    return ["inventory-item-categories", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryUnitsOfMeasure(token: string | null, params: InventoryMasterDataQuery = {}) {
    return ["inventory-units-of-measure", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryWarehouses(token: string | null, params: InventoryWarehousesQuery = {}) {
    return ["inventory-warehouses", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryWarehouseById(token: string | null, id: string | null) {
    return ["inventory-warehouse", token, id] as const;
  },
  inventoryGoodsReceipts(token: string | null, params: InventoryGoodsReceiptsQuery = {}) {
    return ["inventory-goods-receipts", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryGoodsReceiptById(token: string | null, id: string | null) {
    return ["inventory-goods-receipt", token, id] as const;
  },
  inventoryGoodsIssues(token: string | null, params: InventoryGoodsIssuesQuery = {}) {
    return ["inventory-goods-issues", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryGoodsIssueById(token: string | null, id: string | null) {
    return ["inventory-goods-issue", token, id] as const;
  },
  inventoryTransfers(token: string | null, params: InventoryTransfersQuery = {}) {
    return ["inventory-transfers", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryTransferById(token: string | null, id: string | null) {
    return ["inventory-transfer", token, id] as const;
  },
  inventoryAdjustments(token: string | null, params: InventoryAdjustmentsQuery = {}) {
    return ["inventory-adjustments", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryAdjustmentById(token: string | null, id: string | null) {
    return ["inventory-adjustment", token, id] as const;
  },
  inventoryStockLedger(token: string | null, params: InventoryStockLedgerQuery = {}) {
    return ["inventory-stock-ledger", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  inventoryPolicy(token: string | null) {
    return ["inventory-policy", token] as const;
  },
  inventoryItemById(token: string | null, id: string | null) {
    return ["inventory-item", token, id] as const;
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
  salesRepresentatives(token: string | null, params: { status?: string; search?: string } = {}) {
    return ["sales-representatives", token, normalizeObject(params as Record<string, unknown>)] as const;
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
  purchaseOrders(token: string | null, params: PurchaseOrdersQuery = {}) {
    return ["purchase-orders", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseOrderById(token: string | null, id: string | null) {
    return ["purchase-order", token, id] as const;
  },
  purchaseInvoices(token: string | null, params: PurchaseInvoicesQuery = {}) {
    return ["purchase-invoices", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  purchaseInvoiceById(token: string | null, id: string | null) {
    return ["purchase-invoice", token, id] as const;
  },
  supplierPayments(token: string | null, params: SupplierPaymentsQuery = {}) {
    return ["supplier-payments", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  supplierPaymentById(token: string | null, id: string | null) {
    return ["supplier-payment", token, id] as const;
  },
  debitNotes(token: string | null, params: DebitNotesQuery = {}) {
    return ["debit-notes", token, normalizeObject(params as unknown as Record<string, unknown>)] as const;
  },
  debitNoteById(token: string | null, id: string | null) {
    return ["debit-note", token, id] as const;
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
