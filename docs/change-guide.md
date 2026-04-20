# Change Guide

## Summary

This guide explains where to edit the system for common Phase 1 changes and what must be checked before finishing the work.

## Add A New Accounting Screen

Where to edit:

- create the screen in `frontend/features/accounting/<feature>`
- keep the route entry in `frontend/app/(erp)/...`
- add shared UI only if it is truly reusable in `frontend/components/ui`

What else to check:

- route protection with `RequireAuth`
- API calls through `frontend/lib/api`
- whether the new screen belongs to an existing feature or a new Phase 1 subfeature
- if the screen grows beyond a simple page component, split feature-local `components/`, `types`, and `utils` inside the owning feature folder

Must remain compatible:

- current public URLs unless a route change is intentional
- route files stay thin

Checks to run:

- frontend typecheck
- frontend route render check in dev

## Add Or Change Bank/Cash Accounts

Where to edit:

- `frontend/features/phase-2-bank-cash-management/bank-cash-accounts`
- `frontend/app/(erp)/bank-cash-accounts/page.tsx`
- backend `phase-2-bank-cash-management/bank-cash-accounts`
- `backend/prisma/schema.prisma` and Prisma migration files if the registry shape changes

What else to check:

- linked account must be an active posting asset account
- payment-method type must match an active `PaymentMethodType` from Master Data
- the default payment-method set is `Bank` and `Cash`; additional methods are managed in Master Data rather than hard-coded in the bank/cash feature
- linked account must remain unique per bank/cash record
- account linking autocomplete may be driven either from the dedicated linked-account field or from the account-number/reference search suggestions, but both must resolve to the same posting account selection
- currency must match the linked chart-of-accounts account
- records typed as `Bank` require `bankName` and `accountNumber`; other types may leave those fields empty
- if an opening balance is provided, an offset posting account must also be selected so the system can post a balanced opening entry
- deactivated records must stay visible for history but blocked from edit and new selection
- history reads must come from posted ledger transactions, not drafts

Must remain compatible:

- `/bank-cash-accounts` route behavior unless intentionally changed
- current balance meaning from the linked posting account
- historical visibility after deactivation

Checks to run:

- backend tests
- backend build
- frontend typecheck
- Prisma generate and migration review

## Add Or Change Bank/Cash Transactions

Where to edit:

- backend `phase-2-bank-cash-management/bank-cash-transactions`
- `backend/prisma/schema.prisma` and Prisma migration files if transaction shape changes
- frontend Phase 2 transaction features and API wrappers when UI is added
- route files under `frontend/app/(erp)/bank-cash-transactions/...` should stay thin and compose the owning feature page

What else to check:

- receipts and payments must select an active bank/cash account and an active posting counter account
- transfers must select active, different source and destination bank/cash accounts
- transaction drafts must not update balances until posted
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and account balances remain consistent
- posted transactions must stay locked from edit and retain their journal-entry link
- deactivated bank/cash accounts must not be selectable for new receipts, payments, or transfers

Must remain compatible:

- existing `/bank-cash-accounts` route and registry behavior
- `/bank-cash-transactions/receipts`, `/bank-cash-transactions/payments`, and `/bank-cash-transactions/transfers` should keep their workflow intent unless intentionally changed
- Phase 1 journal-entry and posting invariants
- ledger history as the authoritative source for posted account activity

Checks to run:

- backend tests
- backend build
- Prisma generate and migration review

## Add Or Change Bank Reconciliation

Where to edit:

- backend `phase-2-bank-cash-management/bank-reconciliations`
- `backend/prisma/schema.prisma` and Prisma migration files if reconciliation data changes
- frontend `features/phase-2-bank-cash-management/bank-reconciliations`
- route files under `frontend/app/(erp)/bank-reconciliations`

What else to check:

- reconciliations must target active bank/cash records with active posting accounts behind them
- statement lines must allow manual entry and bulk import line entry
- matching must only use ledger rows from the linked posting account
- already reconciled ledger rows must not be offered again as new unmatched system transactions
- completing a reconciliation must not bypass match audit state
- unmatched statement lines and unmatched system transactions should stay visible during review

