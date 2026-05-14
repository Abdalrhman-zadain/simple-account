ALTER TYPE "InventoryStockMovementType" ADD VALUE IF NOT EXISTS 'SALES_ISSUE';

ALTER TABLE "SalesInvoiceLine"
ADD COLUMN "warehouseId" TEXT;

CREATE INDEX "SalesInvoiceLine_warehouseId_idx" ON "SalesInvoiceLine"("warehouseId");

ALTER TABLE "SalesInvoiceLine"
ADD CONSTRAINT "SalesInvoiceLine_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
