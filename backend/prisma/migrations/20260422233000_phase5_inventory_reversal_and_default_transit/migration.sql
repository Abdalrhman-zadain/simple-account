ALTER TYPE "InventoryReceiptStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "InventoryIssueStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "InventoryTransferStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "InventoryAdjustmentStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

ALTER TABLE "InventoryWarehouse" ADD COLUMN "isDefaultTransit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InventoryGoodsReceipt" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "InventoryGoodsIssue" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "InventoryTransfer" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "InventoryAdjustment" ADD COLUMN "reversedAt" TIMESTAMP(3);

CREATE INDEX "InventoryWarehouse_isDefaultTransit_idx" ON "InventoryWarehouse"("isDefaultTransit");