Must remain compatible:

- `/bank-reconciliations` route behavior unless intentionally changed
- linked-account ownership of bank/cash reconciliation history
- Phase 1 ledger meaning as the authoritative source of posted system transactions

Checks to run:

- Prisma generate and migration review
- backend tests
- backend build
- frontend typecheck

## Add Or Change Sales & Receivables

Where to edit:

- backend `phase-3-sales-receivables/sales-receivables`
- `backend/prisma/schema.prisma` and Prisma migration files if customer/quotation/order/invoice/receipt/note/allocation shape changes
- frontend `features/phase-3-sales-receivables`
- route files under `frontend/app/(erp)/sales-receivables`
- frontend API wrappers/types in `frontend/lib/api` and `frontend/types/api` when UI or integration code is added

What else to check:

- customer records must remain deactivatable without deleting history
- deactivated customers must not be selectable for new quotations, sales orders, invoices, receipts, or credit notes
- quotation drafts must stay editable until approved/cancelled, and approved quotations must preserve downstream traceability after conversion
- sales-order drafts must stay editable until confirmed, and confirmed orders must preserve quotation/invoice traceability
- invoice and credit-note drafts must stay editable, but posted documents must be locked
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and balances remain consistent
- sales invoices must derive due date from the supplied due date or the customer payment terms
- sales document references must remain unique across quotations, sales orders, invoices, receipts, and credit notes
- customer balance must increase on posted invoices and decrease on posted credit notes
- customer receipts created from Sales must still use the Phase 2 bank/cash posting behavior and remain allocatable to one or more invoices
- receipt allocations must allow partial and multi-receipt behavior while preventing over-allocation
- invoice outstanding/allocation status must stay consistent after postings and allocations
- aging buckets must be derived from posted outstanding balances as of the report date, using due date when available

Must remain compatible:

- Phase 1 journal-entry and posting invariants
- bank/cash transaction posting behavior used by receipt allocations
- stable API naming under `/sales-receivables/...`

Checks to run:

- Prisma generate and migration review
- backend build
- frontend typecheck

## Start Or Extend Phase 4 Purchases

Where to edit:

