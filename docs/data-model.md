# Data Model

## Summary

The database is centered on Phase 1 accounting data. Prisma is the schema definition and access layer, and PostgreSQL is the source of truth.

This document describes the current schema and its accounting meaning. It does not propose a redesign.

## Core Model Groups

### Accounts

Main model:

- `Account`
- `BankCashAccount`
- `BankCashTransaction`
- `BankReconciliation`
- `BankStatementLine`
- `BankReconciliationMatch`

Key fields:

- `code`
- `name`
- `nameAr`
- `currencyCode`
- `type`
- `isPosting`
- `allowManualPosting`
- `isActive`
- `currentBalance`
- `parentAccountId`
- segment references and segment strings

Accounting meaning:

- the chart of accounts is stored here
- hierarchy is represented by `parentAccountId`
- real posting targets are controlled by `isPosting`
- current account balance is stored directly and updated by posting logic
- operational bank/cash records wrap specific posting accounts for balance and history views
- records typed as `Bank` require `bankName` and `accountNumber`; other payment-method types may leave those fields empty or use them as operational references
- receipt, payment, and transfer records are stored as `BankCashTransaction` rows and affect balances only after posting creates a journal entry
- reconciliation work is stored separately from operational transactions so statement lines and matching status do not alter balances directly
- bank/cash opening balances are not stored as a separate balance field; they are posted as normal journal/ledger history against the linked account and an offset posting account

### Journals

Main models:

- `JournalEntry`
- `JournalEntryLine`
- `JournalEntryType`

Key fields:

- `reference`
- `status`
- `entryDate`
- `reversalOfId`
- line debit and credit amounts
- line account references

Accounting meaning:

- journals capture accounting intent before and after posting
- lines are the balanced accounting detail
- reversal links preserve correction history
- journal entries may optionally be categorized by a user-defined journal entry type (e.g. Payment, Invoice)

### Posting And Ledger

Main models:

- `PostingBatch`
- `LedgerTransaction`

Key fields:

- posting batch timestamp
- journal entry reference
- journal entry line reference
- account reference
- debit and credit amounts
- posted timestamps

Accounting meaning:

- posted history is stored in ledger transactions
- the posting batch groups a posting operation
- ledger rows are the authoritative posted history behind the general ledger
- bank/cash transaction history is derived from ledger rows for the linked posting account
- posted bank/cash transaction records link to the journal entry that created their ledger rows
- bank reconciliation matches link statement lines to ledger rows and store whether each match has been reconciled

### Sales And Receivables

Main models:

- `Customer`
- `SalesQuotation`
- `SalesQuotationLine`
- `SalesOrder`
- `SalesOrderLine`
- `SalesInvoice`
- `SalesInvoiceLine`
- `CreditNote`
- `CreditNoteLine`
- `ReceiptAllocation`
- `BankCashTransaction` (for customer receipts linked to customer masters)

Key fields:

- customer `code`, `name`, `contactInfo`, `taxInfo`, `salesRepresentative`, `paymentTerms`, `creditLimit`, `currentBalance`, and `isActive`
- quotation/order/invoice/credit-note `reference`, `status`, date fields, `currencyCode`, totals, and source-document references where applicable
- invoice `dueDate`, `subtotalAmount`, `discountAmount`, `taxAmount`, `totalAmount`, and `journalEntryId`
- invoice `allocatedAmount`, `outstandingAmount`, and `allocationStatus`
- line `itemName`, `quantity`, `unitPrice`, `discountAmount`, `taxAmount`, `lineSubtotalAmount`, `lineAmount`/`lineTotalAmount`, and `revenueAccountId`
- customer receipt transactions `customerId`, settlement text, and links to posted receipt transactions
- allocation `amount`, `allocatedAt`, and links to posted receipt transactions

Accounting meaning:

- customer receivable control links each customer to one posting receivable account
- quotations and sales orders preserve commercial traceability before accounting is created
- invoices and credit notes can be drafted, then posted through Phase 1 journal/posting logic
- invoice posting debits receivables and credits revenue plus sales tax/VAT liability when tax is present
- customer receipts are stored as Phase 2 posted receipt transactions and can be created from either the Sales module or the Bank & Cash module
- posting creates journal/ledger history and links each document to its generated journal reference
- customer balance is incremented on posted invoices and decremented on posted credit notes
- receipt allocation updates invoice outstanding status while preventing over-allocation
- aging is derived from posted invoice outstanding balances by age bucket using due date when present

