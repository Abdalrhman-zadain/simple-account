# Project Structure

## Summary

This project is organized around **ownership**. Every new edit should go to the layer and module that owns the behavior.

## Repository Map

```text
project-root/
├── docs/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   └── (erp)/
│   ├── features/
│   │   ├── auth/
│   │   ├── accounting/
│   │   └── phase-2-bank-cash-management/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   ├── api/
│   │   ├── config/
│   │   └── utils/
│   └── providers/
└── backend/
    ├── prisma/
    └── src/
        ├── common/
        └── modules/
            ├── platform/
            │   └── auth/
            └── phase-1-accounting-foundation/
                └── accounting-core/
            └── phase-2-bank-cash-management/
                └── bank-cash-accounts/
```

## Frontend Ownership

### `frontend/app`

Purpose:

- route entrypoints
- route grouping
- page composition
- layout composition

What belongs here:

- `page.tsx`
- route-group `layout.tsx`
- thin wrappers around auth, shell, and feature screens

What does not belong here:

- large feature UIs
- business form logic
- accounting-specific data-fetching logic

### `frontend/features`

Purpose:

- feature-owned screens
- business-specific UI
- accounting page logic
- feature-level state and behavior

Current feature areas:

- `features/auth`
- `features/accounting/chart-of-accounts`
- `features/accounting/journal-entries`
- `features/accounting/general-ledger`
- `features/accounting/fiscal`
- `features/accounting/audit`
- `features/accounting/master-data`
- `features/phase-2-bank-cash-management/bank-cash-accounts`
- `features/phase-2-bank-cash-management/bank-cash-transactions`
- `features/phase-3-sales-receivables`
- `features/phase-4-procure-to-pay`
- `features/phase-5-inventory-management`
- `features/phase-6-payroll-management`
- `features/phase-8-reporting-control`

Put code here when:

- the UI belongs to one business feature
- the component is not reusable across unrelated features
- the logic depends on accounting or auth behavior

For larger features, prefer an internal module layout so ownership is easy to scan:

- `<feature>/<feature>-page.tsx` for orchestration
- `<feature>/components/` for feature-owned UI sections
- `<feature>/<feature>.types.ts` for feature-local types
- `<feature>/<feature>.utils.ts` for feature-local helpers

### `frontend/components/ui`

Purpose:

- shared visual primitives
- design-system-like wrappers
- reusable layout pieces

Examples:

- `Button`
- `Card`
- `StatusPill`
- `PageShell`
- shared typography and language-sensitive presentation rules in `app/globals.css` plus reusable form/control primitives in `components/ui`

Do not put these here:

- chart-of-accounts tables
- journal-entry forms
- master-data business controls

### `frontend/lib`

Purpose:

- shared infrastructure utilities
- API wrappers
- configuration helpers
- generic formatting helpers

Meaning of subfolders:

- `lib/api`: backend API calls
- `lib/config`: environment-driven config
- `lib/utils`: shared utility functions

## Backend Ownership

### `backend/src/common`

Purpose:

- cross-cutting shared infrastructure
- framework-level shared services
- utilities not owned by one business module

Current important example:

- Prisma wiring

Put code here only when it is truly shared across modules.

### `backend/src/modules/platform`

Purpose:

- platform capabilities not owned by one business domain

Current implemented module:

- `platform/auth`

Auth owns:

- registration
- login
- JWT strategy
- auth DTOs
- auth guards

### `backend/src/modules/phase-1-accounting-foundation`

Purpose:

- all implemented accounting foundation behavior

Current root:

- `accounting-core`

Inside `accounting-core`, each folder owns one accounting concern:

- `chart-of-accounts`
- `journal-entries`
- `posting-logic`
- `general-ledger`
- `reversal-control`
- `validation-rules`
- `fiscal`
- `audit`
- `master-data`

### `backend/src/modules/phase-2-bank-cash-management`

Purpose:

- implemented Phase 2 operational bank/cash account management

Current root:

- `bank-cash-accounts`
- `bank-cash-transactions`
- `bank-reconciliations`

`bank-cash-accounts` owns the operational registry linked to chart-of-accounts posting accounts.

`bank-cash-transactions` owns receipt, payment, and transfer drafts, posting actions, and links from posted operational records to generated journal entries.

`bank-reconciliations` owns statement-line import/manual entry, statement-to-ledger matching, reconciliation status, and unmatched review endpoints.

### `backend/src/modules/phase-3-sales-receivables`

Purpose:

