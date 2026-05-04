-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "itemId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseRequestLine" ADD COLUMN     "itemId" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_itemId_idx" ON "PurchaseOrderLine"("itemId");

-- CreateIndex
CREATE INDEX "PurchaseRequestLine_itemId_idx" ON "PurchaseRequestLine"("itemId");

-- AddForeignKey
ALTER TABLE "PurchaseRequestLine" ADD CONSTRAINT "PurchaseRequestLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
