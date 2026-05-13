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

## Add Print Or Export To A List Screen

Where to edit:

- keep the feature-specific row mapping in the owning `frontend/features/...` page or feature utility
- use `frontend/components/ui/export-actions.tsx` for the shared Print/PDF/Excel controls
- use `frontend/lib/export-print.ts` for output generation

What else to check:

- exported columns must use user-facing Arabic labels, not raw API keys
- filters should be summarized as text metadata above the output instead of exporting input controls
- rows should represent all records matching the current filters; if a list later uses server pagination, add or reuse an API read that fetches the full filtered result set before exporting
- do not print the full page DOM, navigation, buttons, tabs, pagination, or action menus
- include totals when the list has meaningful accounting totals
- keep permissions pluggable through `canPrint`, `canExportPdf`, and `canExportExcel`

Checks to run:

- frontend typecheck
- manual smoke test for print preview and Excel download on at least one RTL list

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
- the create/edit form should let the user select the linked posting account from the dedicated linked-account autocomplete only, but may also create a new eligible linked account inline from that control
- inline linked-account creation must stay inside the seeded `Cash and Cash Equivalents` asset subtree
- inline linked-account creation must support both:
  - creating a new header under `Cash and Cash Equivalents` and then a posting child under that new header
  - creating a posting child under any existing header within the `Cash and Cash Equivalents` subtree
- the stored bank/cash `accountNumber`/reference should be generated from the linked chart-of-accounts code rather than typed manually in the form
- currency must match the linked chart-of-accounts account
- records typed as `Bank` require `bankName`; the system derives the reference/account number from the linked chart-of-accounts code
- if an opening balance is provided, an offset posting account must also be selected so the system can post a balanced opening entry
- opening-balance offset account choices in the bank/cash create form should be limited to active posting `EQUITY` accounts
- the bank/cash create form should default the opening-balance offset account to `3410001 Opening Balance Equity` when that posting equity account is available in the chart of accounts
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
- the primary frontend workspace now lives under `frontend/app/(erp)/bank-cash-accounts/page.tsx`; legacy route files under `frontend/app/(erp)/bank-cash-transactions/...` should stay thin and only redirect into the unified bank/cash workspace

What else to check:

- receipts and payments must select an active bank/cash account and an active posting counter account
- transfers must select active, different source and destination bank/cash accounts
- receipt, payment, and transfer references should be treated as system-generated identifiers in the Phase 2 transaction UI rather than user-entered fields
- transaction drafts must not update balances until posted
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and account balances remain consistent
- posted transactions must stay locked from edit and retain their journal-entry link
- deactivated bank/cash accounts must not be selectable for new receipts, payments, or transfers

Must remain compatible:

- existing `/bank-cash-accounts` route and registry behavior
- `/bank-cash-transactions/receipts`, `/bank-cash-transactions/payments`, and `/bank-cash-transactions/transfers` should keep redirect compatibility into the unified `/bank-cash-accounts` workspace unless intentionally changed
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

