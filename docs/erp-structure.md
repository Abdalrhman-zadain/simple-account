# ERP System Modular Structure

## Understanding Principles

This ERP system is organized as a set of **phases**, **modules**, and **submodules**, NOT as one flat project.

### Important Rules:

1. Treat each module as an independent business area
2. Treat each submodule as part of its parent module
3. Understand dependencies between modules
4. Do not mix requirements from one module into another unless there is a direct integration
5. Always organize output in this order:
   - Phase
   - Module
   - Submodule
   - Purpose
   - Main entities
   - Main business rules
   - Accounting impact if any
   - Dependencies on other modules
6. Generate requirements, database design, APIs, services, or UI only for the specified module
7. Always distinguish between:
   - **Core accounting engine** (foundation for all accounting)
   - **Operational modules** (create accounting transactions)
8. Design should be scalable, modular, and maintainable (real ERP system)

---

## Phase 1: Accounting Foundation

### Module: Accounting Core

The accounting engine of the ERP. It defines accounts, records journal entries, posts transactions, updates balances, stores ledger history, and applies accounting controls.

#### Submodules:

- **Chart of Accounts** - Define and manage account structure
- **Journal Entries** - Record financial transactions
- **Posting Logic** - Verify and move entries to ledger
- **General Ledger** - Store complete transaction history
- **Reversal & Control** - Manage corrections and preventive controls
- **Validation Rules** - Enforce accounting constraints

#### Main Entities:

- Account
- AccountType
- JournalEntry
- JournalEntryLine
- LedgerTransaction
- PostingBatch
- ReversalEntry

#### Business Rules:

- Every journal entry must be balanced (Debit = Credit)
- Total debit must equal total credit
- Posted entries cannot be edited directly (audit trail)
- Reversal must create a new reversing entry (not deletion)
- Each transaction must have a unique reference number
- Financial records must not be deleted (compliance)
- Ledger must keep full transaction history
- All posting must be transactional (all-or-nothing)

#### Accounting Impact:

- **This module is the foundation for all accounting behavior in the ERP**
- All other financial modules depend on this for data integrity

#### Dependencies:

- **No dependency** on later operational modules
- **All later financial modules depend on this module**

---

## Phase 2: Cash Management

### Module: Bank & Cash

Manages money movement in and out of the business through bank and cash accounts.

#### Submodules:

- **Bank Accounts** - Manage bank account definitions and status
- **Cash Accounts** - Manage physical cash locations
- **Receipts** - Record incoming cash from sales and other sources
- **Payments** - Record outgoing cash for purchases and expenses
- **Inter-Account Transfers** - Move cash between accounts
- **Bank Reconciliation** - Match system records with bank statements

#### Main Entities:

- BankAccount
- CashAccount
- Receipt
- Payment
- Transfer
- BankStatement
- Reconciliation
- ReconciliationLine

#### Business Rules:

- Every receipt must increase a bank/cash account
- Every payment must decrease a bank/cash account
- Every transfer must move value from one account to another
- Posted receipts, payments, and transfers cannot be edited directly
- Each receipt, payment, and transfer must have a unique reference number
- Reconciliation must compare system transactions against bank statement records
- Unmatched transactions must remain visible until resolved
- Bank reconciliation must identify and flag discrepancies

#### Accounting Impact:

- Receipts, payments, and transfers must automatically create accounting entries through Accounting Core
- Creates cash movement records that impact bank/cash accounts
- Reconciliation results must be auditable

#### Dependencies:

- **Depends on:** Accounting Core
- **Used by:** Sales, Purchases, Payroll, and other financial modules
- **Integration point:** Receipts from Sales, Payments to Suppliers, Payroll payments

---

## Phase 3: Revenue Cycle

### Module: Sales

Manages customer-side commercial transactions from quotation to invoicing and collection.

#### Submodules:

- **Customers** - Customer master data and credit management
- **Quotations** - Pre-sales pricing and proposals
- **Sales Orders** - Confirmed customer orders
- **Sales Invoices** - Revenue recognition and receivables
- **Customer Receipts** - Settlement of customer invoices
- **Credit Notes** - Adjustments for returned goods or disputes

#### Main Entities:

- Customer
- SalesQuotation
- SalesOrder
- SalesInvoice
- ReceiptAllocation
- CreditNote

#### Business Rules:

- A sales invoice creates receivable and revenue impact
- Customer receipt may settle one or multiple invoices
- Credit note reduces customer balance
- Transactions must be traceable to the customer
- Posted invoices and credit notes must be controlled
- Sales invoices must generate accounting entries
- Customer payment allocation must match invoice-to-receipt mapping

#### Accounting Impact:

- Must post to:
  - Accounts Receivable (AR)
  - Revenue (Sales/Service Income)
  - Tax (Sales Tax/VAT)
  - Cash/Bank when payments received
  - Cost of Goods Sold (if inventory applied)

