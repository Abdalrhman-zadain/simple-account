# Inventory module

Ownership root for implemented Phase 5 inventory workflows.

Current subdomains:

- `item-groups` (implemented)
- `item-categories` (implemented)
- `item-master` (implemented)
- `units-of-measure` (implemented)
- `warehouses` (implemented)
- `goods-receipts` (implemented)
- `goods-issues` (implemented)
- `transfers` (implemented)
- `adjustments` (implemented)
- `stock-ledger` (implemented)
- `policy` (implemented: valuation method configuration)
- `shared` (implemented: posting/costing helpers)

This folder now includes end-to-end stock-control behavior for item groups, item categories, material/item cards, units of measure, warehouse masters, receipt/issue/transfer/adjustment draft-post-cancel flows, warehouse-level balance maintenance, stock movement inquiry history, organization-level costing policy (`/inventory/policy`) with `WEIGHTED_AVERAGE` or `FIFO`, and optional accounting integration through Phase 1 journal/posting services.
