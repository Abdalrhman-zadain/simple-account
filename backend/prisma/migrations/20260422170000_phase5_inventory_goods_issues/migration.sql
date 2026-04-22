CREATE TYPE "InventoryIssueStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

CREATE TABLE "InventoryGoodsIssue" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "InventoryIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sourceSalesOrderRef" TEXT,
    "sourceSalesInvoiceRef" TEXT,
    "sourceProductionRequestRef" TEXT,
    "sourceInternalRequestRef" TEXT,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryGoodsIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryGoodsIssueLine" (
    "id" TEXT NOT NULL,
    "goodsIssueId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryGoodsIssueLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryGoodsIssue_reference_key" ON "InventoryGoodsIssue"("reference");
CREATE INDEX "InventoryGoodsIssue_warehouseId_status_issueDate_idx" ON "InventoryGoodsIssue"("warehouseId", "status", "issueDate");
CREATE INDEX "InventoryGoodsIssue_status_issueDate_idx" ON "InventoryGoodsIssue"("status", "issueDate");
CREATE UNIQUE INDEX "InventoryGoodsIssueLine_goodsIssueId_lineNumber_key" ON "InventoryGoodsIssueLine"("goodsIssueId", "lineNumber");
CREATE INDEX "InventoryGoodsIssueLine_itemId_idx" ON "InventoryGoodsIssueLine"("itemId");

ALTER TABLE "InventoryGoodsIssue"
ADD CONSTRAINT "InventoryGoodsIssue_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryGoodsIssueLine"
ADD CONSTRAINT "InventoryGoodsIssueLine_goodsIssueId_fkey"
FOREIGN KEY ("goodsIssueId") REFERENCES "InventoryGoodsIssue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryGoodsIssueLine"
ADD CONSTRAINT "InventoryGoodsIssueLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
