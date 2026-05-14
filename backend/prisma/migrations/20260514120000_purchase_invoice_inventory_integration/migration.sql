-- Connect purchase invoice inventory lines to warehouses and item expense accounts,
-- and add an explicit purchase receipt stock movement type.

ALTER TYPE "InventoryStockMovementType" ADD VALUE IF NOT EXISTS 'PURCHASE_RECEIPT';

ALTER TABLE "InventoryItem"
ADD COLUMN "expenseAccountId" TEXT;

ALTER TABLE "PurchaseInvoiceLine"
ADD COLUMN "warehouseId" TEXT;

CREATE INDEX "InventoryItem_expenseAccountId_idx" ON "InventoryItem"("expenseAccountId");
CREATE INDEX "PurchaseInvoiceLine_warehouseId_idx" ON "PurchaseInvoiceLine"("warehouseId");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_expenseAccountId_fkey"
FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoiceLine"
ADD CONSTRAINT "PurchaseInvoiceLine_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