### Purchases

Main models:

- `Supplier`
- `PurchaseRequest`
- `PurchaseRequestLine`
- `PurchaseRequestStatusHistory`
- `PurchaseOrder`
- `PurchaseOrderLine`

Key fields:

- supplier `code`, `name`, `contactInfo`, `paymentTerms`, `taxInfo`, `defaultCurrency`, `currentBalance`, and `isActive`
- purchase request `reference`, `status`, `requestDate`, optional `description`, and linked request lines
- request line `itemName`, `description`, `quantity`, `requestedDeliveryDate`, and `justification`
- request status history `status`, `note`, and `changedAt`
- purchase order `reference`, `status`, `orderDate`, `supplierId`, `currencyCode`, `sourcePurchaseRequestId`, and totals
- purchase order line `itemName`, `description`, `quantity`, `unitPrice`, `taxAmount`, `lineTotalAmount`, and `requestedDeliveryDate`

Accounting meaning:

- supplier masters link each supplier to one posting payable account and preserve history after deactivation
- purchase requests are internal pre-procurement documents with draft, submitted, approved, rejected, and closed states
- request status transitions are stored separately so approval history remains auditable
- approved purchase requests can open a draft purchase order while preserving source-request traceability
- purchase orders now persist their own header and line lifecycle, including direct creation, request-linked creation, and operational statuses (`DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`, `CANCELLED`, `CLOSED`), but they still do not carry posting behavior or receipt/invoice matching
- purchase invoices now persist supplier-linked draft headers and lines, including optional source purchase-order linkage, line-level posting-account classification, subtotal/discount/tax/total amounts, and future-ready statuses, but they do not yet generate journals, affect supplier balances, or integrate with payments

### Fiscal Control

Main models:

- `FiscalYear`
- `FiscalPeriod`

Accounting meaning:

- defines open, closed, and locked accounting periods
- connects journal entries and ledger rows to fiscal time

### Master Data

Main models:

- `SegmentDefinition`
- `SegmentValue`
- `AccountSubtype`

Accounting meaning:

- allows enterprise-style segmented coding and reference data
- links segment values to accounts
- provides a controlled list of user-defined account classes (stored on `Account.subtype` as a string)

### Audit And Users

Main models:

- `AuditLog`
- `User`

Key fields & behavior:

- `User.role` (ADMIN, MANAGER, USER) determines the user's privilege layer.
- `User.companyId` isolates data to a specific tenant.
- `User.parentUserId` supports hierarchical management of users within a company.
- `AuditLog.companyId` enables fast filtering of audit history per tenant.

Accounting meaning:

- implements the multi-tenant architecture by isolating users and their data within companies
- super-admins (ADMIN) manage the global platform
- company root users (MANAGER) manage their own company's specific data and users
- tracks who performed actions and on which entities with company-level scoping

## Relationship Map

```text
Account
  ├─ parentAccount -> Account
  ├─ childAccounts -> Account[]
  ├─ bankCashAccount -> BankCashAccount?
  ├─ journalLines -> JournalEntryLine[]
  └─ ledgerLines -> LedgerTransaction[]

BankCashAccount
  ├─ account -> Account
  ├─ type -> active PaymentMethodType.name (application-level validation)
  └─ reconciliations -> BankReconciliation[]

BankReconciliation
  ├─ bankCashAccount -> BankCashAccount
  ├─ statementLines -> BankStatementLine[]
  └─ matches -> BankReconciliationMatch[]

BankStatementLine
  ├─ reconciliation -> BankReconciliation
  └─ matches -> BankReconciliationMatch[]

JournalEntry
  ├─ lines -> JournalEntryLine[]
  ├─ ledgerLines -> LedgerTransaction[]
  ├─ postingBatch -> PostingBatch
  ├─ fiscalPeriod -> FiscalPeriod
  └─ reversalOf / reversedBy -> JournalEntry

JournalEntryLine
  ├─ account -> Account
  ├─ journalEntry -> JournalEntry
  └─ ledgerLines -> LedgerTransaction[]

LedgerTransaction
  ├─ postingBatch -> PostingBatch
  ├─ journalEntry -> JournalEntry
  ├─ journalEntryLine -> JournalEntryLine
  ├─ account -> Account
  ├─ bankReconciliationMatches -> BankReconciliationMatch[]
  └─ fiscalPeriod -> FiscalPeriod
```

