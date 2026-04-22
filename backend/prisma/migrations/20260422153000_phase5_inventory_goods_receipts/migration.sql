CREATE TYPE "InventoryReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

CREATE TABLE "InventoryGoodsReceipt" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "InventoryReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sourcePurchaseOrderRef" TEXT,
    "sourcePurchaseInvoiceRef" TEXT,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryGoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryGoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryGoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryGoodsReceipt_reference_key" ON "InventoryGoodsReceipt"("reference");
CREATE INDEX "InventoryGoodsReceipt_warehouseId_status_receiptDate_idx" ON "InventoryGoodsReceipt"("warehouseId", "status", "receiptDate");
CREATE INDEX "InventoryGoodsReceipt_status_receiptDate_idx" ON "InventoryGoodsReceipt"("status", "receiptDate");
CREATE UNIQUE INDEX "InventoryGoodsReceiptLine_goodsReceiptId_lineNumber_key" ON "InventoryGoodsReceiptLine"("goodsReceiptId", "lineNumber");
CREATE INDEX "InventoryGoodsReceiptLine_itemId_idx" ON "InventoryGoodsReceiptLine"("itemId");

ALTER TABLE "InventoryGoodsReceipt"
ADD CONSTRAINT "InventoryGoodsReceipt_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryGoodsReceiptLine"
ADD CONSTRAINT "InventoryGoodsReceiptLine_goodsReceiptId_fkey"
FOREIGN KEY ("goodsReceiptId") REFERENCES "InventoryGoodsReceipt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryGoodsReceiptLine"
ADD CONSTRAINT "InventoryGoodsReceiptLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