- backend `phase-4-procure-to-pay/purchases`
- frontend `features/phase-4-procure-to-pay`
- route files under `frontend/app/(erp)/purchases`
- `backend/prisma/schema.prisma` and Prisma migration files when supplier or purchase document data structures are added
- `docs/phase-4-purchases-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the purchases module split by subdomain ownership such as suppliers, requests, orders, invoices, payments, debit notes, posting/accounting, and validation/control
- route files must stay thin and compose the owning Phase 4 feature page
- posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- supplier payments that affect bank/cash must integrate with the existing Phase 2 bank/cash module rather than duplicating payment posting behavior
- Arabic and English terminology must stay aligned when new purchase workflows or statuses are added

Must remain compatible:

- current implemented phase boundaries
- docs must continue to distinguish between scaffolded architecture and implemented purchases behavior
- stable route naming under `/purchases` once specific Phase 4 screens are introduced

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Change Account Creation Behavior

Where to edit:

- `frontend/features/accounting/chart-of-accounts/create-account-form.tsx`
- chart-of-accounts frontend navigation if parent selection behavior changes
- backend chart-of-accounts service/controller if rules change

What else to check:

- required account type selection
- account subtype (class) selection is optional but must match an active `AccountSubtype` (managed under Master Data)
- header vs posting selection
- chart search must keep multiple filter tokens together when users combine `type:`, `status:`, and `is:` filters, including multiple tokens from the same filter family
- parent context passed from navigation or route params
- parent context must only come from header accounts, never from posting-account drilldown state
- next-code generation (it depends on `parentId` and whether the new account is Header vs Posting)
- account code must be generated on the backend during creation; `POST /accounts` does not accept a `code` field (extra fields are rejected by validation)
- account code remains hidden from manual editing in the create form
- posting accounts stay leaf nodes with no children
- child accounts are only attached to header accounts
- activation/manual-posting assumptions

Must remain compatible:

- chart-of-accounts API shapes
- existing account hierarchy behavior
- posting-account restrictions used by journal posting

Checks to run:

- frontend typecheck
- backend build
- account service tests
- apply the Prisma migration so the PostgreSQL leaf-node trigger is installed
  
If your environment already contains older numeric charts that used **6-digit** numeric codes, run the one-time migration:

- `backend`: `npm run prisma:migrate:account-codes:6-to-7`

## Add Or Change Account Deletion Behavior

Where to edit:

- `frontend/features/accounting/chart-of-accounts`
- backend `phase-1-accounting-foundation/accounting-core/chart-of-accounts`

What else to check:

- accounts referenced by journal entry lines must stay non-deletable
- accounts with posted ledger rows must stay non-deletable
- the chart table should hide the delete action when the account is not deletable, not just fail after click
- deletion errors should stay user-readable because the chart UI surfaces backend validation messages directly

Must remain compatible:

- chart-of-accounts route behavior
- auditability of posted history and journal-entry references

Checks to run:

- backend account service tests
- backend build
- frontend typecheck

## Update Posting Rules

Where to edit:

- `posting-logic`
- `validation-rules`
- `journal-entries` if the posting trigger or status rules change

What else to check:

- debit/credit balance validation
- account eligibility for posting
- header-account rejection both when saving drafts and when posting existing drafts
- fiscal period state
- account balance updates
- ledger row creation

Must remain compatible:

- posted entries stay auditable
- posting remains transactional
- ledger history remains consistent with balances

Checks to run:

- backend tests
- backend build
- manual verification of a create -> post -> ledger flow

## Add Or Change A General-Ledger Filter

Where to edit:

- frontend general-ledger feature
- general-ledger controller/service
- DTOs if a new query parameter is introduced

What else to check:

- account selection behavior
- date range behavior
- opening/running balance logic
- whether the filter applies to posted history only

Must remain compatible:

- existing endpoint behavior for old clients
- ledger data meaning

Checks to run:

- frontend typecheck
- backend tests affecting general ledger

## Add A Validation Rule

Where to edit:

- `validation-rules` if the rule is cross-cutting
- otherwise the owning submodule service

What else to check:

- whether the rule belongs at:
  - request validation
  - business validation
  - posting-time validation
- whether the rule should block draft save, posting, or both

Must remain compatible:

- error semantics used by current UI
- module boundaries

Checks to run:

- backend build
- backend tests
- add a targeted test for the new rule

## Add A New API Endpoint

Where to edit:

- the owning Phase 1 module controller
- DTOs if input/output shapes are needed
- service layer in the same module
- frontend API wrapper if the UI will call it

What else to check:

- auth guard usage
- ownership of the endpoint
- whether it belongs to an existing controller or should stay internal
- properly scoping database queries to the user's `companyId` for multi-tenancy isolation

Must remain compatible:

- existing module boundaries
- route naming conventions already used in the project
- prefer lightweight list/query modes for selector or overview UIs when a screen does not need full nested relations or line-level details

Checks to run:

- backend build
- backend tests
- frontend typecheck if consumed by UI

## Add Or Change Journal Entry Types

Where to edit:

- backend master-data module under `accounting-core/master-data`
- `frontend/features/accounting/master-data/master-data-page.tsx` (admin UI)
- `frontend/features/accounting/journal-entries/journal-entries-page.tsx` (selecting a type during entry creation)

What else to check:

- journal entry creation/update must reject unknown or inactive types
- types are reference/master data and should be deactivated (not deleted) when no longer in use

## Before Finishing Any Phase 1 Change

Review these questions:

- does the code live in the correct frontend/backend module
- did the change preserve header vs posting semantics
- did the change preserve posting and reversal auditability
- does the change describe a current Phase 1 capability instead of a future ERP phase
- do the docs still match the code after the edit
