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

export type QuotationStatus = "DRAFT" | "APPROVED" | "EXPIRED" | "CONVERTED" | "CANCELLED";
export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "PARTIALLY_INVOICED" | "FULLY_INVOICED" | "CANCELLED";
export type SalesInvoiceStatus = "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "FULLY_PAID" | "OVERDUE" | "CANCELLED";
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
  salesInvoices: Array<{ id: string; reference: string; totalAmount: string; status: SalesInvoiceStatus }>;
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

export type UpdateBankCashAccountPayload = Partial<CreateBankCashAccountPayload>;

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
  ancestors?: Array<{ id: string; name: string; code: string; parentAccountId: string | null }>;
  createdAt: string;
  updatedAt: string;
};

export type AccountOption = Pick<Account, "id" | "code" | "name" | "currentBalance" | "currencyCode">;

export type AccountTableRow = Pick<
  Account,
  "id" | "code" | "name" | "type" | "isPosting" | "isActive" | "currentBalance" | "parentAccountId"
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

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "POST" | "REVERSE" | "OPEN" | "CLOSE" | "VIEW";

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
