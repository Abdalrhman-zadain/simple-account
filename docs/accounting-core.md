# Accounting Core

## Summary

Phase 1 Accounting Foundation is implemented as `accounting-core`. It is the current business heart of the application.

Its responsibility is to define accounts, record journal entries, post entries into the ledger, manage periods and master data, and expose audit-friendly accounting views.

## Module Map

```text
phase-1-accounting-foundation/
└── accounting-core/
    ├── chart-of-accounts/
    ├── journal-entries/
    ├── posting-logic/
    ├── general-ledger/
    ├── reversal-control/
    ├── validation-rules/
    ├── fiscal/
    ├── audit/
    └── master-data/
```

## Chart of Accounts

Purpose:

- define account structure
- manage account activation state
- manage hierarchy and codes
- expose tree and detail views

Main data involved:

- `Account`
- account code
- account type
- parent-child hierarchy
- posting/header behavior
- segment assignments

Controller responsibility:

- create accounts
- list accounts
- return account hierarchy
- return the next account code
- delete accounts that have no transfer history
- activate and deactivate accounts
- support a lightweight selector list mode for account pickers (`GET /accounts?view=selector`) so dropdowns do not load segment relations they do not use
- support a lightweight table list mode for the chart page (`GET /accounts?view=table`) so the main account table does not load full segment relations for every visible row

Service responsibility:

- generate codes
- build hierarchy trees
- enforce account-level creation/update rules

Important business rules:

- every account has a required account type
- child accounts must have the same type as their parent account (type is inherited)
- an account can be a header or a posting account
- header accounts organize children
- posting accounts are the real transaction buckets
- posting accounts must remain leaf nodes and cannot own child accounts
- child accounts may only be created under header accounts
- accounts may only be deleted when they have no journal-entry usage and no posted ledger history
- PostgreSQL also enforces the leaf-node rule so invalid hierarchy writes are rejected below the service layer
- inactive accounts should not behave like active posting targets

Dependencies inside Phase 1:

- used by journal entries
- used by posting logic
- used by general ledger
- linked to master data through segment values

### Header vs Posting Account

One-line model:

- header account = folder
- posting account = file inside the folder

Header account:

- groups child accounts
- exists for structure and reporting
- should not be the target of manual posting
- balance should be interpreted as derived from descendant posting accounts rather than as a directly posted balance

Posting account:

- holds real transaction activity
- is used in journal entry lines
- affects ledger history and balances
- must not have child accounts

### Current UI Navigation Behavior

The chart-of-accounts table includes a **Role** column on each row: **Posting** (end account used for journal lines) vs **Header** (structural parent only).

The chart-of-accounts page uses a **level nivgation style** style. Instead of expanding nodes inline, clicking on a **Header** account navigates the view to show only the direct children of that account.

Behavior:
- **Navigation**:
    - when you click on the account it go to his childern like in the assit -> go to laprt server level 
    - Breadcrumbs at the top allow navigating back up to the "Root" or any intermediate parent.
    - The URL contains a `parentId` parameter, allowing for direct linking and browser back/forward support.
- **Visual Distinction**:
    - Header accounts are visually interactive and suggest navigation (e.g., with a chevron or folder-like behavior).
    - Posting accounts are identified as leaf nodes and do not allow further drilling.
- **Stats Summary**: The summary bar at the top displays statistics (total accounts, net balance) for the accounts currently visible at the current level.
- **Search & Filtering**: The search bar allows filtering by name, code, type (e.g., `type:ASSET`), role (`is:posting`), and status (`status:active`). Users can stack multiple filter tokens in the same search query, including more than one token from the same filter family, and those filters continue to apply within the currently opened account level so header drill-down still works.
- **Account Codes**: Codes are automatically generated and assigned on the backend based on parent placement and role (Header vs Posting).
  - The system supports **two code strategies**:
    - **Legacy/string codes** (including segmented enterprise-style codes) keep using the existing sibling-based allocation rules.
    - **7-digit numeric hierarchy codes** are enabled when the parent account code is exactly 7 digits (e.g. `1000000`).
      - Header child example: `1000000` → `1100000`
      - Posting child example: `1100000` → `1100001` (increments from the right within the parent range)
- **Actions**: "Edit", "Add Child", and activation toggles are available on each row. The delete action is shown only for accounts with no transfer history.

## Journal Entries

Purpose:

- capture draft accounting transactions
- validate entry structure
- post balanced entries
- reverse posted entries

Main data involved:

- `JournalEntry`
- `JournalEntryLine`
- journal reference
- status
- fiscal period

Controller responsibility:

- create
- list
- fetch one
- update draft entries
- post entries
- reverse entries
- support lightweight list reads for overview screens (`GET /journal-entries?includeLines=false`) while keeping full line details available from `GET /journal-entries/:id`

Service responsibility:

- validate line structure
- enforce balanced debit/credit
- coordinate posting and reversal workflows

Important business rules:

- total debit must equal total credit
- posted entries are controlled, not casually edited
- reversing an entry creates a new reversing entry
- journal references are unique
- every journal entry line must reference a posting account
- attempts to use a header account for a journal line must be rejected during validation and again at posting time

Dependencies inside Phase 1:

- depends on chart of accounts
- depends on posting logic
- depends on reversal control
- depends on fiscal state

## Posting Logic

Purpose:

- convert valid journal entries into posted ledger history
- create posting batches
- update account balances

Main data involved:

- `PostingBatch`
- `LedgerTransaction`
- `JournalEntry`
- `JournalEntryLine`
- `Account.currentBalance`

Controller responsibility:

- no public controller of its own
- invoked by journal entry posting workflow

Service responsibility:

- verify entry is postable
- create the posting batch
- write ledger transactions
- update balances atomically

Important business rules:

