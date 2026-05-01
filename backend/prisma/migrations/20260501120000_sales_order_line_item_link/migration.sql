-- Add optional inventory item linkage to sales order lines.
ALTER TABLE "SalesOrderLine"
ADD COLUMN "itemId" TEXT;

CREATE INDEX "SalesOrderLine_itemId_idx" ON "SalesOrderLine"("itemId");

ALTER TABLE "SalesOrderLine"
ADD CONSTRAINT "SalesOrderLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT-- Prevent deletion of inventory items that are linked to sales order lines.
ON UPDATE CASCADE;--