#### Dependencies:

- **Depends on:** Accounting Core
- **Integrates with:** Bank & Cash (customer receipts)
- **May integrate with:** Inventory (if selling stock)
- **Provides data to:** Reporting module

---

## Phase 4: Procure-to-Pay

### Module: Purchases

Manages supplier-side purchasing and settlement transactions.

#### Submodules:

- **Suppliers** - Supplier master data and payment terms
- **Purchase Requests** - Internal procurement requests
- **Purchase Orders** - Supplier commitments
- **Purchase Invoices** - Supplier invoices and payables
- **Supplier Payments** - Settlement of supplier invoices
- **Debit Notes** - Adjustments for rejected goods or disputes

#### Main Entities:

- Supplier
- PurchaseOrder
- PurchaseInvoice
- SupplierPayment
- DebitNote

#### Business Rules:

- Purchase invoice creates payable and expense/inventory impact
- Supplier payment reduces payable
- Debit note adjusts supplier balance
- Transactions must be traceable to the supplier
- Posted invoices and debit notes must be controlled
- Purchase invoices must generate accounting entries
- Supplier payment allocation must match invoice-to-payment mapping

#### Accounting Impact:

- Must post to:
  - Accounts Payable (AP)
  - Expense accounts (purchases, services)
  - Inventory accounts (if applicable)
  - Tax (Purchase Tax/VAT)
  - Cash/Bank when payments made

#### Dependencies:

- **Depends on:** Accounting Core
- **Integrates with:** Bank & Cash (supplier payments)
- **May integrate with:** Inventory (if receiving stock)
- **Provides data to:** Reporting module

---

## Phase 5: Stock Control

### Module: Inventory

Manages stock quantities, movement, valuation, and warehouse control.

#### Submodules:

- **Item Master** - Product definitions and properties
- **Goods Receipt** - Incoming stock from purchases
- **Goods Issue** - Outgoing stock from sales
- **Inventory Transfers** - Movement between warehouses
- **Inventory Adjustments** - Corrections for discrepancies
- **Costing** - Valuation methods and cost layers

#### Main Entities:

- Item
- Warehouse
- StockMovement
- InventoryTransfer
- InventoryAdjustment
- CostLayer

#### Business Rules:

- Stock quantity must update on every movement
- Negative stock handling must follow system policy (allow or prevent)
- Inventory valuation method must be consistent (FIFO, LIFO, WAC)
- Stock adjustments must be auditable with reasons
- Physical stock counts must be reconcilable
- Cost layers must track acquisition price and quantity

#### Accounting Impact:

- Inventory movements may create accounting entries:
  - Goods receipt updates inventory asset
  - Goods issue updates COGS
  - Inventory adjustments affect inventory and variance accounts
  - Valuation method impacts profit margins

#### Dependencies:

- **Depends on:** Accounting Core
- **Integrates with:** Purchases (goods receipt)
- **Integrates with:** Sales (goods issue)
- **Provides data to:** Reporting module

---

## Phase 6: Human Resources Financials

### Module: Payroll

Manages salary calculations and payroll-related financial entries.

#### Submodules:

- **Employees** - Employee master data and salary setup
- **Payroll Setup** - Salary components, deductions, benefits
- **Payslips** - Monthly/periodic salary calculations
- **Deductions** - Tax, insurance, loans, and other deductions
- **Benefits** - Health insurance, allowances, and benefits
- **Payroll Posting** - Accounting entry generation from payroll

#### Main Entities:

- Employee
- PayrollPeriod
- Payslip
- Deduction
- Benefit
- PayrollJournal

#### Business Rules:

- Payslip must calculate earnings and deductions correctly
- Payroll posting must be controlled and auditable
- Payroll periods should be locked after posting (prevent changes)
- Deductions must be verified against employee records
- Payroll must comply with tax regulations
- Historical payroll data must be retained

#### Accounting Impact:

- Must generate:
  - Salary expense accounts
  - Payable accounts (net salary, deductions)
  - Tax liabilities
  - Benefit accruals
  - Cash/Bank when paid

#### Dependencies:

- **Depends on:** Accounting Core
- **Integrates with:** Bank & Cash (payroll payments)
- **Provides data to:** Reporting module

---

## Phase 7: Long-Term Resources

### Module: Fixed Assets

Manages fixed assets across their lifecycle.

#### Submodules:

- **Asset Register** - Asset master data and tracking
- **Asset Acquisition** - Recording asset purchase and cost
- **Depreciation** - Periodic depreciation charge
- **Asset Disposal** - Removal and gain/loss calculation
- **Asset Transfer** - Movement between departments/locations

#### Main Entities:

- FixedAsset
- DepreciationSchedule
- AssetAcquisition
- AssetDisposal

#### Business Rules:

- Every asset must have acquisition date, cost, and method
- Depreciation must follow selected policy (straight-line, declining, etc.)
- Disposal must update status and calculate gain/loss
- Asset register must be auditable and complete
- Depreciation must be calculated periodically and posted

#### Accounting Impact:

- Must generate:
  - Asset acquisition (debit Asset, credit Cash/AP)
  - Depreciation expense (debit Expense, credit Accumulated Depreciation)
  - Asset disposal gain/loss (debit/credit P&L accounts)

#### Dependencies:

- **Depends on:** Accounting Core
- **Provides data to:** Reporting module

---

## Phase 8: Reporting & Control

### Module: Reporting

Provides financial visibility, compliance, and management analysis.

#### Submodules:

- **Trial Balance** - Unbilled general ledger summary
- **Balance Sheet** - Asset, liability, equity snapshot
- **Profit and Loss** - Revenue and expense summary
- **Cash Flow** - Cash movements and positioning
- **General Ledger Reports** - Detailed transaction history
- **Audit Reports** - Compliance and control reports

#### Main Entities:

- ReportDefinition
- FinancialSnapshot
- ReportFilter

#### Business Rules:

- Reports must use posted data only (no draft entries)
- Reports must support date filters and period selection
- Report totals must match ledger balances (reconcilable)
- Reports must be auditable and traceable
- Reports should cache snapshots for historical comparison

#### Accounting Impact:

- Reporting reads from all accounting and operational modules
- Should NOT create entries (read-only)
- Provides financial accountability and compliance

#### Dependencies:

- **Depends on:** Accounting Core and all posted module data
- **Requires data from:**
  - Accounting Core (ledger balances)
  - Bank & Cash (bank/cash positions)
  - Sales (receivables, revenue)
  - Purchases (payables, expenses)
  - Inventory (stock value)
  - Payroll (salary expenses)
  - Fixed Assets (asset values, depreciation)

---

## Architecture Visualization

```
Phase 1: FOUNDATION
└── Accounting Core
    ├── Chart of Accounts
    ├── Journal Entries
    ├── Posting Logic
    ├── General Ledger
    ├── Reversal & Control
    └── Validation Rules

Phase 2: CASH FLOW
└── Bank & Cash
    ├── Bank Accounts
    ├── Cash Accounts
    ├── Receipts
    ├── Payments
    ├── Transfers
    └── Bank Reconciliation

Phase 3: REVENUE
└── Sales
    ├── Customers
    ├── Quotations
    ├── Sales Orders
    ├── Sales Invoices
    ├── Customer Receipts
    └── Credit Notes

Phase 4: PROCUREMENT
└── Purchases
    ├── Suppliers
    ├── Purchase Requests
    ├── Purchase Orders
    ├── Purchase Invoices
    ├── Supplier Payments
    └── Debit Notes

Phase 5: INVENTORY
└── Inventory
    ├── Item Master
    ├── Goods Receipt
    ├── Goods Issue
    ├── Inventory Transfers
    ├── Inventory Adjustments
    └── Costing

Phase 6: PAYROLL
└── Payroll
    ├── Employees
    ├── Payroll Setup
    ├── Payslips
    ├── Deductions
    ├── Benefits
    └── Payroll Posting

Phase 7: FIXED ASSETS
└── Fixed Assets
    ├── Asset Register
    ├── Asset Acquisition
    ├── Depreciation
    ├── Asset Disposal
    └── Asset Transfer

Phase 8: REPORTING
└── Reporting
    ├── Trial Balance
    ├── Balance Sheet
    ├── Profit and Loss
    ├── Cash Flow
    ├── General Ledger
    └── Audit Reports
```

---

## Dependency Map

```
Accounting Core (No dependencies ← Foundation)
    ↑
    ├─ Bank & Cash
    ├─ Sales
    ├─ Purchases
    ├─ Payroll
    ├─ Fixed Assets
    └─ Inventory (optional dependency)

Bank & Cash (Cash management)
    ↑
    ├─ Sales (customer receipts)
    ├─ Purchases (supplier payments)
    └─ Payroll (salary payments)

Sales (Revenue cycle)
    ↑
    └─ Inventory (if applicable)

Purchases (Procure-to-pay)
    ↑
    └─ Inventory (if applicable)

Reporting (Read-only aggregator)
    ↑
    └─ All modules (for data aggregation)
```

---

## Request Template

When you need work on this ERP system, please specify:

1. **Which Phase?** (1-8)
2. **Which Module?** (Accounting Core, Sales, etc.)
3. **Which Submodule(s)?** (Chart of Accounts, Sales Invoices, etc.)
4. **What do you need?** (Requirements, Database Design, APIs, Services, UI, Logic)

**Example:**

> "Phase 3, Sales module, Sales Invoices submodule. Design the database schema."

or

> "Phase 1, Accounting Core, Journal Entries and Posting Logic. Write API requirements."

This ensures output is focused, modular, and follows the ERP structure without cross-contamination.