## Module Ownership Map

Ownership by module:

- Chart of Accounts:
  - `Account`
- Payment Methods:
  - `BankCashAccount`
  - `BankCashTransaction`
  - `BankReconciliation`
  - `BankStatementLine`
  - `BankReconciliationMatch`
  - reads linked `Account`
  - reads linked `LedgerTransaction`
  - creates linked `JournalEntry` rows through Phase 1 journal/posting services when receipt, payment, or transfer drafts are posted
- Journal Entries:
  - `JournalEntry`
  - `JournalEntryLine`
- Posting Logic:
  - `PostingBatch`
  - `LedgerTransaction`
  - `Account.currentBalance`
- General Ledger:
  - reads `LedgerTransaction` and `Account`
- Reversal Control:
  - uses `JournalEntry.reversalOfId`
- Fiscal:
  - `FiscalYear`
  - `FiscalPeriod`
- Master Data:
  - `SegmentDefinition`
  - `SegmentValue`
- Audit:
  - `AuditLog`
- Platform Auth:
  - `User`
- Sales & Receivables:
- `Customer`
- `SalesQuotation`
- `SalesQuotationLine`
- `SalesOrder`
- `SalesOrderLine`
- `SalesInvoice`
- `SalesInvoiceLine`
- `CreditNote`
- `CreditNoteLine`
- `ReceiptAllocation`
- reads posted `BankCashTransaction` for receipt allocations
- creates optional customer-linked posted `BankCashTransaction` rows for receipts recorded from the Sales module
  - creates linked `JournalEntry` rows through Phase 1 journal/posting services when invoices and credit notes are posted
- Purchases:
  - `Supplier`
  - `PurchaseRequest`
  - `PurchaseRequestLine`
  - `PurchaseRequestStatusHistory`
  - `PurchaseOrder`
  - `PurchaseOrderLine`
  - currently owns supplier masters, purchase-request lifecycle, request-status audit history, and request-to-draft-order traceability

## Balance Integrity Expectations

These expectations are core to the current model:

- debit total must equal credit total before posting
- posting creates ledger rows and updates `Account.currentBalance`
- posted journal history should remain reconstructable
- reversal should create compensating records instead of deleting history
- ledger history should be append-oriented from an accounting perspective

## Header And Posting Implications

The model supports structural and transactional accounts:

- header accounts:
  - represented with `isPosting = false`
  - used for grouping and reporting structure
- posting accounts:
  - represented with `isPosting = true`
  - intended to receive journal-entry activity

This distinction is critical when editing:

- posting logic
- account creation workflows
- journal-entry validation
- account-tree reporting

Additional invariants:

- header accounts may have children and should not be used as direct journal-entry targets
- posting accounts must stay leaf nodes with no child accounts
- any application workflow that creates, updates, validates, or posts journal lines must reject header-account posting attempts
- the database also rejects assigning a child to a posting account or converting an account with children into a posting account

## Segment Strategy

The schema currently supports two segment styles at the same time:

- relational segment references via `SegmentValue`
- legacy string segment fields on `Account`

Future edits must document whether a change touches:

- relational segment behavior
- legacy string display behavior
- account code generation (`code` is unique, assigned only by the server at create time, with transactional allocation under each parent)
  - The system may allocate codes using either:
    - **Legacy/string allocation** for non-numeric charts (including segmented enterprise codes)
    - **7-digit numeric hierarchical allocation** when the parent code is exactly 7 digits (e.g. `1000000` → `1100000` → `1100001`)

## What Not To Assume

Do not assume:

- later ERP phases already have schema ownership
- the ledger is a generic reporting table unrelated to posting
- header and posting accounts are interchangeable
- balance updates can be skipped because ledger rows exist
- a bank/cash registry row replaces the linked chart-of-accounts account; it is an operational wrapper around that posting account
