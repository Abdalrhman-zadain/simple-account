# Data Model

## Summary

The database is centered on Phase 1 accounting data. Prisma is the schema definition and access layer, and PostgreSQL is the source of truth.

This document describes the current schema and its accounting meaning. It does not propose a redesign.

## Core Model Groups

### Accounts

Main model:

- `Account`
- `BankCashAccount`
- `BankCashTransaction`
- `BankReconciliation`
- `BankStatementLine`
- `BankReconciliationMatch`

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
- operational bank/cash records wrap specific posting accounts for balance and history views
- records typed as `Bank` require `bankName`; the operational `accountNumber`/reference is now derived from the linked chart-of-accounts account code instead of being entered manually
- receipt, payment, and transfer records are stored as `BankCashTransaction` rows and affect balances only after posting creates a journal entry
- reconciliation work is stored separately from operational transactions so statement lines and matching status do not alter balances directly
- bank/cash opening balances are not stored as a separate balance field; they are posted as normal journal/ledger history against the linked account and an offset posting account

### Journals

Main models:

- `JournalEntry`
- `JournalEntryLine`
- `JournalEntryType`

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
- journal entries may optionally be categorized by a user-defined journal entry type (e.g. Payment, Invoice)

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

- Phase 8 reporting reads posted balances from `LedgerTransaction`, account metadata from `Account`, bank/cash reporting scope from `BankCashAccount`, and operational visibility from `AuditLog`
- reusable reporting definitions and persisted report snapshots are currently stored in runtime-managed PostgreSQL tables named `ReportDefinition` and `ReportSnapshot`
- those reporting-control tables are created by the Phase 8 reporting service with SQL guards (`CREATE TABLE IF NOT EXISTS`) and a process-level initialization lock because Prisma client regeneration is not yet part of the current Windows-safe workflow

- posted history is stored in ledger transactions
- the posting batch groups a posting operation
- ledger rows are the authoritative posted history behind the general ledger
- bank/cash transaction history is derived from ledger rows for the linked posting account
- posted bank/cash transaction records link to the journal entry that created their ledger rows
- bank reconciliation matches link statement lines to ledger rows and store whether each match has been reconciled

### Sales And Receivables

Main models:

- `Customer`
- `SalesQuotation`
- `SalesQuotationLine`
- `SalesOrder`
- `SalesOrderLine`
- `SalesInvoice`
- `SalesInvoiceLine`
- `CreditNote`
- `CreditNoteLine`
- `ReceiptAllocation`
- `BankCashTransaction` (for customer receipts linked to customer masters)

Key fields:

- customer `code`, `name`, `contactInfo`, `taxInfo`, `salesRepresentative`, `paymentTerms`, `creditLimit`, `currentBalance`, and `isActive`
- quotation/order/invoice/credit-note `reference`, `status`, date fields, `currencyCode`, totals, and source-document references where applicable
- invoice `dueDate`, `subtotalAmount`, `discountAmount`, `taxAmount`, `totalAmount`, and `journalEntryId`
- invoice `allocatedAmount`, `outstandingAmount`, and `allocationStatus`
- quotation line `itemId` (optional link to `InventoryItem`) plus snapshot/display fields `itemName`, `quantity`, `unitPrice`, `discountAmount`, `taxAmount`, `lineSubtotalAmount`, `lineAmount`/`lineTotalAmount`, and `revenueAccountId`
- sales-order line `itemId` (optional link to `InventoryItem`) plus snapshot/display fields `itemName`, `quantity`, `unitPrice`, `discountAmount`, `taxAmount`, `lineSubtotalAmount`, `lineTotalAmount`, and `revenueAccountId`
- sales-invoice line `itemId` (optional link to `InventoryItem`) plus snapshot/display fields `itemName`, `quantity`, `unitPrice`, `discountAmount`, `taxAmount`, `lineSubtotalAmount`, `lineAmount`, and `revenueAccountId`
- quotation, sales-order, sales-invoice, and credit-note lines may optionally reference `Tax` through `taxId`; the stored `taxAmount` remains the historical calculated amount
- customer receipt transactions `customerId`, settlement text, and links to posted receipt transactions
- allocation `amount`, `allocatedAt`, and links to posted receipt transactions

