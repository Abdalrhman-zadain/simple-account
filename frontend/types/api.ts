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
  createdAt: string;
  updatedAt: string;
};

export type AccountOption = Pick<Account, "id" | "code" | "name" | "currentBalance">;

export type AccountTableRow = Pick<
  Account,
  "id" | "code" | "name" | "type" | "isPosting" | "isActive" | "currentBalance" | "parentAccountId"
> & {
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
