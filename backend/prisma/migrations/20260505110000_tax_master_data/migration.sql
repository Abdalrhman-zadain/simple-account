-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('SALES', 'PURCHASE', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE');

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "taxAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tax_taxCode_key" ON "Tax"("taxCode");

-- CreateIndex
CREATE INDEX "Tax_isActive_idx" ON "Tax"("isActive");

-- CreateIndex
CREATE INDEX "Tax_taxType_idx" ON "Tax"("taxType");

-- CreateIndex
CREATE INDEX "Tax_taxAccountId_idx" ON "Tax"("taxAccountId");

-- Add tax references to existing tax-bearing document lines.
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "DebitNoteLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "SalesQuotationLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "SalesOrderLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "taxId" TEXT;
ALTER TABLE "CreditNoteLine" ADD COLUMN "taxId" TEXT;

CREATE INDEX "PurchaseOrderLine_taxId_idx" ON "PurchaseOrderLine"("taxId");
CREATE INDEX "PurchaseInvoiceLine_taxId_idx" ON "PurchaseInvoiceLine"("taxId");
CREATE INDEX "DebitNoteLine_taxId_idx" ON "DebitNoteLine"("taxId");
CREATE INDEX "SalesQuotationLine_taxId_idx" ON "SalesQuotationLine"("taxId");
CREATE INDEX "SalesOrderLine_taxId_idx" ON "SalesOrderLine"("taxId");
CREATE INDEX "SalesInvoiceLine_taxId_idx" ON "SalesInvoiceLine"("taxId");
CREATE INDEX "CreditNoteLine_taxId_idx" ON "CreditNoteLine"("taxId");

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_taxAccountId_fkey" FOREIGN KEY ("taxAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoiceLine" ADD CONSTRAINT "PurchaseInvoiceLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DebitNoteLine" ADD CONSTRAINT "DebitNoteLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