Accounting meaning:

- customer receivable control links each customer to one posting receivable account
- customer creation can automatically create the linked posting receivable account under `1121000 Customer Receivables / ذمم عملاء`, or link an existing active posting Asset account from that subtree; sales invoices, receipts, and credit notes use the customer's linked posting account rather than receivables header accounts
- quotations and sales orders preserve commercial traceability before accounting is created
- quotation lines may optionally point to an inventory/service item while still storing editable `itemName` snapshots so the commercial document remains readable even if the item master changes later
- sales-order lines may optionally point to an inventory/service item while still storing editable `itemName` snapshots so downstream invoicing can inherit the item link without depending on future item-master edits
- sales-invoice lines may optionally point to an inventory/service item while still storing editable `itemName` snapshots so posted invoice history stays linked to the item card without depending on future item-master edits
- invoices and credit notes can be drafted, then posted through Phase 1 journal/posting logic
- invoice posting debits receivables and credits revenue plus sales tax/VAT liability when tax is present
- customer receipts are stored as Phase 2 posted receipt transactions and can be created from either the Sales module or the Bank & Cash module
- posting creates journal/ledger history and links each document to its generated journal reference
- customer balance is incremented on posted invoices and decremented on posted credit notes
- receipt allocation updates invoice outstanding status while preventing over-allocation
- aging is derived from posted invoice outstanding balances by age bucket using due date when present

### Purchases

Main models:

- `Supplier`
- `PurchaseRequest`
- `PurchaseRequestLine`
- `PurchaseRequestStatusHistory`
- `PurchaseOrder`
- `PurchaseOrderLine`
- `PurchaseInvoice`
- `PurchaseInvoiceLine`
- `SupplierPayment`
- `SupplierPaymentAllocation`
- `DebitNote`
- `DebitNoteLine`

Key fields:

- supplier `code`, `name`, legacy `contactInfo`, structured `phone` / `email` / `address`, required `paymentTerms`, `taxInfo`, `defaultCurrency`, `currentBalance`, and `isActive`
- purchase request `reference`, `status`, `requestDate`, optional `description`, and linked request lines
- request line optional `itemId` link to `InventoryItem`, snapshot `itemName`, `description`, `quantity`, `requestedDeliveryDate`, and `justification`
- request status history `status`, `note`, and `changedAt`
- purchase order `reference`, `status`, `orderDate`, `supplierId`, `currencyCode`, `sourcePurchaseRequestId`, and totals
- purchase order line optional `itemId` link to `InventoryItem`, snapshot `itemName`, `description`, `quantity`, `unitPrice`, `taxAmount`, `lineTotalAmount`, and `requestedDeliveryDate`
- purchase invoice `reference`, `status`, `invoiceDate`, `supplierId`, `currencyCode`, `sourcePurchaseOrderId`, `subtotalAmount`, `discountAmount`, `taxAmount`, `totalAmount`, `allocatedAmount`, `outstandingAmount`, `allocationStatus`, and optional `journalEntryId`
- purchase invoice line optional `itemId` link to `InventoryItem`, snapshot `itemName`, `description`, `quantity`, `unitPrice`, `discountAmount`, `taxAmount`, `lineSubtotalAmount`, `lineTotalAmount`, and `accountId`
- supplier payment `reference`, `status`, `paymentDate`, `supplierId`, `amount`, `allocatedAmount`, `unappliedAmount`, `bankCashAccountId`, and optional `bankCashTransactionId`
- supplier payment allocation `amount`, `allocatedAt`, `purchaseInvoiceId`, and `supplierPaymentId`
- debit note `reference`, `status`, `noteDate`, `supplierId`, optional `purchaseInvoiceId`, `currencyCode`, `subtotalAmount`, `taxAmount`, `totalAmount`, and optional `journalEntryId`
- debit note line `quantity`, `amount`, `taxAmount`, `reason`, and `lineTotalAmount`
- purchase-order, purchase-invoice, and debit-note lines may optionally reference `Tax` through `taxId`; the stored `taxAmount` remains the historical calculated amount

