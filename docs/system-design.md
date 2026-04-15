# System Design

## Summary

The project is a **modular monolith** with a Next.js frontend, a NestJS backend, Prisma for data access, and PostgreSQL as the system of record.

The current business scope is:

- multi-tenant platform authentication (companies, users, roles)
- Phase 1 Accounting Foundation
- bank and cash account registry linked to posting accounts for operational balances and history

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

This module owns the operational bank/cash account registry and the history views derived from linked posting accounts.

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
- the form chooses the linked posting account through account-name autocomplete that searches by account code or account name
- records typed as `Bank` still require bank-specific details, while other classes can use the optional detail fields as needed
- current balance is read from the linked posting account balance
- transaction history is derived from posted ledger rows for the linked posting account

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