- sales document tax choices should come from active `Tax` master data (`GET /taxes/active`) rather than manual free-text or arbitrary tax values
- tax setup now has two layers: `Tax` stays the master for actual codes/rates/accounts, while `TaxTreatment` stores customer-facing business treatment defaults and may optionally point to a default tax code
- sales document lines should persist both `taxId` and the calculated `taxAmount` so historical documents remain readable if a tax is later deactivated
- customer records must remain deactivatable without deleting history
- customer creation supports either creating a new posting receivable account automatically under `1121000 Customer Receivables / ذمم عملاء` or linking an existing active posting Asset account from that same subtree
- customer sales-rep assignment should use optional `salesRepId` to an active Sales & Receivables `SalesRepresentative` for follow-up, reports, commissions, and collections; never substitute the representative's employee-payables account for the customer receivable account
- sales representative account linking may create a new posting liability account under `2130000 Employee Payables / ذمم الموظفين`, link an existing active posting account from that subtree, or leave the representative without an account; this link remains employee-side context only
- customer names should remain unique, and automatic customer-receivable account creation must not create a second detail account with the same customer name under `1121000`
- customer creation and editing must require an active `TaxTreatment`; the old free-text tax-information field is no longer the authoritative sales tax selector
- deactivated customers must not be selectable for new quotations, sales orders, invoices, receipts, or credit notes
- quotation drafts must stay editable until approved/cancelled, and approved quotations must preserve downstream traceability after conversion
- sales quotation lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, and must still keep `itemName`, `description`, and `revenueAccountId` snapshot context so commercial history and print displays do not depend on future item-master edits
- sales-order lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, and must still keep `itemName`, `description`, and resolved revenue-account context so downstream invoice conversion keeps commercial traceability even if the item master changes later
- sales-invoice lines may now optionally link to active inventory items for UI-assisted item/service selection, must persist the linked `itemId`, and must still keep `itemName`, `description`, and resolved revenue-account context so posted commercial history stays readable even if the item master changes later
- selecting or changing an invoice customer should offer to re-apply the customer's tax-treatment default across existing draft invoice lines, and newly added lines should inherit that same default tax automatically
- converting an approved quotation or sales order into an invoice should prefill the invoice editor, let the user choose revenue accounts per line, and only call the convert API when the draft is saved
- the quotation editor supports both `save draft` and immediate `approve quotation` from the same form; when approving a brand-new quotation, the UI should save first and then approve the created draft in the same flow
- sales-order drafts must stay editable until confirmed, and confirmed orders must preserve quotation/invoice traceability
- invoice and credit-note drafts must stay editable, but posted documents must be locked
- posting must create a journal entry and use Phase 1 posting logic so ledger rows and balances remain consistent
- sales invoice, receipt, and credit-note accounting must continue to use the customer's linked receivable account, not `salesRepId` or employee payable/receivable accounts
- sales invoices must derive due date from the supplied due date or the customer payment terms
- sales document references must remain unique across quotations, sales orders, invoices, receipts, and credit notes
- customer balance must increase on posted invoices and decrease on posted credit notes
- customer receipts created from Sales must still use the Phase 2 bank/cash posting behavior and remain allocatable to one or more invoices
- sales-invoice posting must debit the customer's receivable account for the invoice grand total, credit one or more revenue accounts from the invoice lines for the net subtotal, and credit the mapped tax account for any applied tax amount
- sales-invoice posting must reject draft documents that are missing customer/date/currency/lines, any line revenue account, a required tax account, or a balanced posting result
- the Sales Invoice form may offer a guided `Post & Create Receipt` action that still posts the invoice first, then opens a separate prefilled customer-receipt flow; do not merge the receipt posting into the invoice journal entry
- the Sales Invoice form should keep `Save as Draft`, `Post Invoice`, and `Post & Create Receipt` as distinct actions: draft save creates no journal entry, normal post creates only the invoice journal entry, and the guided action posts the invoice first before opening the separate receipt flow
- the Sales receipt UI may collect optional invoice-allocation input inside the same customer-receipt form instead of a separate workspace, but it must still create/post the receipt first and then run allocation without changing posting invariants
- customer-receipt posting must create a separate journal entry that debits the selected bank/cash posting account and credits the customer's receivable account for the receipt amount; receipts must never create tax lines or merge directly into invoice revenue posting
- receipt allocations must allow partial and multi-receipt behavior while preventing over-allocation
- invoice outstanding/allocation status must stay consistent after postings and allocations
- receipt creation from the guided sales flow must require an active bank/cash account, must not allocate above invoice outstanding, and should preserve audit/history links between the receipt and invoice
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

- purchase document tax choices should come from active `Tax` master data (`GET /taxes/active`) rather than manual free-text or arbitrary tax values
- purchase document lines should persist both `taxId` and the calculated `taxAmount` so historical documents remain readable if a tax is later deactivated
- keep the purchases module split by subdomain ownership such as suppliers, requests, orders, invoices, payments, debit notes, posting/accounting, and validation/control
- route files must stay thin and compose the owning Phase 4 feature page
- supplier creation should support either creating a new posting payable account automatically under `2110000 Accounts Payable / الذمم الدائنة` or linking an existing active posting Liability account from that same subtree
- purchase-request and purchase-order lines may now optionally link to active inventory items for UI-assisted selection, and `itemName` plus line description must remain persisted on the line so operational history does not depend on future item-master edits
- purchase-request list actions should stay inside the table `الإجراءات` column, while request review, approval, rejection, and conversion actions belong on the dedicated `/purchases/requests/[id]` details page
- purchase-order list `عرض` actions may open the dedicated `/purchases/orders/[id]` details page so users can review summary, lines, and receipt history without overloading the workspace list
- purchase-request references now follow the daily sequence format `PR-YYYYMMDD-N`; new logic must ignore legacy random codes when calculating the next daily number
- request conversion rules must keep source traceability into downstream purchase orders and draft purchase invoices, and only approved requests may be converted
- request status history should retain both timestamp and acting user when workflow actions are recorded
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

## Add Or Change Phase 5 Inventory Master Data