Accounting meaning:

- supplier masters link each supplier to one posting payable account and preserve history after deactivation
- purchase requests are internal pre-procurement documents with draft, submitted, approved, rejected, and closed states
- request status transitions are stored separately so approval history remains auditable
- approved purchase requests can open a draft purchase order while preserving source-request traceability
- purchase orders now persist their own header and line lifecycle, including direct creation, request-linked creation, and operational statuses (`DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`, `CANCELLED`, `CLOSED`), but they still do not carry posting behavior or receipt/invoice matching
- purchase invoices now persist supplier-linked draft headers and lines, including optional source purchase-order linkage, line-level debit posting-account classification restricted to active posting inventory assets, fixed assets, or expenses, subtotal/discount/tax/total amounts, and allocation-aware statuses; they still do not yet generate their own purchase journal entries
- supplier payments can be drafted, allocated across one or more purchase invoices, and posted through the Phase 2 Bank & Cash payment flow, which creates the underlying journal entry and bank/cash transaction link
- posted supplier payments decrement supplier balances and recompute invoice allocated/outstanding amounts while preventing over-allocation
- debit notes can be drafted, optionally linked to purchase invoices, then posted to reduce supplier balances and reduce the remaining payable amount of linked purchase invoices
- debit notes are operationally posted today, but they do not yet create their own purchase journal entries

### Inventory

Main models:

- `InventoryItem`
- `InventoryWarehouse`
- `InventoryGoodsReceipt`
- `InventoryGoodsReceiptLine`
- `InventoryGoodsIssue`
- `InventoryGoodsIssueLine`
- `InventoryTransfer`
- `InventoryTransferLine`
- `InventoryAdjustment`
- `InventoryAdjustmentLine`
- `InventoryWarehouseBalance`
- `InventoryStockMovement`
- `InventoryCostLayer`
- `InventoryPolicy`

Key fields:

- item `code`, `name`, `description`, `unitOfMeasure`, `category`, `type`, and `isActive`
- default account references `inventoryAccountId`, `cogsAccountId`, `salesAccountId`, and `adjustmentAccountId`
- replenishment fields `reorderLevel`, `reorderQuantity`, `preferredWarehouseId`, and `preferredWarehouseCode`
- warehouse `code`, `name`, `address`, `responsiblePerson`, `isTransit`, and `isActive`
- goods receipt `reference`, `status`, `receiptDate`, `warehouseId`, optional purchase references, summary quantities/amounts, and `postedAt`
- goods receipt line `lineNumber`, `itemId`, `quantity`, `unitCost`, `unitOfMeasure`, `description`, and `lineTotalAmount`
- goods issue `reference`, `status`, `issueDate`, `warehouseId`, optional source references, summary quantities/amounts, and `postedAt`
- goods issue line `lineNumber`, `itemId`, `quantity`, `unitCost`, `unitOfMeasure`, `description`, and `lineTotalAmount`
- inventory transfer `reference`, `status`, `transferDate`, `sourceWarehouseId`, `destinationWarehouseId`, summary quantities/amounts, and `postedAt`
- inventory transfer line `lineNumber`, `itemId`, `quantity`, `unitCost`, `unitOfMeasure`, `description`, and `lineTotalAmount`
- inventory adjustment `reference`, `status`, `adjustmentDate`, `warehouseId`, `reason`, summary variance/amount, and `postedAt`
- inventory adjustment line `lineNumber`, `itemId`, `systemQuantity`, `countedQuantity`, `varianceQuantity`, `unitCost`, `unitOfMeasure`, `description`, and `lineTotalAmount`
- warehouse balance `itemId`, `warehouseId`, `onHandQuantity`, and `valuationAmount`
- stock movement history `movementType`, transaction references, quantity in/out, value in/out, and running warehouse balances
- cost layer `remainingQuantity`, `unitCost`, source movement metadata, and source references
- informational item-level balances `onHandQuantity` and `valuationAmount`
- inventory policy `id` and `costingMethod`

