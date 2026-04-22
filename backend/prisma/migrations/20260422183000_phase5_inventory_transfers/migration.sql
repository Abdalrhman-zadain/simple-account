CREATE TYPE "InventoryTransferStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "InventoryTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "sourceWarehouseId" TEXT NOT NULL,
    "destinationWarehouseId" TEXT NOT NULL,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransferLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryTransfer_reference_key" ON "InventoryTransfer"("reference");
CREATE INDEX "InventoryTransfer_sourceWarehouseId_status_transferDate_idx" ON "InventoryTransfer"("sourceWarehouseId", "status", "transferDate");
CREATE INDEX "InventoryTransfer_destinationWarehouseId_status_transferDate_idx" ON "InventoryTransfer"("destinationWarehouseId", "status", "transferDate");
CREATE INDEX "InventoryTransfer_status_transferDate_idx" ON "InventoryTransfer"("status", "transferDate");
CREATE UNIQUE INDEX "InventoryTransferLine_transferId_lineNumber_key" ON "InventoryTransferLine"("transferId", "lineNumber");
CREATE INDEX "InventoryTransferLine_itemId_idx" ON "InventoryTransferLine"("itemId");

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_sourceWarehouseId_fkey"
FOREIGN KEY ("sourceWarehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_destinationWarehouseId_fkey"
FOREIGN KEY ("destinationWarehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransferLine"
ADD CONSTRAINT "InventoryTransferLine_transferId_fkey"
FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryTransferLine"
ADD CONSTRAINT "InventoryTransferLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
