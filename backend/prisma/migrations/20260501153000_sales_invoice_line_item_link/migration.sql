-- Add optional inventory item linkage to sales invoice lines.
ALTER TABLE "SalesInvoiceLine"
ADD COLUMN "itemId" TEXT;

CREATE INDEX "SalesInvoiceLine_itemId_idx" ON "SalesInvoiceLine"("itemId");

ALTER TABLE "SalesInvoiceLine"
ADD CONSTRAINT "SalesInvoiceLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;-- mean that if an inventory item is deleted,
-- any sales invoice lines linked to it will prevent the deletion, and 
--if the inventory item's ID is updated, the change will cascade to the linked sales invoice lines.