- posting must be transactional
- only valid accounts may be posted to
- posted ledger history must be reconstructable

Dependencies inside Phase 1:

- depends on chart of accounts
- depends on validation rules
- supports journal entries and general ledger

## General Ledger

Purpose:

- expose posted transaction history
- show account-level ledger activity
- support reporting and drill-down

Main data involved:

- `LedgerTransaction`
- `Account`
- fiscal filters
- date filters

Controller responsibility:

- list ledger data
- return ledger details for an account or ledger resource

Service responsibility:

- query posted ledger rows
- compute running/opening balance views from stored transactions

Important business rules:

- general ledger reflects posted history, not draft history
- it should remain a read-oriented accounting surface

Dependencies inside Phase 1:

- depends on posting results
- depends on chart of accounts metadata
- may use fiscal filters

## Reversal Control

Purpose:

- manage corrections through reversal entries instead of destructive edits

Main data involved:

- `JournalEntry.reversalOfId`
- original and reversing entries

Controller responsibility:

- no standalone public controller
- used by journal-entry reversal flow

Service responsibility:

- create reversing entries
- preserve auditability

Important business rules:

- posted records are corrected through reversal, not deletion
- reversal history must stay linked

Dependencies inside Phase 1:

- depends on journal entries
- depends on posting logic

## Validation Rules

Purpose:

- centralize accounting-specific validation helpers and shared accounting utilities

Main data involved:

- accounting errors
- decimal helpers
- shared accounting references

Controller responsibility:

- none

Service responsibility:

- support other accounting modules with shared rule enforcement

Important business rules:

- shared validations should not be duplicated across modules
- accounting invariants should be enforced consistently

Dependencies inside Phase 1:

- used by posting logic and journal workflows

## Fiscal

Purpose:

- manage fiscal years and fiscal periods
- expose period status
- open and close periods

Main data involved:

- `FiscalYear`
- `FiscalPeriod`
- period status

Controller responsibility:

- get fiscal status
- list years and periods
- create years
- open and close periods

Service responsibility:

- create fiscal structures
- enforce period state changes

Important business rules:

- posting should respect fiscal state
- periods should be explicitly opened or closed

Dependencies inside Phase 1:

- used by journal entries
- used by general ledger
- linked from ledger and journal data

## Audit

Purpose:

- expose audit trail data relevant to accounting operations

Main data involved:

- `AuditLog`
- user
- entity
- action
- details
- company scope

Controller responsibility:

- list audit records

Service responsibility:

- query audit history

Important business rules:

- accounting actions should remain reviewable
- audit data is not business logic; it is evidence of actions

Dependencies inside Phase 1:

- reads across accounting operations

## Master Data

Purpose:

- manage account segment definitions and values
- manage user-defined account classes (subtypes)
- manage user-defined journal entry types
- manage user-defined payment method types
- support enterprise-style segmented account coding

Main data involved:

- `SegmentDefinition`
- `SegmentValue`
- `AccountSubtype`
- `PaymentMethodType`
- `JournalEntryType`
- account segment assignments

Controller responsibility:

- get master data summary
- manage segment definitions
- manage segment values
- manage account subtypes (account classes)
- manage payment method types
- manage journal entry types

Service responsibility:

- create and update segment metadata
- support account-code and account-structure workflows

Important business rules:

- segment definitions and values shape account coding
- they are foundational reference data, not ad hoc UI settings
- `PaymentMethodType` rows drive the allowed values for `BankCashAccount.type`
- bank/cash account creation and update must reject unknown or inactive payment method types
- the baseline payment-method list starts with `Bank` and `Cash`, and later custom methods such as `Wallet` or `Click` are added through Master Data
- journal entry creation and update must reject unknown or inactive journal entry types

Dependencies inside Phase 1:

- used by chart of accounts
- used by journal entries
- used by bank/cash accounts

## Current API Surface

Current backend controller routes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /accounts`
- `GET /accounts/next-code` (supports `parentId`, `isPosting`, and `type` query parameters)
- `GET /accounts`
- `GET /accounts/hierarchy/tree`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `POST /accounts/:id/deactivate`
- `POST /accounts/:id/activate`
- `POST /journal-entries`
- `GET /journal-entries`
- `GET /journal-entries/:id`
- `PATCH /journal-entries/:id`
- `POST /journal-entries/:id/post`
- `POST /journal-entries/:id/reverse`
- `GET /general-ledger`
- `GET /general-ledger/:id`
- `GET /fiscal/status`
- `GET /fiscal/years`
- `POST /fiscal/years`
- `GET /fiscal/periods`
- `POST /fiscal/periods/:id/close`
- `POST /fiscal/periods/:id/open`
- `GET /audit`
- `GET /segments/master-data`
- `GET /segments/definitions`
- `POST /segments/definitions`
- `PATCH /segments/definitions/:id`
- `GET /segments/definitions/:id/values`
- `POST /segments/definitions/:id/values`
- `PATCH /segments/values/:id`
- `DELETE /segments/values/:id`
- `GET /account-subtypes`
- `POST /account-subtypes`
- `PATCH /account-subtypes/:id`
- `DELETE /account-subtypes/:id`
- `GET /payment-method-types`
- `POST /payment-method-types`
- `PATCH /payment-method-types/:id`
- `DELETE /payment-method-types/:id`
- `GET /journal-entry-types`
- `POST /journal-entry-types`
- `PATCH /journal-entry-types/:id`
- `DELETE /journal-entry-types/:id`
- `GET /bank-cash-accounts`
- `POST /bank-cash-accounts`
- `GET /bank-cash-accounts/:id`
- `PATCH /bank-cash-accounts/:id`
- `POST /bank-cash-accounts/:id/deactivate`
- `GET /bank-cash-accounts/:id/transactions`
