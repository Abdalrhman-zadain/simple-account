# System Design

## Summary

The project is a **modular monolith** with a Next.js frontend, a NestJS backend, Prisma for data access, and PostgreSQL as the system of record.

The current business scope is:

- multi-tenant platform authentication (companies, users, roles)
- Phase 1 Accounting Foundation
- bank and cash account registry linked to posting accounts for operational balances and history
- bank/cash receipt, payment, and transfer drafts that post through generated journal entries
- bank/cash reconciliation against imported or manually entered statement lines with match/reconcile audit status
- sales and receivables workflows for customers, quotations, sales orders, invoices, customer receipts, credit notes, receipt allocation, balance tracking, and aging
- Phase 4 purchases includes supplier master management, internal purchase requests with approval/status history, purchase orders with direct/request-linked creation plus draft-through-close operational statuses, purchase invoice drafts with source-order linkage and line-level account classification, supplier payments with invoice allocation plus Bank & Cash posting integration, and debit notes with optional purchase-invoice linkage plus supplier/payable balance reduction; purchase-invoice and debit-note journal posting flows are still pending
- Phase 5 inventory currently implements `item-master`, `warehouses`, `goods-receipts`, `goods-issues`, `transfers`, `adjustments`, `stock-ledger`, and `policy` slices with warehouse-level balances, stock movement history, source-document drill-down, organization-level costing method selection via `inventory/policy` (`WEIGHTED_AVERAGE` or `FIFO`), prevent-negative-stock policy toggles, optional accounting posting integration through Phase 1 journal/posting services, and reverse-status workflows for posted inventory documents
- Phase 6 payroll implements employee masters, payroll groups, payroll component setup, employee/group component assignments, payroll rules and formulas, payroll periods, payslip generation and draft review, posted-payslip adjustments, payroll period posting/reversal through Phase 1 journal/posting/reversal services, salary payment allocation/settlement/reversal through Phase 2 bank/cash payment posting, and payroll summary inquiry
- Phase 7 fixed assets implements asset categories, fixed-asset register, acquisition capture/posting/reversal, depreciation runs/posting/reversal, disposal capture/posting/reversal, transfer capture/posting/reversal, asset schedule/history inquiry, and audit logging through a dedicated fixed-assets module
- Phase 8 reporting implements a dedicated reporting workspace for summary inquiry, trial balance, balance sheet, profit and loss, cash movement, general ledger, audit review, saved definitions, snapshots, exports, and reporting activity review using posted accounting data plus comparison-period filters

The system is organized to keep domain logic inside the owning implemented phase module and keep the frontend split into route composition and feature-owned UI.

## Architecture Overview

```text
┌────────────────────────────────────────────────────┐
│ Frontend                                           │
│ Next.js app router                                 │
│ app/(auth) and app/(erp) routes                    │
│ feature-owned screens in frontend/features         │
└──────────────────────┬─────────────────────────────┘
                       │ HTTP JSON
┌──────────────────────▼─────────────────────────────┐
│ Backend                                            │
│ NestJS modular monolith                            │
│ platform/auth                                      │
│ phase-1-accounting-foundation/accounting-core      │
└──────────────────────┬─────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼─────────────────────────────┐
│ Database                                           │
│ PostgreSQL                                         │
│ accounts, journal entries, ledger, fiscal, audit   │
└────────────────────────────────────────────────────┘
```

## Current Backend Shape

The backend root module wires three major concerns:

- `common/prisma`
- `modules/platform/auth`
- `modules/phase-1-accounting-foundation/accounting-core`
- `modules/phase-2-bank-cash-management/bank-cash-accounts`
- `modules/phase-2-bank-cash-management/bank-cash-transactions`
- `modules/phase-2-bank-cash-management/bank-reconciliations`
- `modules/phase-3-sales-receivables`
- `modules/phase-4-procure-to-pay/purchases`
- `modules/phase-5-inventory-management/inventory`
- `modules/phase-6-payroll-management/payroll`
- `modules/phase-7-fixed-assets-management/fixed-assets`
- `modules/phase-8-reporting-control/reporting`

`AccountingCoreModule` is the Phase 1 composition root and imports:

- Validation Rules
- Chart of Accounts
- Journal Entries
- Posting Logic
- Reversal Control
- General Ledger
- Master Data
- Fiscal
- Audit

## Current Frontend Shape

The frontend separates routing from business UI:

