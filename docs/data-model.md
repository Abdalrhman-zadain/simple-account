# Data Model

## Summary

The database is centered on Phase 1 accounting data. Prisma is the schema definition and access layer, and PostgreSQL is the source of truth.

This document describes the current schema and its accounting meaning. It does not propose a redesign.

## Core Model Groups

### Accounts

Main model:

- `Account`

Key fields:

- `code`
- `name`
- `nameAr`
- `currencyCode`
- `type`
- `isPosting`
- `allowManualPosting`
- `isActive`
- `currentBalance`
- `parentAccountId`
- segment references and segment strings

Accounting meaning:

- the chart of accounts is stored here
- hierarchy is represented by `parentAccountId`
- real posting targets are controlled by `isPosting`
- current account balance is stored directly and updated by posting logic

### Journals

Main models:

- `JournalEntry`
- `JournalEntryLine`

Key fields:

- `reference`
- `status`
- `entryDate`
- `reversalOfId`
- line debit and credit amounts
- line account references

Accounting meaning:

- journals capture accounting intent before and after posting
- lines are the balanced accounting detail
- reversal links preserve correction history

### Posting And Ledger

Main models:

- `PostingBatch`
- `LedgerTransaction`

Key fields:

- posting batch timestamp
- journal entry reference
- journal entry line reference
- account reference
- debit and credit amounts
- posted timestamps

Accounting meaning:

- posted history is stored in ledger transactions
- the posting batch groups a posting operation
- ledger rows are the authoritative posted history behind the general ledger

### Fiscal Control

Main models:

- `FiscalYear`
- `FiscalPeriod`

Accounting meaning:

- defines open, closed, and locked accounting periods
- connects journal entries and ledger rows to fiscal time

### Master Data

Main models:

- `SegmentDefinition`
- `SegmentValue`

Accounting meaning:

- allows enterprise-style segmented coding and reference data
- links segment values to accounts

### Audit And Users

Main models:

- `AuditLog`
- `User`

Key fields & behavior:

- `User.role` (ADMIN, MANAGER, USER) determines the user's privilege layer.
- `User.companyId` isolates data to a specific tenant.
- `User.parentUserId` supports hierarchical management of users within a company.
- `AuditLog.companyId` enables fast filtering of audit history per tenant.

Accounting meaning:

- implements the multi-tenant architecture by isolating users and their data within companies
- super-admins (ADMIN) manage the global platform
- company root users (MANAGER) manage their own company's specific data and users
- tracks who performed actions and on which entities with company-level scoping

## Relationship Map

```text
Account
  ├─ parentAccount -> Account
  ├─ childAccounts -> Account[]
  ├─ journalLines -> JournalEntryLine[]
  └─ ledgerLines -> LedgerTransaction[]

JournalEntry
  ├─ lines -> JournalEntryLine[]
  ├─ ledgerLines -> LedgerTransaction[]
  ├─ postingBatch -> PostingBatch
  ├─ fiscalPeriod -> FiscalPeriod
  └─ reversalOf / reversedBy -> JournalEntry

JournalEntryLine
  ├─ account -> Account
  ├─ journalEntry -> JournalEntry
  └─ ledgerLines -> LedgerTransaction[]

LedgerTransaction
  ├─ postingBatch -> PostingBatch
  ├─ journalEntry -> JournalEntry
  ├─ journalEntryLine -> JournalEntryLine
  ├─ account -> Account
  └─ fiscalPeriod -> FiscalPeriod
```

## Module Ownership Map

Ownership by module:

- Chart of Accounts:
  - `Account`
- Journal Entries:
  - `JournalEntry`
  - `JournalEntryLine`
- Posting Logic:
  - `PostingBatch`
  - `LedgerTransaction`
  - `Account.currentBalance`
- General Ledger:
  - reads `LedgerTransaction` and `Account`
- Reversal Control:
  - uses `JournalEntry.reversalOfId`
- Fiscal:
  - `FiscalYear`
  - `FiscalPeriod`
- Master Data:
  - `SegmentDefinition`
  - `SegmentValue`
- Audit:
  - `AuditLog`
- Platform Auth:
  - `User`

## Balance Integrity Expectations

These expectations are core to the current model:

- debit total must equal credit total before posting
- posting creates ledger rows and updates `Account.currentBalance`
- posted journal history should remain reconstructable
- reversal should create compensating records instead of deleting history
- ledger history should be append-oriented from an accounting perspective

## Header And Posting Implications

The model supports structural and transactional accounts:

- header accounts:
  - represented with `isPosting = false`
  - used for grouping and reporting structure
- posting accounts:
  - represented with `isPosting = true`
  - intended to receive journal-entry activity

This distinction is critical when editing:

- posting logic
- account creation workflows
- journal-entry validation
- account-tree reporting

Additional invariants:

- header accounts may have children and should not be used as direct journal-entry targets
- posting accounts must stay leaf nodes with no child accounts
- any application workflow that creates, updates, validates, or posts journal lines must reject header-account posting attempts
- the database also rejects assigning a child to a posting account or converting an account with children into a posting account

## Segment Strategy

The schema currently supports two segment styles at the same time:

- relational segment references via `SegmentValue`
- legacy string segment fields on `Account`

Future edits must document whether a change touches:

- relational segment behavior
- legacy string display behavior
- account code generation (`code` is unique, assigned only by the server at create time, with transactional allocation under each parent)

## What Not To Assume

Do not assume:

- later ERP phases already have schema ownership
- the ledger is a generic reporting table unrelated to posting
- header and posting accounts are interchangeable
- balance updates can be skipped because ledger rows exist
