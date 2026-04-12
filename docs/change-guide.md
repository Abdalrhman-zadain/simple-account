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

Must remain compatible:

- current public URLs unless a route change is intentional
- route files stay thin

Checks to run:

- frontend typecheck
- frontend route render check in dev

## Change Account Creation Behavior

Where to edit:

- `frontend/features/accounting/chart-of-accounts/create-account-form.tsx`
- chart-of-accounts frontend navigation if parent selection behavior changes
- backend chart-of-accounts service/controller if rules change

What else to check:

- required account type selection
- header vs posting selection
- parent context passed from navigation or route params
- parent context must only come from header accounts, never from posting-account drilldown state
- next-code generation
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

Must remain compatible:

- existing module boundaries
- route naming conventions already used in the project

Checks to run:

- backend build
- backend tests
- frontend typecheck if consumed by UI

## Before Finishing Any Phase 1 Change

Review these questions:

- does the code live in the correct frontend/backend module
- did the change preserve header vs posting semantics
- did the change preserve posting and reversal auditability
- does the change describe a current Phase 1 capability instead of a future ERP phase
- do the docs still match the code after the edit