- `frontend/app/(auth)` contains login and register routes
- `frontend/app/(erp)` contains ERP page entrypoints
- `frontend/features/...` owns accounting and auth screens
- larger frontend features may use feature-local `components/`, `types`, and `utils` files to keep orchestration separate from leaf UI
- `frontend/components/ui` owns reusable UI primitives
- `frontend/lib` owns API clients, config, and shared utilities

Thin route files compose:

- `RequireAuth`
- `PageShell`
- feature-owned page components

## Current Phase 2 Shape

The backend also includes a dedicated Phase 2 module:

- `modules/phase-2-bank-cash-management/bank-cash-accounts`
- `modules/phase-2-bank-cash-management/bank-cash-transactions`
- `modules/phase-2-bank-cash-management/bank-reconciliations`

These modules own the operational bank/cash account registry, receipt/payment/transfer workflow records, reconciliation workpapers, and history views derived from linked posting accounts.

## Auth Boundary

Authentication is centralized in `platform/auth` on the backend and the auth provider on the frontend. The system implements a Multi-Tenant architecture where users belong to companies (mapped to `SegmentValue` with index=1).

Backend auth responsibilities:

- register users into specific companies
- login users
- issue JWT access tokens containing the multi-tenant company context and roles (ADMIN, MANAGER, USER)
- guard protected controllers with `JwtAuthGuard`
- provide company-based isolation for database access and business logic

Frontend auth responsibilities:

- persist the session in local storage
- hydrate the session on client load
- gate ERP routes with `RequireAuth`
- redirect unauthenticated users to `/login`

## Public Frontend Routes

These URLs are current public interfaces and should be treated as stable unless explicitly changed:

- `/accounts`
- `/accounts/new`
- `/accounts/edit/[id]`
- `/journal-entries`
- `/bank-cash-accounts`
- `/bank-cash-transactions`
- `/bank-cash-transactions/receipts`
- `/bank-cash-transactions/payments`
- `/bank-cash-transactions/transfers`
- `/bank-reconciliations`
- `/sales-receivables`
- `/purchases`
- `/inventory`
- `/payroll`
- `/fixed-assets`
- `/reporting`
- `/general-ledger`
- `/fiscal`
- `/audit`
- `/master-data`
- `/login`
- `/register`

## Current Data Flow

### Request Path Example

The account list flow is:

```text
Browser
  -> /accounts
  -> app/(erp)/accounts/page.tsx
  -> AccountsPage in frontend/features/accounting/chart-of-accounts
  -> frontend/lib/api
  -> GET /accounts?parentId=[id]
  -> AccountsController
  -> AccountsService
  -> Prisma Account queries
  -> JSON array response
  -> drill-down navigation in the UI
```

### Posting Flow Example

The journal posting flow is:

```text
Browser
  -> /journal-entries
  -> create or post a journal entry
  -> POST /journal-entries/:id/post
  -> JournalEntriesController
  -> JournalEntriesService
  -> PostingService
  -> validation of entry status, balance, fiscal state, and account rules
  -> create PostingBatch
  -> create LedgerTransaction rows
  -> update Account.currentBalance
  -> mark JournalEntry as POSTED
```

Resulting accounting effect:

- journal lines become immutable posted history
- ledger history is created
- account balances are updated
- the audit trail remains reconstructable through posting artifacts

### Bank & Cash Account Flow

The bank/cash account flow is:

```text
Browser
  -> /bank-cash-accounts
  -> app/(erp)/bank-cash-accounts/page.tsx
  -> BankCashAccountsPage in frontend/features/phase-2-bank-cash-management/bank-cash-accounts
  -> frontend/lib/api
  -> GET/POST/PATCH /bank-cash-accounts
  -> BankCashAccountsController
  -> BankCashAccountsService
  -> Prisma BankCashAccount + Account + PaymentMethodType + LedgerTransaction queries
  -> JSON registry rows and posted transaction history for the linked account
```

Resulting accounting meaning:

- each payment-method record links to exactly one posting account in the chart of accounts
- the payment-method type list comes from active `PaymentMethodType` master data entries, so users can add new payment methods without code changes
- master data seeds `Bank` and `Cash` payment methods by default, and migrated environments also preserve distinct existing bank/cash types as `PaymentMethodType` rows
- the form can suggest and link the posting account while the user types either the bank reference field or the dedicated linked-account autocomplete, and both search by account code or account name
- account creation may include an opening balance; when it does, the user must also choose an offset posting account so Phase 1 can post a balanced opening entry
- once a posting account is chosen, the editor keeps that linked account visible and lets the user explicitly change it
- records typed as `Bank` still require bank-specific details, while other classes can use the optional detail fields as needed
- current balance is read from the linked posting account balance
- transaction history is derived from posted ledger rows for the linked posting account

