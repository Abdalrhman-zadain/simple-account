# System Structure Report

This document is a **single-page snapshot** of how the repository is organized today: runtime stack, layers, route-to-feature mapping, and backend module boundaries. It complements [System Design](./system-design.md) and [Project Structure](./project-structure.md); those files remain the detailed references for behavior and edit placement.

**Scope:** Phase 1 Accounting Foundation and `platform/auth` only. Later ERP phases are not implemented and are not described here.

## Runtime stack

| Layer | Technology | Role |
| --- | --- | --- |
| UI | Next.js (App Router) | Route composition, auth gating, feature screens |
| API | NestJS | Modular monolith: auth + accounting-core |
| Data access | Prisma | ORM to PostgreSQL |
| Database | PostgreSQL | System of record for tenants, accounts, journals, ledger, fiscal, audit |

## Logical architecture

```text
Browser (Next.js)
    │  HTTP JSON (Bearer JWT on protected routes)
    ▼
NestJS AppModule
    ├── PrismaModule          (backend/src/common/prisma)
    ├── AccountingCoreModule  (backend/src/modules/phase-1-accounting-foundation/accounting-core)
    └── AuthModule            (backend/src/modules/platform/auth)
            └── … submodules (see below)
    │
    ▼
PostgreSQL
```

**Dependency rules (high level):** accounting controllers use `JwtAuthGuard`; the frontend calls the backend only through `frontend/lib/api` (see [System Design](./system-design.md)).

## Repository layout (verified)

```text
simple-account/
├── docs/                          # Engineering handbook (source of truth)
├── frontend/
│   ├── app/
│   │   ├── (auth)/                # login, register
│   │   ├── (erp)/                 # ERP shell + thin page entrypoints
│   │   ├── layout.tsx, page.tsx, globals.css
│   ├── components/                # require-auth, site-header, ui/, forms
│   ├── features/
│   │   ├── auth/
│   │   └── accounting/            # chart-of-accounts, journal-entries, general-ledger, fiscal, audit, master-data
│   ├── lib/                       # api (client), config, utils, storage
│   └── providers/                 # app-providers, auth-provider, query-provider
└── backend/
    ├── prisma/
    └── src/
        ├── common/prisma/
        ├── app.module.ts
        └── modules/
            ├── platform/auth/
            └── phase-1-accounting-foundation/
                └── accounting-core/   # Nest submodules (see next section)
```

## Frontend: routes to feature owners

ERP routes stay thin: they compose layout/auth shell and import from `frontend/features/...`.

| Public route | Route file | Primary feature component |
| --- | --- | --- |
| `/login` | `app/(auth)/login/page.tsx` | `features/auth` |
| `/register` | `app/(auth)/register/page.tsx` | `features/auth` |
| `/accounts` | `app/(erp)/accounts/page.tsx` | `features/accounting/chart-of-accounts` |
| `/accounts/new` | `app/(erp)/accounts/new/page.tsx` | `features/accounting/chart-of-accounts` |
| `/accounts/edit/[id]` | `app/(erp)/accounts/edit/[id]/page.tsx` | `features/accounting/chart-of-accounts` |
| `/journal-entries` | `app/(erp)/journal-entries/page.tsx` | `features/accounting/journal-entries` |
| `/general-ledger` | `app/(erp)/general-ledger/page.tsx` | `features/accounting/general-ledger` |
| `/fiscal` | `app/(erp)/fiscal/page.tsx` | `features/accounting/fiscal` |
| `/audit` | `app/(erp)/audit/page.tsx` | `features/accounting/audit` |
| `/master-data` | `app/(erp)/master-data/page.tsx` | `features/accounting/master-data` |

Shared UI primitives live under `frontend/components/ui`. Cross-cutting client pieces include `RequireAuth` and API access via `frontend/lib/api` (re-exported from `frontend/lib/api/index.ts`).

## Backend: `AccountingCoreModule` composition

`backend/src/modules/phase-1-accounting-foundation/accounting-core/accounting-core.module.ts` imports and exports the Phase 1 submodules in this order:

1. `validation-rules`
2. `chart-of-accounts`
3. `journal-entries`
4. `posting-logic`
5. `reversal-control`
6. `general-ledger`
7. `master-data` (segments)
8. `fiscal`
9. `audit`

`JournalEntriesController` is registered on `AccountingCoreModule` (in addition to feature modules’ own controllers).

## Where to go next

| Need | Document |
| --- | --- |
| Posting flow, auth boundary, module rules | [system-design.md](./system-design.md) |
| Where to place a new file | [project-structure.md](./project-structure.md) |
| Accounting rules and APIs | [accounting-core.md](./accounting-core.md) |
| Schema and persistence assumptions | [data-model.md](./data-model.md) |
| Common change recipes | [change-guide.md](./change-guide.md) |
| Behavior that may be wrong or incomplete | [known-issues.md](./known-issues.md) |

---

*This report reflects the tree and module wiring as of the last manual verification against the repository. If routes or module lists change, update this file in the same change as the code.*
