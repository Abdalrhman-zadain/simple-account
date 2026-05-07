# Known Issues

## Purpose

This file tracks current engineering limitations that matter when editing the system. These are not architectural intentions.

## Frontend Production Build

Previously identified issue (Resolved/Intermittent):

- `frontend` production build occasionally failed after compile and typecheck with:
  - `Next.js build worker exited with code: 1 and signal: null`

Current Status:

- The build currently succeeds (`npm run build`) in the engineering environment.
- normal TypeScript checking and typecheck passes.
- the issue is documented here for reference if it reappears during heavy CI loads or environment changes.
- performance verification must run from `frontend/` against the production Next server (`npm run build && npm run start`), not against dev mode or another package/toolchain in the repo
- the frontend shell now mirrors the language preference into a cookie so server rendering can keep `lang`/`dir` aligned with the persisted setting and avoid avoidable LTR/RTL layout shift on reloads
- local fonts should stay compressed (`.woff2`) in `frontend/app/fonts`; shipping raw `.ttf` assets materially increases first-load transfer size
- the frontend npm scripts route Next through `frontend/scripts/next-run.mjs`, which clears stale `.next` artifacts before `dev` and `build` so OneDrive-backed reparse-point files do not break Next startup while staying runnable on Linux and Windows

What this means for future edits:

- if a change touches app-router behavior, route wrappers, auth gating, or page composition, re-verify the production build to ensure the fix remains stable.
- if a change touches language initialization, shell layout, or global font wiring, re-run Lighthouse against the production server to catch regressions in request weight or CLS.
- if the failure recurs, document the specific triggers or environment details here.
- if frontend script changes bypass `next-run.mjs`, re-verify that stale `.next` artifacts are not the cause before assuming dev/build failures come from application code

## Documentation Warning

If code and docs drift:

- trust the code first
- update docs immediately after confirming behavior
- do not keep outdated architecture descriptions in `docs/`

## Local Docker Port Reservation On Windows

Current limitation:

- some Windows environments reserve dynamic TCP ranges that can block Docker from binding specific localhost ports even when the compose file is correct.
- the previous local PostgreSQL host port `55432` can fall inside an excluded Windows TCP range, which causes Docker startup failures such as `bind: An attempt was made to access a socket in a way forbidden by its access permissions.`
- the project now uses local host port `15432` for PostgreSQL to avoid the reserved range seen on affected machines.

What this means for future edits:

- keep `docker-compose.yml`, `backend/.env`, and `backend/.env.example` aligned if the local PostgreSQL host port changes again.
- if Docker reports a bind-permission error on startup, check `netsh int ipv4 show excludedportrange protocol=tcp` before assuming PostgreSQL or Prisma is misconfigured.

## Phase 2 Bank & Cash Scope

Current limitation:

- supplier master records are not implemented yet, so payment transactions still rely on `counterpartyName` rather than a relational supplier link.
- customer-linked receipt transactions are now supported for Sales & Receivables flows, but the generic Phase 2 payment/receipt UI still primarily exposes `counterpartyName`.
- reconciliation statement import currently uses structured line entry and bulk line import inside the app/API; bank-specific file parser formats are not implemented yet.

What this means for future edits:

- add supplier relations only after the owning supplier module or master records exist
- keep reconciliation as a separate Phase 2 submodule instead of mixing statement matching into the receipt/payment/transfer transaction service

## Phase 3 Sales UI Coverage

Current limitation:

- the main `/sales-receivables` page now exposes customers, quotations, sales orders, invoices, receipts, credit notes, receipt allocation, and aging in one workspace. Customer and sales-invoice list print/PDF/Excel output is available through the shared frontend export engine, but formal single-document outputs and customer statement output are still not implemented.
- printable quote/order/invoice outputs and customer statement output are still not implemented.
- sales invoice posting still uses the legacy sales tax/VAT liability-account lookup for journal posting; document entry can now select a `Tax` master record and store `taxId`, but posting has not yet been fully refactored to post each line against that tax record's mapped account.

What this means for future edits:

- keep new Phase 3 changes inside `frontend/features/phase-3-sales-receivables` and preserve Arabic/English translation coverage when adding more document actions.
- add formal document print/export and statement-generation workflows only when their backend routes and output formats are intentionally designed.

## Phase 4 Purchases Status

Current limitation:

- supplier masters, purchase requests, purchase-order maintenance, purchase invoices, supplier payments, and debit notes are now implemented end-to-end for their current draft/post/cancel slices, including journal posting for purchase invoices and debit notes.
- supplier and purchase-invoice list print/PDF/Excel output is available through the shared frontend export engine, while formal purchase document templates remain a separate future refinement.
- purchase orders now support draft/issue/receipt/cancel/close lifecycle management and now store operational purchase-receipt records, but they still do not create inventory or accounting journal entries from receipt posting.
- purchase invoices, supplier payments, and debit notes now provide explicit reverse-document workflows that create reversal journal entries and mark the source documents as `REVERSED`.
- the purchase debit-note editor currently captures supplier discount notes without a tax field and submits tax as zero; tax-bearing debit notes still depend on configured purchase tax/VAT posting accounts at the backend level.
- purchase invoice posting no longer requires a dedicated purchase tax/VAT account; line tax amounts are posted with the line debit accounts instead of a separate tax line. Purchase document entry can now store `taxId`, but posting has not yet been fully refactored to use each tax record's mapped account.
- purchase transaction audit history now includes reversed purchase invoices, supplier payments, and debit notes, but purchase receipts still do not yet have their own reversal flow.

What this means for future edits:

