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

## Scope

These docs describe the currently implemented accounting modules.

- `platform/auth` is implemented.
- `phase-1-accounting-foundation/accounting-core` is implemented.
- `phase-2-bank-cash-management/bank-cash-accounts` is implemented.
- `phase-2-bank-cash-management/bank-cash-transactions` is implemented for receipt, payment, and transfer drafts/posting.
- other later ERP phases are **not implemented yet** and should not be described as existing behavior

## How To Use These Docs

- Start with [System Design](./system-design.md) if you need the big picture.
- Use [System Structure Report](./system-structure-report.md) for a concise repository layout, stack table, and route-to-feature map.
- Use [Project Structure](./project-structure.md) to decide where new code belongs.
- Use [Accounting Core](./accounting-core.md) before changing accounting behavior or APIs.
- Use [Data Model](./data-model.md) before changing schema assumptions or posting logic.
- Use [Change Guide](./change-guide.md) when implementing a common task.
- Check [Known Issues](./known-issues.md) before treating current behavior as intentional.