Accounting meaning:

- inventory item master and warehouse master records now persist the foundational Phase 5 inventory setup slices
- each item can store default posting-account mappings for inventory, cost of goods sold, sales, and adjustments
- warehouse masters support active/inactive control, transit/staging classification, and a single default transit location flag
- goods receipts can be saved as drafts, updated while still in draft, cancelled before posting, and posted to increase both warehouse-level and item-level quantity/value balances
- goods receipt lines preserve warehouse-linked intake history with item, quantity, unit-cost, and source-reference context
- goods issues can be saved as drafts, updated while still in draft, cancelled before posting, and posted to decrease both warehouse-level and item-level quantity/value balances
- goods issue posting validates source-warehouse availability, applies configurable costing (`WEIGHTED_AVERAGE` or `FIFO`), and writes stock movement history rows with running balances
- inventory policy stores the organization-selected valuation method used by goods issue, transfer, and adjustment-out costing flows
- inventory transfers can be saved as drafts, updated while still in draft, cancelled before posting, and posted as warehouse-to-warehouse operational documents with both transfer-out and transfer-in stock movement rows
- transfer posting validates active source/destination warehouses, enforces source availability based on warehouse balance, and preserves item-level totals while moving warehouse-level balances and valuation
- inventory adjustments can be saved as drafts, updated while still in draft, cancelled before posting, and posted as warehouse-linked variance documents
- adjustment posting supports positive/negative variance lines, updates warehouse and item balances, and records adjustment-in/adjustment-out movement history with costing-aware values
- posted inventory receipts/issues/transfers/adjustments can be marked `REVERSED` for audit history, with reverse action entries logged in `InventoryTransactionAuditLog`
- optional inventory accounting integration creates and posts Journal Entries for goods receipts, goods issues, and inventory adjustments when `INVENTORY_ACCOUNTING_ENABLED` is enabled
- stock movement history is stored in `InventoryStockMovement` for inquiry filters and source-document drill-down behavior
- items can now point to a dedicated preferred warehouse record, while `preferredWarehouseCode` remains as a compatibility/reference mirror

### Payroll

Main models:

- `Employee`
- `PayrollGroup`
- `PayrollComponent`
- `PayrollGroupComponent`
- `EmployeePayrollComponent`
- `PayrollRule`
- `PayrollPeriod`
- `Payslip`
- `PayslipLine`
- `PayrollAdjustment`
- `PayrollPayment`
- `PayrollPaymentAllocation`

Key fields:

- employee `code`, `name`, `department`, `position`, `joiningDate`, `paymentMethod`, `status`, optional payroll group link/string, and `currentBalance`
- payroll group `code`, `name`, active flag, component assignments, rules, employees, and periods
- payroll component `code`, `name`, `type`, `calculationMethod`, default amount/percentage, optional formula, taxable flag, and linked expense/liability accounts
- employee and group component assignment amount/percentage/quantity, optional installment amount, effective dates, recurring flag, and optional employee outstanding balance for tracked deductions
- payroll rule `code`, `name`, type, component link, optional group link, calculation method, amount/percentage/formula, and active flag
- payroll period `reference`, `name`, payroll group link/string, cycle, start/end/payment dates, status, payroll payable account, and optional journal entry link
- payslip `reference`, status, employee/period links, gross pay, deductions, employer contributions, net pay, paid/outstanding amounts, notes, and lines
- payroll adjustment `reference`, type, period/payslip/employee links, amount, description, and adjustment/reversal journal-entry link
- payroll payment `reference`, status, payment date, period/employee links, bank/cash account, amount, allocation totals, and bank/cash transaction link

Accounting meaning:

- employee records are deactivated rather than deleted so historical payroll remains reportable
- payroll components link to Phase 1 posting accounts instead of creating payroll-specific ledgers
- generated payslips snapshot component lines and totals for a payroll period
- posting a payroll period creates and posts a journal entry through Phase 1; earnings/benefits debit expense accounts, deductions and employer contributions credit liability accounts, and net pay credits the payroll payable account
- posted payroll periods and payslips are locked from direct draft editing and retain the journal-entry reference
- salary payments are settled through Phase 2 bank/cash payment posting and allocate against posted payslips
- payment allocation updates payslip paid/outstanding amounts and reduces employee payroll payable balance
- posted payslips can receive auditable adjustment entries, and posted payroll periods/payments can be reversed through Phase 1 reversal control or compensating Phase 2 bank/cash transactions