- implemented Phase 3 sales and receivables workflows

Current root:

- `sales-receivables`

`sales-receivables` owns customers, sales invoices, credit notes, receipt allocations, customer transaction history, and aging report endpoints while reusing Phase 1 journal/posting services for accounting impact.

### `backend/src/modules/phase-4-procure-to-pay`

Purpose:

- ownership root for purchases and payable-side operational workflows in Phase 4

Current root:

- `purchases`

`purchases` currently implements the `suppliers`, `purchase-requests`, `purchase-orders`, `purchase-invoices`, `supplier-payments`, and `debit-notes` submodules, including approved-request conversion into draft purchase orders, direct purchase-order maintenance, receipt-status transitions, draft purchase invoice capture with account classification, supplier payment draft/post/cancel flows with invoice allocation and Bank & Cash integration, and debit note draft/post/cancel flows with optional invoice linkage and payable reduction. Purchase-invoice/debit-note journal posting and the remaining validation/control rules still stay inside their dedicated future submodules.

### `backend/src/modules/phase-5-inventory-management`

Purpose:

- ownership root for future Phase 5 inventory and stock-control workflows

Current root:

- `inventory`

`inventory` currently implements the `item-master`, `warehouses`, `goods-receipts`, `goods-issues`, `transfers`, `adjustments`, `stock-ledger`, `policy`, and shared posting/costing support slices. Posting now maintains warehouse-level balances, movement history, organization-configured costing behavior (`/inventory/policy`), and optional accounting integration through Phase 1 posting services.

### `backend/src/modules/phase-6-payroll-management`

Purpose:

- ownership root for Phase 6 payroll and human-resources financial workflows

Current root:

- `payroll`

`payroll` currently implements employee masters, payroll groups, payroll components, employee/group component assignments, payroll rules, payroll periods, payslip generation/editing/adjustment, payroll period posting/reversal, payroll payments with payslip allocation and reversal, and payroll summary inquiry. Payroll posting and adjustment journal entries reuse Phase 1 journal-entry/posting services, period reversal reuses Phase 1 reversal control, and salary payments reuse Phase 2 bank/cash payment posting.

### `backend/src/modules/phase-7-fixed-assets-management`

Purpose:

- ownership root for Phase 7 fixed-asset register and lifecycle accounting workflows

Current root:

- `fixed-assets`

`fixed-assets` currently implements fixed-asset categories, fixed-asset register masters, acquisition capture/posting/reversal, depreciation run capture/posting/reversal, disposal capture/posting/reversal, transfer capture/posting/reversal, audit/history inquiry, and summary inquiry. Asset lifecycle posting reuses Phase 1 journal-entry/posting services so capitalization, depreciation expense/accumulated depreciation, disposal proceeds, and gain/loss recognition remain aligned with the accounting foundation.

### `backend/src/modules/phase-8-reporting-control`

Purpose:

- ownership root for Phase 8 reporting and control inquiry workflows

Current root:

- `reporting`

`reporting` currently implements summary inquiry, trial balance, balance sheet, profit and loss, cash movement, general ledger inquiry, and audit inquiry endpoints. The module is read-oriented in this slice and derives report output from posted ledger, bank/cash, account, and audit data rather than introducing new accounting persistence.

### `frontend/features/phase-2-bank-cash-management`

Purpose:

- feature-owned UI for implemented Phase 2 bank/cash account management

Current feature area:

- `bank-cash-accounts`
- `bank-cash-transactions`
- `bank-reconciliations`

### `frontend/features/phase-3-sales-receivables`

Purpose:

- feature-owned UI for implemented Phase 3 sales and receivables workflows

Current feature area:

- `sales-receivables`

### `frontend/features/phase-4-procure-to-pay`

Purpose:

- feature-owned UI for Phase 4 purchases workflows

Current feature area:

- `purchases`

### `frontend/features/phase-5-inventory-management`

Purpose:

- feature-owned UI for Phase 5 inventory workflows

Current feature area:

- `inventory` (Item Master, Warehouses, Goods Receipts, Goods Issues, Transfers, Adjustments, Stock Ledger inquiry, and valuation policy controls implemented with costing/accounting integration hooks)

### `frontend/features/phase-6-payroll-management`

Purpose:

- feature-owned UI for Phase 6 payroll workflows

Current feature area:

- `payroll` (group, rule, employee, component, period, payslip, payment, adjustment, reversal, and summary workspace)

### `frontend/features/phase-7-fixed-assets-management`

