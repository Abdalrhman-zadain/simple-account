-- Link purchase invoice lines to inventory item cards while preserving existing manual history.
ALTER TABLE "PurchaseInvoiceLine"
ADD COLUMN "itemId" TEXT;

CREATE INDEX "PurchaseInvoiceLine_itemId_idx" ON "PurchaseInvoiceLine"("itemId");

ALTER TABLE "PurchaseInvoiceLine"
ADD CONSTRAINT "PurchaseInvoiceLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
