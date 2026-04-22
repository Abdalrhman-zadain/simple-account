CREATE TYPE "InventoryAdjustmentStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "InventoryAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "adjustmentDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "totalVarianceQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAdjustmentLine" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "systemQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "countedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "varianceQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustmentLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryAdjustment_reference_key" ON "InventoryAdjustment"("reference");
CREATE INDEX "InventoryAdjustment_warehouseId_status_adjustmentDate_idx" ON "InventoryAdjustment"("warehouseId", "status", "adjustmentDate");
CREATE INDEX "InventoryAdjustment_status_adjustmentDate_idx" ON "InventoryAdjustment"("status", "adjustmentDate");
CREATE UNIQUE INDEX "InventoryAdjustmentLine_adjustmentId_lineNumber_key" ON "InventoryAdjustmentLine"("adjustmentId", "lineNumber");
CREATE INDEX "InventoryAdjustmentLine_itemId_idx" ON "InventoryAdjustmentLine"("itemId");

ALTER TABLE "InventoryAdjustment"
ADD CONSTRAINT "InventoryAdjustment_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryAdjustmentLine"
ADD CONSTRAINT "InventoryAdjustmentLine_adjustmentId_fkey"
FOREIGN KEY ("adjustmentId") REFERENCES "InventoryAdjustment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryAdjustmentLine"
ADD CONSTRAINT "InventoryAdjustmentLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
