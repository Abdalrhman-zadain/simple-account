# Phase 8 Reporting Requirements

## Purpose

This file is the Phase 8 baseline for the Reporting & Control module.

It was derived from `phase_8_reporting_requirements.docx` and is used as the planning and translation source of truth for the reporting workspace.

## Source Scope

The source requirements document defines **54 requirements** grouped into these sections:

1. Report Definitions & Filters
2. Trial Balance
3. Balance Sheet
4. Profit & Loss Statement
5. Cash Flow / Cash Movement Reporting
6. General Ledger Reporting
7. Audit Reports
8. Snapshot & Comparative Reporting
9. Validation & Control Rules

## Current Implementation Status

The current codebase now implements the **full Phase 8 reporting baseline** captured in this document, while layout polish and future refinements remain open for later iterations.

Implemented in this slice:

- dedicated backend module at `backend/src/modules/phase-8-reporting-control/reporting`
- dedicated frontend feature at `frontend/features/phase-8-reporting-control/reporting`
- ERP route at `/reporting`
- bilingual English/Arabic reporting workspace labels
- summary inquiry
- trial balance using posted ledger rows only
- balance sheet using posted ledger balances
- profit and loss using posted revenue and expense activity
- cash movement summary using linked bank/cash posting accounts
- general ledger inquiry inside the reporting workspace
- audit inquiry inside the reporting workspace
- comparison-period filters across the reporting workspace
- trial-balance drill-through into general ledger by account selection
- saved report definitions / reusable filter presets
- persisted snapshots with stored rendered payloads
- report generation event logging through audit log entries
- export output generation for binary PDF, print HTML, and native XLSX
- activity review for reporting views, saved definitions, snapshots, and exports
- role-based report catalog visibility and control actions
- configurable account/dimension filters for account type, currency, department, branch, project, and journal-entry type
- configuration warnings for missing bank/cash setup, journal types, segment definitions, and fiscal periods
- report-row drill-through into general ledger plus source-document links from general-ledger and audit rows
- classified cash flow breakdown across operating, investing, financing, and unclassified movements
- exception-focused audit summaries and compliance metrics
- snapshot locking/version policies

## Requirement Mapping Summary

### 1. Report Definitions & Filters

Covered now:

- date range filters
- comparison-period filters
- basis selector (`ACCRUAL`, `CASH`)
- zero-balance inclusion toggle
- saved reusable filter sets
- export request timestamp stamping
- rerun/apply from saved report definitions
- configurable reporting-dimension filters
- report-catalog permission controls

### 2. Trial Balance

Covered now:

- posted-ledger-only source
- account code and name
- debit and credit totals
- selected-period reporting
- total debit vs total credit visibility
- include/exclude zero-balance rows
- account drill-through to ledger
- source drill-through through general-ledger transaction links

### 3. Balance Sheet

Covered now:

- asset / liability / equity grouping
- as-of reporting date
- comparison-period values
- variance display

### 4. Profit & Loss Statement

Covered now:

- revenue and expense grouping
- period-based reporting
- comparison-period values
- variance display
- net income summary

### 5. Cash Flow / Cash Movement Reporting

Covered now:

- cash movement summary driven by active bank/cash accounts and posted ledger movement
- opening, movement, and closing balances
- comparison net movement
- fully classified cash flow statement logic (operating / investing / financing)
- export-ready statement presentation

### 6. General Ledger Reporting

Covered now:

- account-based ledger inquiry
- opening balance, period debits/credits, running balance, closing balance
- journal reference visibility
- direct source-document open actions from report rows

### 7. Audit Reports

Covered now:

- audit event inquiry by date range
- entity/action/user visibility
- source-route drill-through for recognized audit entities
- exception-focused audit reports
- export-oriented compliance packages

### 8. Snapshot & Comparative Reporting

Covered now:

- comparison-period calculations
- variance amount visibility
- persisted snapshots
- snapshot traceability metadata
- rerun from saved report definitions
- snapshot locking/version policies beyond current point-in-time capture

### 9. Validation & Control Rules

Covered now:

- all implemented financial reports use posted ledger data only
- report values are derived from the same posted-ledger source used by general-ledger inquiry
- report activity audit logging
- snapshot/report-definition modification controls
- explicit configuration warning flows for missing mappings
- export/layout consistency controls for dedicated native spreadsheet generators

## Translation Notes

When Phase 8 changes add new reporting labels, statuses, tabs, drill-down actions, or filters:

- update both English and Arabic translation files in the same task
- keep report names aligned across navigation, page sections, and column labels
- avoid documenting untranslated reporting behavior as complete
