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
- the frontend npm scripts route Next through `frontend/scripts/next-run.ps1`, which clears stale `.next` artifacts before `dev` and `build` so OneDrive-backed reparse-point files do not break Next startup

What this means for future edits:

- if a change touches app-router behavior, route wrappers, auth gating, or page composition, re-verify the production build to ensure the fix remains stable.
- if a change touches language initialization, shell layout, or global font wiring, re-run Lighthouse against the production server to catch regressions in request weight or CLS.
- if the failure recurs, document the specific triggers or environment details here.
- if frontend script changes bypass `next-run.ps1`, re-verify that stale `.next` artifacts are not the cause before assuming dev/build failures come from application code

## Documentation Warning

If code and docs drift:

- trust the code first
- update docs immediately after confirming behavior
- do not keep outdated architecture descriptions in `docs/`

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

- the main `/sales-receivables` page now exposes customers, quotations, sales orders, invoices, receipts, credit notes, receipt allocation, and aging in one workspace, but document export/printing and customer statement output are still not implemented.

What this means for future edits:

- keep new Phase 3 changes inside `frontend/features/phase-3-sales-receivables` and preserve Arabic/English translation coverage when adding more document actions.
- add print/export and statement-generation workflows only when their backend routes and output formats are intentionally designed.

## Phase 4 Purchases Status

Current limitation:

- supplier masters, purchase requests, purchase-order maintenance, purchase-invoice draft capture, supplier payments, and debit notes are now implemented, but purchase-invoice and debit-note journal posting flows are still not implemented.
- supplier transaction history still returns an empty list until posted purchase-side financial documents are added in later slices.
- purchase orders now support draft/issue/receipt/cancel/close lifecycle management, but they are still operational documents only and do not yet drive receipt records or journal posting.
- purchase invoices now support draft creation, editing, source-order linkage, account classification, and supplier-payment allocation tracking, but they are still draft-only and do not yet create their own purchase journal entries.
- supplier payments now post through the Bank & Cash payment flow and update supplier balances, but reversal workflows are still pending.
- debit notes now reduce supplier balances and linked purchase-invoice payable amounts operationally, but they do not yet create journal entries or support reversal workflows.

What this means for future edits:

- keep new purchases code inside `backend/src/modules/phase-4-procure-to-pay/purchases` and `frontend/features/phase-4-procure-to-pay`
- preserve Arabic/English translation coverage when adding purchase statuses, document labels, and workflow actions
- do not document non-implemented purchase workflows as implemented until the actual routes, data model, and posting behavior exist
