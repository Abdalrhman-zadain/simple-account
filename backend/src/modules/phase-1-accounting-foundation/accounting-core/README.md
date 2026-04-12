# Accounting Core

Phase 1 composition root for accounting behavior.

- `chart-of-accounts` owns account structure and hierarchy
- `journal-entries` owns draft entry lifecycle
- `posting-logic` owns posting workflows
- `general-ledger` owns ledger reporting/query
- `reversal-control` owns reversing entries
- `validation-rules` owns accounting-domain helpers and reference generation
- `fiscal`, `audit`, and `master-data` remain dedicated supporting submodules
