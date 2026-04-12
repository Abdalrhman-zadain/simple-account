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
3. [Accounting Core](./accounting-core.md)
4. [Data Model](./data-model.md)
5. [Change Guide](./change-guide.md)
6. [Known Issues](./known-issues.md)

## Scope

These docs describe the **current Phase 1 Accounting Foundation** implementation.

- `platform/auth` is implemented.
- `phase-1-accounting-foundation/accounting-core` is implemented.
- later ERP phases are **not implemented yet** and should not be described as existing behavior

## How To Use These Docs

- Start with [System Design](./system-design.md) if you need the big picture.
- Use [Project Structure](./project-structure.md) to decide where new code belongs.
- Use [Accounting Core](./accounting-core.md) before changing accounting behavior or APIs.
- Use [Data Model](./data-model.md) before changing schema assumptions or posting logic.
- Use [Change Guide](./change-guide.md) when implementing a common task.
- Check [Known Issues](./known-issues.md) before treating current behavior as intentional.
