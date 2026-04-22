CREATE TYPE "InventoryCostingMethod" AS ENUM ('WEIGHTED_AVERAGE', 'FIFO');
CREATE TYPE "InventoryStockMovementType" AS ENUM ('GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');

ALTER TABLE "InventoryGoodsReceipt" ADD COLUMN "journalEntryId" TEXT;
ALTER TABLE "InventoryGoodsIssue" ADD COLUMN "journalEntryId" TEXT;
ALTER TABLE "InventoryAdjustment" ADD COLUMN "journalEntryId" TEXT;

CREATE TABLE "InventoryWarehouseBalance" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "onHandQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "valuationAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryWarehouseBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryCostLayer" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "remainingQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sourceMovementType" "InventoryStockMovementType" NOT NULL,
    "sourceTransactionType" TEXT NOT NULL,
    "sourceTransactionId" TEXT NOT NULL,
    "sourceLineId" TEXT,
    "sourceReference" TEXT,
    "sourceDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCostLayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryStockMovement" (
    "id" TEXT NOT NULL,
    "movementType" "InventoryStockMovementType" NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionLineId" TEXT,
    "transactionReference" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantityIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantityOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valueIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valueOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "runningQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "runningValuation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryGoodsReceipt_journalEntryId_key" ON "InventoryGoodsReceipt"("journalEntryId");
CREATE UNIQUE INDEX "InventoryGoodsIssue_journalEntryId_key" ON "InventoryGoodsIssue"("journalEntryId");
CREATE UNIQUE INDEX "InventoryAdjustment_journalEntryId_key" ON "InventoryAdjustment"("journalEntryId");

CREATE UNIQUE INDEX "InventoryWarehouseBalance_itemId_warehouseId_key" ON "InventoryWarehouseBalance"("itemId", "warehouseId");
CREATE INDEX "InventoryWarehouseBalance_warehouseId_itemId_idx" ON "InventoryWarehouseBalance"("warehouseId", "itemId");

CREATE INDEX "InventoryCostLayer_itemId_warehouseId_sourceDate_createdAt_idx" ON "InventoryCostLayer"("itemId", "warehouseId", "sourceDate", "createdAt");
CREATE INDEX "InventoryCostLayer_itemId_remainingQuantity_idx" ON "InventoryCostLayer"("itemId", "remainingQuantity");

CREATE INDEX "InventoryStockMovement_itemId_warehouseId_transactionDate_createdAt_idx" ON "InventoryStockMovement"("itemId", "warehouseId", "transactionDate", "createdAt");
CREATE INDEX "InventoryStockMovement_warehouseId_movementType_transactionDate_idx" ON "InventoryStockMovement"("warehouseId", "movementType", "transactionDate");
CREATE INDEX "InventoryStockMovement_transactionType_transactionId_idx" ON "InventoryStockMovement"("transactionType", "transactionId");

ALTER TABLE "InventoryGoodsReceipt"
ADD CONSTRAINT "InventoryGoodsReceipt_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryGoodsIssue"
ADD CONSTRAINT "InventoryGoodsIssue_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryAdjustment"
ADD CONSTRAINT "InventoryAdjustment_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryWarehouseBalance"
ADD CONSTRAINT "InventoryWarehouseBalance_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryWarehouseBalance"
ADD CONSTRAINT "InventoryWarehouseBalance_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryCostLayer"
ADD CONSTRAINT "InventoryCostLayer_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryCostLayer"
ADD CONSTRAINT "InventoryCostLayer_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryStockMovement"
ADD CONSTRAINT "InventoryStockMovement_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryStockMovement"
ADD CONSTRAINT "InventoryStockMovement_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryStockMovement"
ADD CONSTRAINT "InventoryStockMovement_balanceId_fkey"
FOREIGN KEY ("balanceId") REFERENCES "InventoryWarehouseBalance"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