### Phase 7 Fixed Assets

Main models:

- `FixedAssetCategory`
- `FixedAsset`
- `FixedAssetAcquisition`
- `FixedAssetDepreciationRun`
- `FixedAssetDepreciationLine`
- `FixedAssetDisposal`
- `FixedAssetTransfer`

Key fields:

- fixed asset category `code`, `name`, `status`, `depreciationMethod`, `usefulLifeMonths`, `depreciationRate`, and linked capitalization/accumulated-depreciation/depreciation-expense/disposal/gain-loss accounts
- fixed asset `code`, `name`, `status`, category link/string, acquisition date, in-service date, cost, salvage value, useful life months, depreciation method, depreciation rate, accumulated depreciation, net book value, optional serial/location/custodian details, and notes
- acquisition `reference`, `status`, asset link, acquisition date, capitalization account, supplier/reference details, amount, notes, and optional journal entry link
- depreciation run `reference`, `status`, run date, posting period description, notes, totals, optional journal entry link, and related depreciation lines
- depreciation line depreciation-run link, asset link, depreciation amount, accumulated depreciation after run, and net book value after run
- disposal `reference`, `status`, asset link, disposal date, disposal method, proceeds, disposal-expense clearing account, gain/loss amount, notes, and optional journal entry link
- transfer `reference`, `status`, asset link, transfer date, from/to location or custodian details, notes, and posting/reversal timestamps

Accounting meaning:

- fixed assets are maintained as long-lived masters with lifecycle documents rather than one-off journal-only records
- asset categories centralize default posting accounts and depreciation assumptions that seed new asset records
- acquisition posting capitalizes the asset cost through Phase 1 journal posting and updates the asset carrying amount
- depreciation runs snapshot depreciation by asset, increase accumulated depreciation, reduce net book value, and optionally post depreciation expense through Phase 1
- disposal records preserve proceeds, disposal-expense clearing, accumulated depreciation relief, and gain/loss recognition with auditable journal-entry linkage
- transfer records move asset responsibility/location without changing asset cost, while preserving posting/reversal history for inquiry and audit
- inactive or disposed assets remain historically reportable and linked to prior lifecycle transactions

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
- `AccountSubtype`
- `JournalEntryType`
- `PaymentMethodType`
- `Tax`

Accounting meaning:

- allows enterprise-style segmented coding and reference data
- links segment values to accounts
- provides a controlled list of user-defined account classes (stored on `Account.subtype` as a string)
- provides controlled tax codes with type, rate, active status, and optional `Account` mapping for sales/purchase tax posting
- active tax codes are used by document forms; inactive tax codes remain available for historical lines that already reference them

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
  ├─ bankCashAccount -> BankCashAccount?
  ├─ journalLines -> JournalEntryLine[]
  └─ ledgerLines -> LedgerTransaction[]

BankCashAccount
  ├─ account -> Account
  ├─ type -> active PaymentMethodType.name (application-level validation)
  └─ reconciliations -> BankReconciliation[]

BankReconciliation
  ├─ bankCashAccount -> BankCashAccount
  ├─ statementLines -> BankStatementLine[]
  └─ matches -> BankReconciliationMatch[]

BankStatementLine
  ├─ reconciliation -> BankReconciliation
  └─ matches -> BankReconciliationMatch[]

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
  ├─ bankReconciliationMatches -> BankReconciliationMatch[]
  └─ fiscalPeriod -> FiscalPeriod
