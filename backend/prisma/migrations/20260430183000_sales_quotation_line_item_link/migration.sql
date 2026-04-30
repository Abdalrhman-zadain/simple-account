-- Add optional inventory item linkage to sales quotation lines.
ALTER TABLE "SalesQuotationLine"
ADD COLUMN "itemId" TEXT;

CREATE INDEX "SalesQuotationLine_itemId_idx" ON "SalesQuotationLine"("itemId");

ALTER TABLE "SalesQuotationLine"
ADD CONSTRAINT "SalesQuotationLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