Where to edit:

- backend `phase-5-inventory-management/inventory/item-groups`
- backend `phase-5-inventory-management/inventory/item-categories`
- backend `phase-5-inventory-management/inventory/units-of-measure`
- backend `phase-5-inventory-management/inventory/item-master` when the material/card relationship changes
- frontend `features/phase-5-inventory-management/inventory`
- `backend/prisma/schema.prisma` and migrations when master-data relationships change
- `docs/phase-5-inventory-requirements.md` when the requirement baseline or terminology changes

What else to check:

- item categories must belong to one active item group at creation time
- material/item cards must select an active item group, an active category under that group, and an active base unit of measure
- changing an item group in the UI should clear or revalidate the selected category
- item/service codes must be generated only by the backend on create using the `ITM-000001` format, with prefix `ITM`, six zero-padded digits, no date/random suffixes, and one global sequence shared across all item and service types
- keep Arabic labels distinct: `مجموعة الأصناف`, `فئة الصنف / التصنيف`, `بطاقة المادة`, and `وحدة القياس`
- item-card pricing fields are suggestion/default values only; they must not be treated as inventory valuation or actual stock cost
- item-card unit conversion setup must always keep the base-unit row with factor `1`, block duplicate units, and keep conversion factors visible in the owning form/UI
- unit and item barcodes must remain unique across both the item master barcode field and per-unit conversion rows
- deactivation must preserve historical item and inventory transaction references
- legacy `unitOfMeasure` and `category` item fields are compatibility/display mirrors; relational IDs own validation

Checks to run:

- Prisma generate and migration review
- backend build
- frontend typecheck

## Start Or Extend Phase 5 Inventory

Where to edit:

- backend `phase-5-inventory-management/inventory` once the module is introduced
- frontend `features/phase-5-inventory-management`
- route files under `frontend/app/(erp)/inventory`
- `backend/prisma/schema.prisma` and Prisma migration files when inventory, warehouse, costing, or stock-ledger structures are introduced
- `docs/phase-5-inventory-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the inventory module split by subdomain ownership such as item master, warehouses, goods receipts, issues, transfers, adjustments, costing, inquiry, posting/accounting, and validation/control
- inventory list reads (`/inventory/items`, `/inventory/goods-receipts`, `/inventory/goods-issues`, `/inventory/transfers`, `/inventory/adjustments`, `/inventory/stock-ledger`) should use `page`/`limit` and keep frontend pagination state/controls in the owning Phase 5 feature page
- item records that point to a preferred warehouse should reference the Phase 5 warehouse master slice instead of introducing parallel free-text warehouse registries
- item barcode values must remain unique across all inventory items; use the dedicated item-master workflow for manual entry, scanner entry, or internal barcode generation
- QR data for item cards should be stored as text/value only and generated from item master fields in the owning Phase 5 UI/workflow; preview images should remain derived UI output rather than database content
- barcode/QR additions must stay operational only and must not create Phase 1 journal entries or other accounting postings
- route files must stay thin and compose the owning Phase 5 feature page
- valuation method changes should flow through `GET/PATCH /inventory/policy`; use `INVENTORY_COSTING_METHOD` only as fallback bootstrap/default behavior
- stock movement posting must reuse Phase 1 journal-entry and posting services whenever accounting integration is enabled instead of writing ledger effects directly
- inventory receipts that depend on purchases should integrate with the existing Phase 4 purchases flow rather than duplicating purchase receipt ownership
- goods receipts should stay draft-editable until posting or cancellation and should remain the primary inbound stock slice for purchase-linked intake
- goods issues should stay draft-editable until posting or cancellation, and posting should block when the requested quantity exceeds available stock
- transfers should stay draft-editable until posting or cancellation, and posting should validate active, different source/destination warehouses plus source-warehouse availability and warehouse-balance movement history
- adjustments should stay draft-editable until posting or cancellation, and posting should support positive/negative variance while enforcing the configured prevent-negative-stock policy
- posted inventory documents should use reverse status actions instead of direct edits so audit history keeps draft/post/cancel/reverse transitions
- costing behavior should remain configurable between weighted-average and FIFO, and outbound valuation should write matching movement/value effects
- receipt/issue/adjustment posting should create and post journal entries only when inventory accounting integration is enabled
- Arabic and English terminology must stay aligned when adding inventory document labels, statuses, and movement types

Must remain compatible:

- current implemented phase boundaries
- docs must continue to distinguish between planned Phase 5 inventory scope and implemented system behavior
- stable route naming under `/inventory` once specific Phase 5 screens are introduced

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 6 Payroll

Where to edit:

- backend `phase-6-payroll-management/payroll`
- frontend `features/phase-6-payroll-management`
- route files under `frontend/app/(erp)/payroll`
- `backend/prisma/schema.prisma` and Prisma migration files when payroll, employee, payslip, payment, deduction, or payroll-period data structures are added
- `docs/phase-6-payroll-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the payroll module split by subdomain ownership such as employees, payroll setup, payroll periods, payslips, deductions, benefits/allowances, posting/accounting, payments, reporting/inquiry, and validation/control
- route files must stay thin and compose the owning Phase 6 feature page
- payroll components must link to valid posting accounts in Phase 1 instead of creating parallel accounting ledgers
- payroll posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- payroll payments that move cash must integrate with the existing Phase 2 bank/cash module rather than duplicating payment posting behavior
- posted payroll periods, payslips, and payment settlements must preserve auditable links between employee records, payroll periods, source payslips, and generated journal entries
- deactivated employees must remain historically reportable but blocked from new payroll periods, payslips, and payment selection
- Arabic and English terminology must stay aligned when adding payroll components, statuses, document labels, and reporting terminology

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between implemented payroll behavior and any remaining planned payroll extensions
- stable route naming under `/payroll`
- Phase 1 journal-entry and posting invariants
- Phase 2 bank/cash payment posting behavior when payroll settlements move through bank or cash accounts

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 7 Fixed Assets

