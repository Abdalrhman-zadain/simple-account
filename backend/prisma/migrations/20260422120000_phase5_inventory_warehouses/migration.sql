CREATE TABLE "InventoryWarehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "responsiblePerson" TEXT,
    "isTransit" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryWarehouse_code_key" ON "InventoryWarehouse"("code");
CREATE INDEX "InventoryWarehouse_isActive_name_idx" ON "InventoryWarehouse"("isActive", "name");

ALTER TABLE "InventoryItem" ADD COLUMN "preferredWarehouseId" TEXT;
CREATE INDEX "InventoryItem_preferredWarehouseId_idx" ON "InventoryItem"("preferredWarehouseId");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_preferredWarehouseId_fkey"
FOREIGN KEY ("preferredWarehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
