CREATE TYPE "InventoryItemType" AS ENUM (
    'INVENTORY',
    'NON_STOCK',
    'SERVICE',
    'RAW_MATERIAL'
);

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "category" TEXT,
    "type" "InventoryItemType" NOT NULL DEFAULT 'INVENTORY',
    "inventoryAccountId" TEXT,
    "cogsAccountId" TEXT,
    "salesAccountId" TEXT,
    "adjustmentAccountId" TEXT,
    "reorderLevel" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reorderQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "preferredWarehouseCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onHandQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "valuationAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItem_code_key" ON "InventoryItem"("code");
CREATE INDEX "InventoryItem_type_isActive_idx" ON "InventoryItem"("type", "isActive");
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_inventoryAccountId_fkey"
FOREIGN KEY ("inventoryAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_cogsAccountId_fkey"
FOREIGN KEY ("cogsAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_salesAccountId_fkey"
FOREIGN KEY ("salesAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_adjustmentAccountId_fkey"
FOREIGN KEY ("adjustmentAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
