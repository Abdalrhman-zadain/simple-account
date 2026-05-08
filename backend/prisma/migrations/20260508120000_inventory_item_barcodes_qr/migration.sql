ALTER TABLE "InventoryItem"
ADD COLUMN "barcode" TEXT,
ADD COLUMN "qrCodeValue" TEXT;

CREATE UNIQUE INDEX "InventoryItem_barcode_key" ON "InventoryItem"("barcode");
CREATE INDEX "InventoryItem_barcode_idx" ON "InventoryItem"("barcode");
