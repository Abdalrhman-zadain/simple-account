export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type UserRole = "ADMIN" | "MANAGER" | "USER";

export type ApiErrorShape = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Segments ─────────────────────────────────────────────────────────────────

export type SegmentValue = {
  id: string;
  definitionId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SegmentDefinition = {
  id: string;
  index: number;
  name: string;
  description?: string | null;
  values: SegmentValue[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSegmentValuePayload = {
  code: string;
  name: string;
};

export type UpdateSegmentValuePayload = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

// ─── Account Subtypes (Categories) ─────────────────────────────────────────────

export type AccountSubtype = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountSubtypePayload = {
  name: string;
};

export type UpdateAccountSubtypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Payment Method Types ─────────────────────────────────────────────────────

export type PaymentMethodType = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemType =
  | "INVENTORY"
  | "NON_STOCK"
  | "SERVICE"
  | "RAW_MATERIAL";

export type InventoryWarehouse = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  responsiblePerson?: string | null;
  isTransit: boolean;
  isDefaultTransit?: boolean;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryIssueStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryTransferStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryAdjustmentStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryStockMovementType =
  | "GOODS_RECEIPT"
  | "GOODS_ISSUE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export type InventoryCostingMethod = "WEIGHTED_AVERAGE" | "FIFO";

export type InventoryPolicy = {
  id: string;
  costingMethod: InventoryCostingMethod;
  createdAt: string;
  updatedAt: string;
};

export type UpdateInventoryPolicyPayload = {
  costingMethod: InventoryCostingMethod;
};

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unitOfMeasure: string;
  category?: string | null;
  type: InventoryItemType;
  reorderLevel: string;
  reorderQuantity: string;
  preferredWarehouseId?: string | null;
  preferredWarehouseCode?: string | null;
  preferredWarehouse?: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  > | null;
  onHandQuantity: string;
  valuationAmount: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  inventoryAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  cogsAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  salesAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  adjustmentAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemsQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
  type?: InventoryItemType | "";
  page?: number;
  limit?: number;
};

export type InventoryItemsResponse = {
  data: InventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryWarehousesQuery = {
  isActive?: "true" | "false" | "";
  isTransit?: "true" | "false" | "";
  search?: string;
};

export type InventoryGoodsReceiptsQuery = {
  status?: InventoryReceiptStatus | "";
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryGoodsIssuesQuery = {
  status?: InventoryIssueStatus | "";
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryTransfersQuery = {
  status?: InventoryTransferStatus | "";
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryAdjustmentsQuery = {
  status?: InventoryAdjustmentStatus | "";
  warehouseId?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryStockLedgerQuery = {
  itemId?: string;
  warehouseId?: string;
  movementType?: InventoryStockMovementType | "";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateInventoryItemPayload = {
  code?: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  category?: string;
  type: InventoryItemType;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  salesAccountId?: string;
  adjustmentAccountId?: string;
  reorderLevel?: string;
  reorderQuantity?: string;
  preferredWarehouseId?: string;
};

export type UpdateInventoryItemPayload = Partial<CreateInventoryItemPayload> & {
  isActive?: boolean;
};

export type CreateInventoryWarehousePayload = {
  code?: string;
  name: string;
  address?: string;
  responsiblePerson?: string;
  isTransit?: boolean;
  isDefaultTransit?: boolean;
};

export type UpdateInventoryWarehousePayload =
  Partial<CreateInventoryWarehousePayload> & {
    isActive?: boolean;
  };

export type InventoryGoodsReceiptLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
  };
};

export type InventoryGoodsReceipt = {
  id: string;
  reference: string;
  status: InventoryReceiptStatus;
  receiptDate: string;
  sourcePurchaseOrderRef?: string | null;
  sourcePurchaseInvoiceRef?: string | null;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryGoodsReceiptLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryGoodsReceiptsResponse = {
  data: InventoryGoodsReceipt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryGoodsIssueLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryGoodsIssue = {
  id: string;
  reference: string;
  status: InventoryIssueStatus;
  issueDate: string;
  sourceSalesOrderRef?: string | null;
  sourceSalesInvoiceRef?: string | null;
  sourceProductionRequestRef?: string | null;
  sourceInternalRequestRef?: string | null;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryGoodsIssueLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryGoodsIssuesResponse = {
  data: InventoryGoodsIssue[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryTransferLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryTransfer = {
  id: string;
  reference: string;
  status: InventoryTransferStatus;
  transferDate: string;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  sourceWarehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  destinationWarehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryTransferLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryTransfersResponse = {
  data: InventoryTransfer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryAdjustmentLine = {
  id: string;
  lineNumber: number;
  systemQuantity: string;
  countedQuantity: string;
  varianceQuantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryAdjustment = {
  id: string;
  reference: string;
  status: InventoryAdjustmentStatus;
  adjustmentDate: string;
  reason: string;
  description?: string | null;
  totalVarianceQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryAdjustmentLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustmentsResponse = {
  data: InventoryAdjustment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryStockMovement = {
  id: string;
  movementType: InventoryStockMovementType;
  transactionType: string;
  transactionId: string;
  transactionLineId?: string | null;
  transactionReference: string;
  transactionDate: string;
  quantityIn: string;
  quantityOut: string;
  unitCost: string;
  valueIn: string;
  valueOut: string;
  runningQuantity: string;
  runningValuation: string;
  description?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unitOfMeasure">;
  warehouse: Pick<InventoryWarehouse, "id" | "code" | "name">;
  createdAt: string;
};

export type InventoryStockLedgerResponse = {
  data: InventoryStockMovement[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryGoodsReceiptLinePayload = {
  itemId: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryGoodsReceiptPayload = {
  reference?: string;
  receiptDate: string;
  warehouseId: string;
  sourcePurchaseOrderRef?: string;
  sourcePurchaseInvoiceRef?: string;
  description?: string;
  lines: InventoryGoodsReceiptLinePayload[];
};

export type UpdateInventoryGoodsReceiptPayload =
  Partial<CreateInventoryGoodsReceiptPayload>;

export type InventoryGoodsIssueLinePayload = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryGoodsIssuePayload = {
  reference?: string;
  issueDate: string;
  warehouseId: string;
  sourceSalesOrderRef?: string;
  sourceSalesInvoiceRef?: string;
  sourceProductionRequestRef?: string;
  sourceInternalRequestRef?: string;
  description?: string;
  lines: InventoryGoodsIssueLinePayload[];
};

export type UpdateInventoryGoodsIssuePayload =
  Partial<CreateInventoryGoodsIssuePayload>;

export type InventoryTransferLinePayload = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryTransferPayload = {
  reference?: string;
  transferDate: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  description?: string;
  lines: InventoryTransferLinePayload[];
};

export type UpdateInventoryTransferPayload =
  Partial<CreateInventoryTransferPayload>;

export type InventoryAdjustmentLinePayload = {
  itemId: string;
  systemQuantity: string;
  countedQuantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryAdjustmentPayload = {
  reference?: string;
  adjustmentDate: string;
  warehouseId: string;
  reason: string;
  description?: string;
  lines: InventoryAdjustmentLinePayload[];
};

export type UpdateInventoryAdjustmentPayload =
  Partial<CreateInventoryAdjustmentPayload>;

export type CreatePaymentMethodTypePayload = {
  name: string;
};

export type UpdatePaymentMethodTypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Journal Entry Types ───────────────────────────────────────────────────────

export type JournalEntryType = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateJournalEntryTypePayload = {
  name: string;
};

export type UpdateJournalEntryTypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Fiscal ───────────────────────────────────────────────────────────────────

export type PeriodStatus = "OPEN" | "CLOSED" | "LOCKED";

export type FiscalPeriod = {
  id: string;
  fiscalYearId: string;
  fiscalYear?: FiscalYear;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
};

export type FiscalYear = {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  periods: FiscalPeriod[];
};

// ─── Payment Methods ─────────────────────────────────────────────────────

export type BankCashAccountType = string;

export type BankCashAccount = {
  id: string;
  type: BankCashAccountType;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  currencyCode: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  currentBalance: string;
  account: {
    id: string;
    code: string;
    name: string;
    type?: AccountType;
    currencyCode: string;
    isActive?: boolean;
    isPosting?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type BankCashAccountsQuery = {
  type?: BankCashAccountType | "";
  isActive?: "true" | "false" | "";
  search?: string;
};

export type BankCashTransactionKind = "RECEIPT" | "PAYMENT" | "TRANSFER";
export type BankCashTransactionStatus = "DRAFT" | "POSTED";

export type BankCashTransaction = {
  id: string;
  kind: BankCashTransactionKind;
  status: BankCashTransactionStatus;
  reference: string;
  transactionDate: string;
  amount: string;
  description?: string | null;
  counterpartyName?: string | null;
  bankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  } | null;
  sourceBankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  } | null;
  destinationBankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  } | null;
  counterAccount?: {
    id: string;
    code: string;
    name: string;
    currencyCode: string;
  } | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BankCashTransactionsQuery = {
  kind?: BankCashTransactionKind | "";
  status?: BankCashTransactionStatus | "";
  bankCashAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type BankReconciliationStatus = "DRAFT" | "COMPLETED";
export type BankStatementLineStatus = "UNMATCHED" | "MATCHED" | "RECONCILED";

export type BankReconciliationListItem = {
  id: string;
  status: BankReconciliationStatus;
  statementDate: string;
  statementEndingBalance: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankCashAccount: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  summary: {
    statementLineCount: number;
    unmatchedStatementLineCount: number;
    matchedCount: number;
    reconciledCount: number;
  };
};

export type BankReconciliationLedgerTransaction = {
  id: string;
  reference: string;
  entryDate: string;
  postedAt: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  journalEntryId: string;
  journalReference: string;
};

export type BankReconciliationMatch = {
  id: string;
  isReconciled: boolean;
  matchedAt: string;
  reconciledAt?: string | null;
  ledgerTransaction: BankReconciliationLedgerTransaction;
};

export type BankStatementLine = {
  id: string;
  transactionDate: string;
  reference?: string | null;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  status: BankStatementLineStatus;
  createdAt: string;
  updatedAt: string;
  matches: BankReconciliationMatch[];
};

export type BankReconciliation = {
  id: string;
  status: BankReconciliationStatus;
  statementDate: string;
  statementEndingBalance: string;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankCashAccount: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    currentBalance?: string | null;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  statementLines: BankStatementLine[];
  unmatchedSystemTransactions: BankReconciliationLedgerTransaction[];
  summary: {
    statementLineCount: number;
    unmatchedStatementLineCount: number;
    matchedStatementLineCount: number;
    reconciledStatementLineCount: number;
    matchedCount: number;
    reconciledCount: number;
    statementNetAmount: string;
    systemBalance: string;
    statementEndingBalance: string;
    balanceDifference: string;
  };
};

export type BankReconciliationsQuery = {
  bankCashAccountId?: string;
  status?: BankReconciliationStatus | "";
  dateFrom?: string;
  dateTo?: string;
};

export type CreateBankReconciliationPayload = {
  bankCashAccountId: string;
  statementDate: string;
  statementEndingBalance: number;
  notes?: string;
};

export type CreateBankStatementLinePayload = {
  transactionDate: string;
  reference?: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
};

export type ImportBankStatementLinesPayload = {
  lines: CreateBankStatementLinePayload[];
};

export type CreateBankReconciliationMatchPayload = {
  statementLineId: string;
  ledgerTransactionId: string;
};

export type CreateReceiptPayload = {
  reference?: string;
  transactionDate: string;
  amount: number;
  bankCashAccountId: string;
  counterAccountId: string;
  counterpartyName?: string;
  description?: string;
};

export type CreatePaymentPayload = CreateReceiptPayload;

export type CreateTransferPayload = {
  reference?: string;
  transactionDate: string;
  amount: number;
  sourceBankCashAccountId: string;
  destinationBankCashAccountId: string;
  description?: string;
};

export type UpdateBankCashTransactionPayload = Partial<{
  reference: string;
  transactionDate: string;
  amount: number;
  bankCashAccountId: string;
  sourceBankCashAccountId: string;
  destinationBankCashAccountId: string;
  counterAccountId: string;
  counterpartyName: string | null;
  description: string | null;
}>;

export type QuotationStatus =
  | "DRAFT"
  | "APPROVED"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED";
export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_INVOICED"
  | "FULLY_INVOICED"
  | "CANCELLED";
export type SalesInvoiceStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "OVERDUE"
  | "CANCELLED";
export type CreditNoteStatus = "DRAFT" | "POSTED" | "APPLIED" | "CANCELLED";
export type AllocationStatus = "UNALLOCATED" | "PARTIAL" | "FULLY_ALLOCATED";

export type Customer = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
  taxInfo?: string | null;
  salesRepresentative?: string | null;
  paymentTerms?: string | null;
  creditLimit: string;
  currentBalance: string;
  isActive: boolean;
  receivableAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
  paymentTerms?: string | null;
  taxInfo?: string | null;
  defaultCurrency: string;
  currentBalance: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  payableAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuppliersQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
};

export type CreateSupplierPayload = {
  code?: string;
  name: string;
  contactInfo?: string;
  paymentTerms?: string;
  taxInfo?: string;
  defaultCurrency: string;
  payableAccountId: string;
};

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export type SupplierBalance = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  currentBalance: string;
  outstandingBalance: string;
};

export type SupplierTransaction = {
  type: string;
  id: string;
  reference: string;
  date: string;
  amount: string;
  status: string;
};

export type SupplierTransactionsResponse = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  transactions: SupplierTransaction[];
};

export type PurchaseRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED"
  | "CLOSED";
export type PurchaseReceiptStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type PurchaseInvoiceStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "CANCELLED"
  | "REVERSED";
export type SupplierPaymentStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type DebitNoteStatus =
  | "DRAFT"
  | "POSTED"
  | "APPLIED"
  | "CANCELLED"
  | "REVERSED";

export type PurchaseRequestLine = {
  id: string;
  lineNumber: number;
  itemName?: string | null;
  description: string;
  quantity: string;
  requestedDeliveryDate?: string | null;
  justification?: string | null;
};

export type PurchaseRequestStatusHistoryEntry = {
  id: string;
  status: PurchaseRequestStatus;
  note?: string | null;
  changedAt: string;
};

export type PurchaseRequestLinkedOrder = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
};

export type PurchaseRequest = {
  id: string;
  reference: string;
  status: PurchaseRequestStatus;
  requestDate: string;
  description?: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canClose: boolean;
  canConvertToOrder: boolean;
  lines: PurchaseRequestLine[];
  statusHistory: PurchaseRequestStatusHistoryEntry[];
  linkedPurchaseOrders: PurchaseRequestLinkedOrder[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestsQuery = {
  status?: PurchaseRequestStatus | "";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseRequestLinePayload = {
  itemName?: string;
  description: string;
  quantity: number;
  requestedDeliveryDate?: string;
  justification?: string;
};

export type CreatePurchaseRequestPayload = {
  reference?: string;
  requestDate: string;
  description?: string;
  lines: PurchaseRequestLinePayload[];
};

export type UpdatePurchaseRequestPayload =
  Partial<CreatePurchaseRequestPayload>;

export type PurchaseRequestStatusNotePayload = {
  note?: string;
};

export type ConvertPurchaseRequestToOrderPayload = {
  reference?: string;
  supplierId: string;
  orderDate: string;
  currencyCode?: string;
  description?: string;
};

export type PurchaseRequestConversionResult = {
  purchaseRequest: PurchaseRequest;
  purchaseOrder: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
    currencyCode: string;
    supplier: {
      id: string;
      code: string;
      name: string;
    };
  };
};

export type PurchaseOrderLine = {
  id: string;
  lineNumber: number;
  itemName?: string | null;
  description: string;
  quantity: string;
  receivedQuantity: string;
  unitPrice: string;
  taxAmount: string;
  lineTotalAmount: string;
  requestedDeliveryDate?: string | null;
};

export type PurchaseReceiptLine = {
  id: string;
  lineNumber: number;
  purchaseOrderLineId: string;
  purchaseOrderLineNumber: number;
  itemName?: string | null;
  description: string;
  quantityReceived: string;
};

export type PurchaseReceipt = {
  id: string;
  reference: string;
  status: PurchaseReceiptStatus;
  receiptDate: string;
  description?: string | null;
  totalQuantity: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  purchaseOrder: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
  };
  lines: PurchaseReceiptLine[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  canEdit: boolean;
  canIssue: boolean;
  canReceive: boolean;
  canCancel: boolean;
  canMarkPartiallyReceived: boolean;
  canMarkFullyReceived: boolean;
  canClose: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  sourcePurchaseRequest?: {
    id: string;
    reference: string;
    status: PurchaseRequestStatus;
  } | null;
  lines: PurchaseOrderLine[];
  receipts: Array<{
    id: string;
    reference: string;
    status: PurchaseReceiptStatus;
    receiptDate: string;
    totalQuantity: string;
    postedAt?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrdersQuery = {
  status?: PurchaseOrderStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseOrderLinePayload = {
  itemName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  requestedDeliveryDate?: string;
};

export type CreatePurchaseOrderPayload = {
  reference?: string;
  orderDate: string;
  supplierId: string;
  currencyCode?: string;
  description?: string;
  sourcePurchaseRequestId?: string;
  lines: PurchaseOrderLinePayload[];
};

export type UpdatePurchaseOrderPayload = Partial<CreatePurchaseOrderPayload>;

export type PurchaseReceiptLinePayload = {
  purchaseOrderLineId: string;
  quantityReceived: number;
};

export type CreatePurchaseReceiptPayload = {
  reference?: string;
  receiptDate: string;
  purchaseOrderId: string;
  description?: string;
  lines: PurchaseReceiptLinePayload[];
};

export type UpdatePurchaseReceiptPayload =
  Partial<CreatePurchaseReceiptPayload>;

export type PurchaseInvoiceLine = {
  id: string;
  lineNumber: number;
  itemName?: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotalAmount: string;
  lineTotalAmount: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
};

export type PurchaseInvoice = {
  id: string;
  reference: string;
  status: PurchaseInvoiceStatus;
  invoiceDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  allocationStatus: AllocationStatus;
  canEdit: boolean;
  canPost?: boolean;
  canReverse: boolean;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  sourcePurchaseOrder?: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
  } | null;
  lines: PurchaseInvoiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseInvoicesQuery = {
  status?: PurchaseInvoiceStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseInvoiceLinePayload = {
  itemName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  accountId: string;
};

export type CreatePurchaseInvoicePayload = {
  reference?: string;
  invoiceDate: string;
  supplierId: string;
  currencyCode?: string;
  description?: string;
  sourcePurchaseOrderId?: string;
  lines: PurchaseInvoiceLinePayload[];
};

export type UpdatePurchaseInvoicePayload =
  Partial<CreatePurchaseInvoicePayload>;

export type SupplierPaymentAllocation = {
  id: string;
  amount: string;
  purchaseInvoice: {
    id: string;
    reference: string;
    status: PurchaseInvoiceStatus;
    invoiceDate: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
  };
};

export type SupplierPayment = {
  id: string;
  reference: string;
  status: SupplierPaymentStatus;
  paymentDate: string;
  amount: string;
  allocatedAmount: string;
  unappliedAmount: string;
  description?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  bankCashAccount: {
    id: string;
    name: string;
    type: string;
    currencyCode: string;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  bankCashTransaction?: {
    id: string;
    reference: string;
    status: BankCashTransactionStatus;
    transactionDate: string;
    postedAt?: string | null;
  } | null;
  allocations: SupplierPaymentAllocation[];
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPaymentsQuery = {
  status?: SupplierPaymentStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SupplierPaymentAllocationPayload = {
  purchaseInvoiceId: string;
  amount: number;
};

export type CreateSupplierPaymentPayload = {
  reference?: string;
  paymentDate: string;
  supplierId: string;
  amount: number;
  bankCashAccountId: string;
  description?: string;
  allocations?: SupplierPaymentAllocationPayload[];
};

export type UpdateSupplierPaymentPayload =
  Partial<CreateSupplierPaymentPayload>;

export type DebitNoteLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  amount: string;
  taxAmount: string;
  reason: string;
  lineTotalAmount: string;
};

export type DebitNote = {
  id: string;
  reference: string;
  status: DebitNoteStatus;
  noteDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  purchaseInvoice?: {
    id: string;
    reference: string;
    status: PurchaseInvoiceStatus;
    invoiceDate: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
  } | null;
  lines: DebitNoteLine[];
  createdAt: string;
  updatedAt: string;
};

export type DebitNotesQuery = {
  status?: DebitNoteStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DebitNoteLinePayload = {
  quantity: number;
  amount: number;
  taxAmount: number;
  reason: string;
};

export type CreateDebitNotePayload = {
  reference?: string;
  noteDate: string;
  supplierId: string;
  purchaseInvoiceId?: string;
  currencyCode?: string;
  description?: string;
  lines: DebitNoteLinePayload[];
};

export type UpdateDebitNotePayload = Partial<CreateDebitNotePayload>;

export type SalesLine = {
  id: string;
  lineNumber: number;
  itemName?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotalAmount: string;
  lineAmount: string;
  revenueAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
};

export type SalesQuotation = {
  id: string;
  reference: string;
  status: QuotationStatus;
  quotationDate: string;
  validityDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  convertedAt?: string | null;
  customer: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    paymentTerms?: string | null;
    creditLimit: string;
    currentBalance: string;
    receivableAccount: Customer["receivableAccount"];
  };
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrder = {
  id: string;
  reference: string;
  status: SalesOrderStatus;
  orderDate: string;
  promisedDate?: string | null;
  currencyCode: string;
  shippingDetails?: string | null;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  sourceQuotation?: { id: string; reference: string } | null;
  customer: SalesQuotation["customer"];
  salesInvoices: Array<{
    id: string;
    reference: string;
    totalAmount: string;
    status: SalesInvoiceStatus;
  }>;
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type SalesInvoice = {
  id: string;
  reference: string;
  status: SalesInvoiceStatus;
  invoiceDate: string;
  dueDate?: string | null;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  allocationStatus: AllocationStatus;
  postedAt?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  sourceQuotation?: { id: string; reference: string } | null;
  sourceSalesOrder?: { id: string; reference: string } | null;
  customer: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    paymentTerms?: string | null;
    creditLimit: string;
    currentBalance: string;
    receivableAccount: Customer["receivableAccount"];
  };
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type CreditNote = {
  id: string;
  reference: string;
  status: CreditNoteStatus;
  noteDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  postedAt?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  linkedInvoice?: { id: string; reference: string } | null;
  customer: SalesInvoice["customer"];
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerBalance = {
  customerId: string;
  customerCode: string;
  customerName: string;
  currentBalance: string;
  outstandingBalance: string;
  creditLimit: string;
  availableCredit: string;
};

export type CustomerTransaction =
  | {
      type: "INVOICE";
      id: string;
      reference: string;
      date: string;
      amount: string;
      allocatedAmount: string;
      outstandingAmount: string;
      description?: string | null;
    }
  | {
      type: "CREDIT_NOTE";
      id: string;
      reference: string;
      date: string;
      amount: string;
      linkedInvoiceId?: string | null;
      description?: string | null;
    }
  | {
      type: "RECEIPT";
      id: string;
      reference: string;
      date: string;
      amount: string;
      description?: string | null;
    }
  | {
      type: "RECEIPT_ALLOCATION";
      id: string;
      reference: string;
      date: string;
      amount: string;
      salesInvoiceId: string;
      salesInvoiceReference: string;
    };

export type ReceiptAllocationResult = {
  allocation: {
    id: string;
    salesInvoiceId: string;
    receiptTransactionId: string;
    amount: string;
    allocatedAt: string;
  };
  invoice: {
    id: string;
    reference: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
    allocationStatus: AllocationStatus;
    status: SalesInvoiceStatus;
  };
};

export type CustomerReceipt = {
  id: string;
  reference: string;
  status: BankCashTransactionStatus;
  receiptDate: string;
  amount: string;
  allocatedAmount: string;
  unappliedAmount: string;
  settlementReference?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  customer?: { id: string; code: string; name: string } | null;
  bankCashAccount?: {
    id: string;
    name: string;
    type: BankCashAccountType;
    currencyCode: string;
    account: Customer["receivableAccount"];
  } | null;
};

export type AgingReportRow = {
  customerId: string;
  customerCode: string;
  customerName: string;
  current: string;
  bucket31To60: string;
  bucket61To90: string;
  over90: string;
  total: string;
};

export type AgingReport = {
  asOfDate: string;
  rows: AgingReportRow[];
  totals: Omit<AgingReportRow, "customerId" | "customerCode" | "customerName">;
};

export type CustomersQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
};

export type SalesDocumentsQuery = {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type CreateCustomerPayload = {
  code?: string;
  name: string;
  contactInfo?: string;
  taxInfo?: string;
  salesRepresentative?: string;
  paymentTerms?: string;
  creditLimit: number;
  receivableAccountId: string;
};

export type UpdateCustomerPayload = Partial<{
  name: string;
  contactInfo: string;
  taxInfo: string;
  salesRepresentative: string;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
  receivableAccountId: string;
}>;

export type SalesLinePayload = {
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
  lineAmount?: number;
  description?: string;
  revenueAccountId?: string;
};

export type CreateSalesQuotationPayload = {
  reference?: string;
  quotationDate: string;
  validityDate: string;
  customerId: string;
  currencyCode?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesQuotationPayload = Partial<CreateSalesQuotationPayload>;

export type CreateSalesOrderPayload = {
  reference?: string;
  orderDate: string;
  promisedDate?: string;
  customerId: string;
  currencyCode?: string;
  sourceQuotationId?: string;
  shippingDetails?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesOrderPayload = Partial<CreateSalesOrderPayload>;

export type CreateSalesInvoicePayload = {
  reference?: string;
  invoiceDate: string;
  dueDate?: string;
  customerId: string;
  currencyCode?: string;
  sourceQuotationId?: string;
  sourceSalesOrderId?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesInvoicePayload = Partial<CreateSalesInvoicePayload>;

export type CreateCreditNotePayload = {
  reference?: string;
  noteDate: string;
  customerId: string;
  currencyCode?: string;
  salesInvoiceId?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateCreditNotePayload = Partial<CreateCreditNotePayload>;

export type AllocateReceiptPayload = {
  salesInvoiceId: string;
  receiptTransactionId: string;
  amount: number;
};

export type CreateCustomerReceiptPayload = {
  reference?: string;
  receiptDate: string;
  customerId: string;
  amount: number;
  bankCashAccountId: string;
  settlementReference?: string;
  description?: string;
};

export type CreateBankCashAccountPayload = {
  type: BankCashAccountType;
  name: string;
  bankName?: string;
  accountNumber?: string;
  currencyCode: string;
  accountId: string;
  openingBalance?: number;
  openingBalanceOffsetAccountId?: string;
};

export type UpdateBankCashAccountPayload =
  Partial<CreateBankCashAccountPayload>;

export type BankCashAccountTransaction = {
  id: string;
  reference: string;
  journalEntryId: string;
  journalEntryLineId: string;
  entryDate: string;
  postedAt: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  transactionType: string;
  journalReference: string;
};

export type BankCashAccountTransactionsResponse = {
  bankCashAccount: BankCashAccount;
  transactions: BankCashAccountTransaction[];
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export type Account = {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  type: AccountType;
  subtype?: string | null;
  isPosting: boolean;
  allowManualPosting: boolean;

  // Enterprise Segments (Relational)
  segment1ValueId?: string | null;
  segment1Value?: SegmentValue | null;
  segment2ValueId?: string | null;
  segment2Value?: SegmentValue | null;
  segment3ValueId?: string | null;
  segment3Value?: SegmentValue | null;
  segment4ValueId?: string | null;
  segment4Value?: SegmentValue | null;
  segment5ValueId?: string | null;
  segment5Value?: SegmentValue | null;

  // Legacy/String Segments
  segment1?: string | null;
  segment2?: string | null;
  segment3?: string | null;
  segment4?: string | null;
  segment5?: string | null;

  currencyCode: string;
  isActive: boolean;
  currentBalance: string;
  parentAccountId?: string | null;
  parentAccount?: Account | null;
  ancestors?: Array<{
    id: string;
    name: string;
    code: string;
    parentAccountId: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type AccountOption = Pick<
  Account,
  "id" | "code" | "name" | "currentBalance" | "currencyCode"
>;

export type AccountTableRow = Pick<
  Account,
  | "id"
  | "code"
  | "name"
  | "type"
  | "isPosting"
  | "isActive"
  | "currentBalance"
  | "parentAccountId"
> & {
  canDelete: boolean;
  parentAccount?: { id: string; name: string } | null;
};

export type AccountTreeNode = Account & {
  children: AccountTreeNode[];
};

export type AccountsQuery = {
  type?: AccountType | "";
  isActive?: "true" | "false" | "";
  isPosting?: "true" | "false" | "";
  search?: string;
  parentAccountId?: string | null;
  view?: "selector" | "table";
};

export type CreateAccountPayload = {
  name: string;
  nameAr?: string;
  description?: string;
  type: AccountType;
  subtype?: string;
  isPosting?: boolean;
  allowManualPosting?: boolean;

  segment1ValueId?: string;
  segment2ValueId?: string;
  segment3ValueId?: string;
  segment4ValueId?: string;
  segment5ValueId?: string;

  segment1?: string;
  segment2?: string;
  segment3?: string;
  segment4?: string;
  segment5?: string;

  currencyCode?: string;
  parentAccountId?: string;
};

export type UpdateAccountPayload = Partial<CreateAccountPayload> & {
  isActive?: boolean;
};

// ─── Journal Entries ──────────────────────────────────────────────────────────

export type JournalEntryStatus = "DRAFT" | "POSTED";

export type JournalEntryLine = {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  lineNumber: number;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
};

export type JournalEntry = {
  id: string;
  reference: string;
  status: JournalEntryStatus;
  entryDate: string;
  journalEntryTypeId?: string | null;
  journalEntryType?: { id: string; name: string } | null;
  description?: string | null;
  postedAt?: string | null;
  postingBatchId?: string | null;
  reversalOfId?: string | null;
  fiscalPeriodId?: string | null;
  lines: JournalEntryLine[];
};

export type JournalEntryLinePayload = {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
};

export type CreateJournalEntryPayload = {
  entryDate: string;
  journalEntryTypeId?: string;
  description?: string;
  lines: JournalEntryLinePayload[];
};

export type JournalEntriesQuery = {
  status?: JournalEntryStatus | "";
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
  search?: string;
  journalEntryTypeId?: string;
  includeLines?: boolean;
};

// ─── General Ledger ───────────────────────────────────────────────────────────

export type LedgerEntry = {
  id: string;
  reference: string;
  journalEntryId: string;
  journalEntryLineId: string;
  postingBatchId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  entryDate: string;
  postedAt: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
};

export type LedgerResponse = {
  openingBalance: string;
  transactions: LedgerEntry[];
};

export type LedgerQuery = {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "POST"
  | "REVERSE"
  | "OPEN"
  | "CLOSE"
  | "VIEW";

export type AuditLogEntry = {
  id: string;
  userId?: string | null;
  user?: { id: string; name?: string | null; email: string } | null;
  entity: string;
  entityId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export type ApiCheckResult = {
  baseUrl: string;
  usedAuth: boolean;
  hasToken: boolean;
  data: Account[];
};