Purpose:

- feature-owned UI for Phase 7 fixed-asset workflows

Current feature area:

- `fixed-assets` (category, asset register, acquisition, depreciation, disposal, transfer, and summary workspace)

### `frontend/features/phase-8-reporting-control`

Purpose:

- feature-owned UI for Phase 8 reporting workflows

Current feature area:

- `reporting` (summary, trial balance, balance sheet, profit and loss, cash movement, general ledger, and audit workspace)

## Edit Placement Rules

Use these rules before editing:

- reusable visual primitive:
  - put it in `frontend/components/ui`
- accounting page, workflow, table, or form:
  - put it in `frontend/features/accounting/...`
- bank/cash account registry UI, balance cards, or history tables:
  - put it in `frontend/features/phase-2-bank-cash-management/bank-cash-accounts`
- bank/cash receipt, payment, or transfer screens:
  - put it in `frontend/features/phase-2-bank-cash-management/bank-cash-transactions`
- bank/cash reconciliation screens:
  - put it in `frontend/features/phase-2-bank-cash-management/bank-reconciliations`
- sales/receivables screens:
  - put them in `frontend/features/phase-3-sales-receivables`
- purchases screens:
  - put them in `frontend/features/phase-4-procure-to-pay`
- inventory screens:
  - put them in `frontend/features/phase-5-inventory-management`
- payroll screens:
  - put them in `frontend/features/phase-6-payroll-management`
- fixed-asset screens:
  - put them in `frontend/features/phase-7-fixed-assets-management`
- reporting screens:
  - put them in `frontend/features/phase-8-reporting-control`
- route wrapper or route-level composition:
  - put it in `frontend/app/...`
- auth screen:
  - put it in `frontend/features/auth`
- backend authentication behavior:
  - put it in `backend/src/modules/platform/auth`
- accounting rule, service, or controller:
  - put it in the matching Phase 1 accounting submodule
- bank/cash account linking or history endpoints:
  - put them in `backend/src/modules/phase-2-bank-cash-management/bank-cash-accounts`
- bank/cash receipt, payment, or transfer workflows:
  - put them in `backend/src/modules/phase-2-bank-cash-management/bank-cash-transactions`
- bank/cash reconciliation workflows:
  - put them in `backend/src/modules/phase-2-bank-cash-management/bank-reconciliations`
- sales/receivables customer, invoice, credit-note, allocation, and aging workflows:
  - put them in `backend/src/modules/phase-3-sales-receivables/sales-receivables`
- purchases, supplier, payable, and purchase document workflows:
  - put them in `backend/src/modules/phase-4-procure-to-pay/purchases`
- inventory, warehouse, stock movement, costing, and inventory inquiry workflows:
  - put them in `backend/src/modules/phase-5-inventory-management/inventory`
- payroll employee, component, period, payslip, posting, payment, and inquiry workflows:
  - put them in `backend/src/modules/phase-6-payroll-management/payroll`
- fixed-asset category, register, acquisition, depreciation, disposal, transfer, and inquiry workflows:
  - put them in `backend/src/modules/phase-7-fixed-assets-management/fixed-assets`
- reporting summary, trial balance, balance sheet, profit/loss, cash movement, general-ledger-inquiry composition, and audit-report workflows:
  - put them in `backend/src/modules/phase-8-reporting-control/reporting`
- cross-cutting backend infrastructure:
  - put it in `backend/src/common`

## How To Choose Where Code Belongs

Ask these questions in order:

1. Is it a route composition concern?
   - use `frontend/app`
2. Is it reusable UI with no accounting meaning?
   - use `frontend/components/ui`
3. Is it business UI or feature behavior?
   - use `frontend/features/...`
4. Is it authentication platform logic?
   - use `platform/auth`
5. Is it accounting domain logic?
   - use the matching Phase 1 accounting module
6. Is it shared backend infrastructure?
   - use `common`

## Current Contracts

These contracts should remain true unless intentionally changed:

- route files stay thin
- feature folders own business UI
- large feature folders should split orchestration, feature-local components, and feature-local helpers instead of keeping one oversized page file
- `components/ui` owns reusable primitives only
- project-wide typography, placeholder, and language-direction polish belongs in shared frontend UI layers (`frontend/app/globals.css`, `frontend/components/ui`), while feature-specific visual tuning stays in the owning feature folder
- auth belongs to `platform/auth`
- accounting logic belongs inside the owning implemented backend phase module
- only implemented ERP phases should be documented as implemented
