ALTER TABLE "InventoryItem"
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "itemImageUrl" TEXT,
ADD COLUMN "attachmentsText" TEXT,
ADD COLUMN "salesReturnAccountId" TEXT,
ADD COLUMN "defaultSalesPrice" DECIMAL(18,4),
ADD COLUMN "defaultPurchasePrice" DECIMAL(18,4),
ADD COLUMN "currencyCode" VARCHAR(12),
ADD COLUMN "taxable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultTaxId" TEXT,
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "InventoryItemUnitConversion" (
  "id" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "conversionFactorToBaseUnit" DECIMAL(18,6) NOT NULL,
  "barcode" TEXT,
  "defaultSalesPrice" DECIMAL(18,4),
  "defaultPurchasePrice" DECIMAL(18,4),
  "isBaseUnit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryItemUnitConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItemUnitConversion_barcode_key" ON "InventoryItemUnitConversion"("barcode");
CREATE UNIQUE INDEX "InventoryItemUnitConversion_inventoryItemId_unitId_key" ON "InventoryItemUnitConversion"("inventoryItemId", "unitId");
CREATE INDEX "InventoryItemUnitConversion_inventoryItemId_idx" ON "InventoryItemUnitConversion"("inventoryItemId");
CREATE INDEX "InventoryItemUnitConversion_unitId_idx" ON "InventoryItemUnitConversion"("unitId");
CREATE INDEX "InventoryItemUnitConversion_barcode_idx" ON "InventoryItemUnitConversion"("barcode");
CREATE INDEX "InventoryItem_defaultTaxId_idx" ON "InventoryItem"("defaultTaxId");
CREATE INDEX "InventoryItem_salesReturnAccountId_idx" ON "InventoryItem"("salesReturnAccountId");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_salesReturnAccountId_fkey"
FOREIGN KEY ("salesReturnAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_defaultTaxId_fkey"
FOREIGN KEY ("defaultTaxId") REFERENCES "Tax"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemUnitConversion"
ADD CONSTRAINT "InventoryItemUnitConversion_inventoryItemId_fkey"
FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryItemUnitConversion"
ADD CONSTRAINT "InventoryItemUnitConversion_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "InventoryUnitOfMeasure"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