```

## Module Ownership Map

Ownership by module:

- Chart of Accounts:
  - `Account`
- Payment Methods:
  - `BankCashAccount`
  - `BankCashTransaction`
  - `BankReconciliation`
  - `BankStatementLine`
  - `BankReconciliationMatch`
  - reads linked `Account`
  - reads linked `LedgerTransaction`
  - creates linked `JournalEntry` rows through Phase 1 journal/posting services when receipt, payment, or transfer drafts are posted
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
  - `AccountSubtype`
  - `JournalEntryType`
  - `PaymentMethodType`
  - `Tax`
- Audit:
  - `AuditLog`
- Platform Auth:
  - `User`
- Sales & Receivables:
- `Customer`
- `SalesQuotation`
- `SalesQuotationLine`
- `SalesOrder`
- `SalesOrderLine`
- `SalesInvoice`
- `SalesInvoiceLine`
- `CreditNote`
- `CreditNoteLine`
- `ReceiptAllocation`
- reads posted `BankCashTransaction` for receipt allocations
- creates optional customer-linked posted `BankCashTransaction` rows for receipts recorded from the Sales module
  - creates linked `JournalEntry` rows through Phase 1 journal/posting services when invoices and credit notes are posted
- Purchases:
  - `Supplier`
  - `PurchaseRequest`
  - `PurchaseRequestLine`
  - `PurchaseRequestStatusHistory`
- `PurchaseOrder`
- `PurchaseOrderLine`
- `PurchaseInvoice`
- `PurchaseInvoiceLine`
- `SupplierPayment`
- `SupplierPaymentAllocation`
- `DebitNote`
- `DebitNoteLine`
- currently owns supplier masters, purchase-request lifecycle, request-status audit history, request-to-draft-order traceability, purchase-invoice draft capture, supplier payment allocation/posting orchestration, and debit-note operational lifecycle
- Inventory:
  - `InventoryItem`
  - `InventoryWarehouse`
- `InventoryGoodsReceipt`
- `InventoryGoodsReceiptLine`
- `InventoryGoodsIssue`
- `InventoryGoodsIssueLine`
- `InventoryTransfer`
- `InventoryTransferLine`
- `InventoryAdjustment`
- `InventoryAdjustmentLine`
- `InventoryWarehouseBalance`
- `InventoryStockMovement`
- `InventoryCostLayer`
- `InventoryPolicy`
  - currently owns item-master setup, warehouse master setup, goods-receipt/issue/transfer/adjustment draft-post-cancel behavior, default account mapping, reorder metadata, active/inactive control, warehouse transit flags, configurable costing method behavior, warehouse-level and item-level balance updates, stock movement inquiry history, optional accounting integration, and stock availability controls
- Payroll:
  - `Employee`
  - `PayrollGroup`
  - `PayrollComponent`
  - `PayrollGroupComponent`
  - `EmployeePayrollComponent`
  - `PayrollRule`
  - `PayrollPeriod`
  - `Payslip`
  - `PayslipLine`
  - `PayrollAdjustment`
  - `PayrollPayment`
  - `PayrollPaymentAllocation`
  - owns employee masters, payroll setup, rules/formulas, payslip generation, payroll posting/reversal orchestration, adjustment posting, salary-payment allocation/settlement/reversal, and payroll inquiry while reusing Phase 1 journal/posting/reversal services and Phase 2 bank/cash payments
- Reporting:
  - reads `Account`
  - reads `LedgerTransaction`
  - reads `BankCashAccount`
  - reads `AuditLog`
  - currently owns read-only report composition for summary inquiry, trial balance, balance sheet, profit and loss, cash movement, general-ledger inquiry, and audit inquiry without introducing Phase 8-specific persistence in this slice

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
  - The system may allocate codes using either:
    - **Legacy/string allocation** for non-numeric charts (including segmented enterprise codes)
    - **7-digit numeric hierarchical allocation** when the parent code is exactly 7 digits (e.g. `1000000` → `1100000` → `1100001`)

## What Not To Assume

Do not assume:

- later ERP phases already have schema ownership
- the ledger is a generic reporting table unrelated to posting
- header and posting accounts are interchangeable
- balance updates can be skipped because ledger rows exist
- a bank/cash registry row replaces the linked chart-of-accounts account; it is an operational wrapper around that posting account
