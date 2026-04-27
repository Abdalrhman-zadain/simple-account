# Project Documentation

This directory is the engineering handbook for the current project state.

Use these docs before making changes so you can answer:

- what exists today
- where each responsibility lives
- which layer owns a change
- which accounting rules must remain intact
- which routes and module boundaries should stay stable

## Reading Order

1. [System Design](./system-design.md)
2. [Project Structure](./project-structure.md)
3. [System Structure Report](./system-structure-report.md) (one-page layout and route map)
4. [Accounting Core](./accounting-core.md)
5. [Data Model](./data-model.md)
6. [Change Guide](./change-guide.md)
7. [Known Issues](./known-issues.md)

Additional phase requirements baselines:

- [Phase 4 Purchases Requirements](./phase-4-purchases-requirements.md)
- [Phase 5 Inventory Requirements](./phase-5-inventory-requirements.md)
- [Phase 6 Payroll Requirements](./phase-6-payroll-requirements.md)
- [Phase 7 Fixed Assets Requirements](./phase-7-fixed-assets-requirements.md)
- [Phase 8 Reporting Requirements](./phase-8-reporting-requirements.md)
- [Phase 9 Tax & Compliance Requirements](./phase-9-tax-compliance-requirements.md)

## Scope

These docs describe the currently implemented accounting modules.

- `platform/auth` is implemented.
- `phase-1-accounting-foundation/accounting-core` is implemented.
- `phase-2-bank-cash-management/bank-cash-accounts` is implemented.
- `phase-2-bank-cash-management/bank-cash-transactions` is implemented for receipt, payment, and transfer drafts/posting.
- `phase-2-bank-cash-management/bank-reconciliations` is implemented for statement-line entry/import, matching, and reconciliation status tracking.
- `phase-3-sales-receivables` is implemented for customer masters, sales quotations, sales orders, sales invoices, customer receipts, credit notes, receipt allocation, customer balances, and aging reports.
- `phase-4-procure-to-pay/purchases` now includes Supplier master records, Purchase Requests (draft/submit/approve/reject/close, request lines, status history, and request-to-order conversion), Purchase Orders (draft/issue/partial receipt/full receipt/cancel/close, direct creation, request-linked creation, and receipt-history tracking), Purchase Receipts (draft/post/cancel, PO-line quantity receipt, and automatic PO receiving-status updates), Purchase Invoices (direct/order-linked draft capture, line account classification, discounts/tax/totals, posting to journal entries, draft-to-posted locking, and reversal), Supplier Payments (draft capture, invoice allocation, posting through Bank & Cash, cancellation, supplier-balance reduction, and reversal), and Debit Notes (draft/edit/post/cancel, optional purchase-invoice linkage, journal posting, supplier-balance reduction, payable-balance reduction on linked invoices, and reversal).
- `phase-5-inventory-management/inventory` now includes Item Master, Warehouses (including default transit designation), Goods Receipts, Goods Issues, Inventory Transfers, Inventory Adjustments, stock ledger inquiry, inventory policy configuration (`/inventory/policy` for valuation method), warehouse-level balances, FIFO/weighted-average costing control, posting/accounting integration hooks, and bilingual ERP workspace coverage. Posted movements now maintain both item-level and warehouse-level quantity/value balances with stock movement history, source-transaction drill-down, and reverse-status history for posted inventory documents.
- `phase-6-payroll-management/payroll` is implemented for employee masters, payroll groups, payroll components, employee/group component assignments, payroll rules with fixed/percentage/quantity/formula calculation, payroll periods, payslip generation/editing/adjustment, payroll posting and reversal through Phase 1 journal entries, salary payment allocation/settlement/reversal through Phase 2 bank/cash payments, and summary inquiry.
- `phase-7-fixed-assets-management/fixed-assets` is implemented for fixed-asset category setup, asset register maintenance/editing, acquisition draft/post/reverse, depreciation run draft/post/reverse with schedule/history visibility, disposal draft/post/reverse, transfer draft/post/reverse, audit-history capture, summary inquiry, and bilingual ERP workspace coverage.
- `phase-8-reporting-control/reporting` is implemented for a bilingual reporting workspace covering summary inquiry, trial balance, balance sheet, profit and loss, cash movement, general ledger, audit inquiry, saved report definitions, point-in-time snapshots, export/print output generation, and reporting activity logging using posted accounting data.
- other later ERP phases are **not implemented yet** and should not be described as existing behavior

## How To Use These Docs

- Start with [System Design](./system-design.md) if you need the big picture.
- Use [System Structure Report](./system-structure-report.md) for a concise repository layout, stack table, and route-to-feature map.
- Use [Project Structure](./project-structure.md) to decide where new code belongs.
- Use [Accounting Core](./accounting-core.md) before changing accounting behavior or APIs.
- Use [Data Model](./data-model.md) before changing schema assumptions or posting logic.
- Use [Change Guide](./change-guide.md) when implementing a common task.
- Check [Known Issues](./known-issues.md) before treating current behavior as intentional.