Where to edit:

- backend `phase-7-fixed-assets-management/fixed-assets`
- frontend `features/phase-7-fixed-assets-management`
- route files under `frontend/app/(erp)/fixed-assets`
- `backend/prisma/schema.prisma` and Prisma migration files when fixed-asset register, category, acquisition, depreciation, disposal, or transfer data structures are added
- `docs/phase-7-fixed-assets-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the fixed-assets module split by subdomain ownership such as asset register, categories, acquisition, depreciation, disposal, transfer, posting/accounting, reporting/inquiry, and validation/control
- route files must stay thin and compose the owning Phase 7 feature page
- asset categories and assets must link to valid capitalization, accumulated depreciation, depreciation expense, disposal, and gain/loss accounts in Phase 1 instead of introducing parallel ledgers
- acquisition, depreciation, and disposal posting must reuse Phase 1 journal-entry and posting services instead of writing ledger effects directly
- posted asset lifecycle transactions must preserve auditable links between source fixed-asset documents, assets, generated journal entries, and audit-log history
- inactive or fully disposed assets must remain historically reportable but blocked from new draft lifecycle transactions where business rules require it
- Arabic and English terminology must stay aligned when adding fixed-asset statuses, methods, document labels, and reporting terminology

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between implemented fixed-asset behavior and any remaining planned Phase 7 extensions
- stable route naming under `/fixed-assets`
- Phase 1 journal-entry and posting invariants
- depreciation/disposal calculations must stay consistent with stored asset cost, residual value, useful life, accumulated depreciation, and net book value assumptions

Checks to run:

- backend build
- frontend typecheck
- Prisma generate and migration review when schema changes are introduced

## Start Or Extend Phase 8 Reporting

Where to edit:

- backend `phase-8-reporting-control/reporting`
- frontend `features/phase-8-reporting-control`
- route files under `frontend/app/(erp)/reporting`
- `docs/phase-8-reporting-requirements.md` when requirements are clarified, split, or translated

What else to check:

- keep the reporting module split by ownership such as filters/definitions, financial statements, ledger inquiry, audit inquiry, comparison logic, and validation/control
- route files must stay thin and compose the owning Phase 8 feature page
- official financial reports must use posted data only and must not read draft journals or draft operational documents as report balances
- reporting empty states should distinguish between genuine no-data conditions and API/load failures so users are not shown an "empty" message when the report request actually failed
- trial balance, balance sheet, profit and loss, and general-ledger inquiry should stay reconcilable to the same posted ledger source for the same filters/period
- cash movement reporting should continue to derive from the linked bank/cash posting accounts rather than inventing a parallel balance store
- Arabic and English terminology must stay aligned when adding report names, column labels, filters, export labels, and drill-down actions

Must remain compatible:

- current implemented phase boundaries
- docs must distinguish between the implemented initial reporting workspace and the remaining Phase 8 roadmap
- stable route naming under `/reporting`
- Phase 1 ledger and posting invariants as the reporting source of truth

Checks to run:

- backend TypeScript build
- frontend typecheck
- frontend production build when the environment supports the current Next.js script/tooling

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
