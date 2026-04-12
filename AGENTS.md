# Project Agent Instructions

## Documentation First

- Before making any code change, read [docs/README.md](docs/README.md).
- Treat the `docs/` directory as the source of truth for current system design, project structure, accounting behavior, data model expectations, and change placement rules.
- Use these files as the primary references:
  - `docs/system-design.md`
  - `docs/project-structure.md`
  - `docs/accounting-core.md`
  - `docs/data-model.md`
  - `docs/change-guide.md`
  - `docs/known-issues.md`

## Documentation Sync Rules

- If a change affects architecture, routes, folder ownership, module boundaries, accounting rules, posting behavior, journal-entry behavior, account behavior, data model assumptions, or known limitations, update the relevant file in `docs/` in the same task.
- Do not leave code and docs out of sync.
- If functionality is added, removed, renamed, moved, or behavior changes, check whether `docs/change-guide.md` or `docs/known-issues.md` also need updates.
- Do not document future ERP phases as implemented unless the code actually exists.

## Edit Placement Rules

- Reusable UI primitives belong in `frontend/components/ui`.
- Feature-owned screens and business UI belong in `frontend/features/...`.
- Route files in `frontend/app/...` should stay thin and only compose layouts, auth wrappers, and feature entry components.
- Backend authentication belongs in `backend/src/modules/platform/auth`.
- Backend accounting domain logic belongs in `backend/src/modules/phase-1-accounting-foundation/accounting-core/...`.
- Shared backend infrastructure belongs in `backend/src/common`.

## Expected Workflow

1. Read `docs/README.md`.
2. Identify the owning module or feature before editing code.
3. Make the code change in the correct location.
4. Update `docs/` if the change affects structure, behavior, or assumptions.
5. Finish with code and docs aligned.