### Bank & Cash Transaction Flow

The receipt, payment, and transfer flow is:

```text
Browser or API client
  -> POST /bank-cash-transactions/receipts|payments|transfers
  -> BankCashTransactionsController
  -> BankCashTransactionsService
  -> create a DRAFT BankCashTransaction
  -> POST /bank-cash-transactions/:id/post
  -> create a balanced JournalEntry through Phase 1 journal services
  -> post that journal entry through PostingService
  -> update BankCashTransaction to POSTED and link journalEntryId
```

Resulting accounting meaning:

- operational receipt, payment, and transfer records can be saved as drafts before they affect accounting
- posting creates normal journal entries and ledger rows instead of bypassing Phase 1 accounting rules
- selected bank/cash records must be active, and transfers require different source and destination accounts
- posted operational records are locked from editing and retain their generated journal-entry link

### Bank Reconciliation Flow

The reconciliation flow is:

```text
Browser
  -> /bank-reconciliations
  -> app/(erp)/bank-reconciliations/page.tsx
  -> BankReconciliationsPage in frontend/features/phase-2-bank-cash-management/bank-reconciliations
  -> frontend/lib/api
  -> GET/POST /bank-reconciliations and nested statement-line/match routes
  -> BankReconciliationsController
  -> BankReconciliationsService
  -> Prisma BankReconciliation + BankStatementLine + BankReconciliationMatch + LedgerTransaction queries
```

Resulting accounting meaning:

- reconciliation works against active bank/cash records and their linked posting accounts
- statement lines can be entered one by one or imported in bulk line form during a reconciliation session
- matching links statement lines to posted ledger transactions for the same linked account
- matched rows can be marked reconciled and retain timestamps for audit review
- unmatched statement lines and unmatched system transactions remain visible until the user resolves or accepts them

### Sales & Receivables Flow

The sales/receivables flow is:

```text
Browser or API client
  -> /sales-receivables/customers|quotations|sales-orders|invoices|receipts|credit-notes|receipt-allocations|reports/aging
  -> SalesReceivablesController
  -> SalesReceivablesService
  -> Prisma Customer + SalesQuotation + SalesOrder + SalesInvoice + CreditNote + ReceiptAllocation queries
  -> customer receipts call Phase 2 bank/cash transaction services and persist as posted receipt transactions linked back to the customer
  -> invoice and credit-note posting: create JournalEntry via Phase 1 services, then post through PostingService
```

Resulting accounting meaning:

- customer master records store payment terms, credit limits, tax information, sales representative assignment, and receivable account linkage
- sales quotations move through draft, approval, expiry, conversion, and cancellation states
- sales orders move through draft, confirmation, and invoicing traceability states before full invoicing
- sales invoices and credit notes can be drafted, then posted with generated journal entries
- invoices carry currency, due date, source quotation/order references, subtotal, discount, tax, and allocation-derived settlement status
- customer receipts can be initiated from Sales while still using the Phase 2 bank/cash transaction posting flow underneath
- posting updates customer running balance and links operational documents to journal references
- receipt allocation updates invoice outstanding/allocated status and prevents over-allocation
- aging report buckets outstanding posted invoice balances into current, 31-60, 61-90, and over-90 day buckets using due date when present

## Module Interaction Rules

Allowed dependency direction:

- all protected accounting modules may depend on auth guards
- accounting UI may call backend accounting APIs only through `frontend/lib/api`
- posting and reversal logic may depend on validation rules
- general ledger reads posted accounting data; it should not become the place where posting logic lives

Do not do the following:

- move accounting rules into route files
- put feature-specific UI into `components/ui`
- describe later ERP phases as implemented
- bypass posting by writing ledger data directly from unrelated code

## Design Principles For Future Edits

- Keep the system as a modular monolith.
- Keep accounting domain logic inside Phase 1 accounting modules.
- Keep route files thin and feature files thick.
- Keep Prisma as the only data access layer.
- Preserve the distinction between:
  - header accounts used for organization
  - posting accounts used for real transactions