- keep new purchases code inside `backend/src/modules/phase-4-procure-to-pay/purchases` and `frontend/features/phase-4-procure-to-pay`
- preserve Arabic/English translation coverage when adding purchase statuses, document labels, and workflow actions
- do not document non-implemented purchase workflows as implemented until the actual routes, data model, and posting behavior exist
- treat purchase receipt accounting/inventory impact and receipt reversal as separate future slices; they are not implemented yet

## Phase 5 Inventory Status

Current limitation:

- item master, warehouses, goods receipts, goods issues, transfers, adjustments, stock-ledger inquiry, warehouse balances, and costing/accounting integration are implemented; posted inventory documents now support reverse status workflows, but reverse currently marks status/audit history only and does not yet create stock-rollback or accounting-reversal entries.
- inventory master data now includes item groups, item categories, units of measure, and enforced group/category/material selection in the item card UI/API.
- `docs/phase-5-inventory-requirements.md` remains the planning/reference document for the full inventory roadmap and translation alignment.
- inventory accounting entries are conditional and only run when `INVENTORY_ACCOUNTING_ENABLED` is enabled.
- prevent-negative-stock behavior is policy-driven and follows `INVENTORY_PREVENT_NEGATIVE_STOCK` (defaults to enabled).
- inventory valuation method is now organization-configurable via `GET/PATCH /inventory/policy` and falls back to `INVENTORY_COSTING_METHOD` only when no policy row exists.
- on some Windows environments, `npm run prisma:generate` may still end with EPERM rename on `query_engine-windows.dll.node` after updating generated artifacts.

What this means for future edits:

- keep future inventory code inside the dedicated Phase 5 ownership roots rather than mixing it into purchases, sales, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding inventory statuses, movement labels, warehouse terminology, and costing method names.
- document inventory policy behavior (`/inventory/policy` plus `INVENTORY_COSTING_METHOD` fallback) and policy toggles (`INVENTORY_PREVENT_NEGATIVE_STOCK`, `INVENTORY_ACCOUNTING_ENABLED`) whenever behavior changes.

## Phase 6 Payroll Status

Current status:

- Phase 6 Payroll is implemented for employee masters, payroll groups, component setup, employee/group component assignment, payroll rules, payroll periods, payslip generation/editing, payroll period posting/reversal, posted-payslip adjustment, salary payment allocation/settlement/reversal through Bank & Cash, and summary inquiry.
- Formula-based payroll calculations are implemented with a constrained arithmetic evaluator using payroll variables such as `amount`, `base`, `percentage`, `quantity`, `grossPay`, `totalDeductions`, `employerContributions`, and `netPay`.
- Installment-based deductions are represented on component assignments through tracked installment amounts and outstanding balances.
- The `/payroll` frontend exposes group setup, rule setup, employee/component assignment, period processing, payslip adjustment, batch payment allocation capture, payment posting/cancellation/reversal, period reversal, and summary inquiry.

What this means for future edits:

- keep future payroll code inside dedicated Phase 6 ownership roots rather than mixing payroll behavior into purchases, sales, bank/cash, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding payroll components, employee/payment terminology, payslip labels, statuses, and reporting filters.
- treat future payroll extensions as refinements to this implemented module rather than as unimplemented Phase 6 basics.

## Phase 7 Fixed Assets Status

Current status:

- Phase 7 Fixed Assets is implemented for category setup, fixed-asset register maintenance/editing, acquisition capture/posting/reversal, depreciation run capture/posting/reversal, disposal capture/posting/reversal, transfer capture/posting/reversal, asset-level depreciation schedule/history inquiry, and summary inquiry.
- Asset categories store default depreciation assumptions and posting-account references used to seed fixed-asset masters and lifecycle documents.
- The `/fixed-assets` frontend exposes category setup, asset register, asset editing/deactivation, acquisition, depreciation, disposal, transfer, audit history, and summary workflows with Arabic/English translation coverage.

What this means for future edits:

- keep future fixed-asset code inside dedicated Phase 7 ownership roots rather than mixing asset lifecycle behavior into purchases, inventory, bank/cash, or Phase 1 accounting modules.
- preserve Arabic/English translation coverage when adding fixed-asset statuses, depreciation methods, disposal terminology, document labels, and reporting filters.
- treat future fixed-asset extensions as refinements to this implemented module rather than as unimplemented Phase 7 basics.

## Phase 8 Reporting Status

Current status:

- Phase 8 Reporting is implemented as a bilingual workspace at `/reporting` with saved definitions, snapshots, export controls, and activity visibility in addition to the core financial inquiries.
- The current slice includes summary inquiry, trial balance, balance sheet, profit and loss, classified cash flow reporting, general ledger inquiry, audit inquiry, comparison-period filters, reusable saved definitions, persisted snapshots, snapshot locking/versioning, native XLSX/PDF/print export output generation, and reporting activity logging.
- The current implementation derives report values from posted ledger, bank/cash, account, and audit data and persists reporting controls in Phase 8-owned runtime tables.

Current limitation:

- reporting control persistence is created at runtime by the reporting service and is not yet modeled through a generated Prisma delegate workflow.
- reporting persistence bootstrap is serialized inside the reporting service to avoid PostgreSQL duplicate-type races when multiple reporting requests hit the runtime table initializer at the same time.
- exported document layouts are functionally complete for the baseline requirements, but the PDF/XLSX output remains intentionally minimal rather than visually polished.
- cash-flow classification currently uses posted counter-account heuristics from the journal entry to split operating, investing, financing, and unclassified movement.

What this means for future edits:

- keep new reporting code inside `backend/src/modules/phase-8-reporting-control/reporting` and `frontend/features/phase-8-reporting-control`.
- preserve Arabic/English translation coverage when adding report names, filters, actions, column labels, and comparison/snapshot terminology.
- do not document the remaining Phase 8 roadmap items as implemented until the actual routes, data structures, and output behavior exist.
