-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_INVOICED', 'FULLY_INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'POSTED', 'APPLIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BankCashTransaction" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "CreditNoteLine" ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "itemName" TEXT,
ADD COLUMN     "lineSubtotalAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "salesRepresentative" TEXT,
ADD COLUMN     "taxInfo" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "sourceQuotationId" TEXT,
ADD COLUMN     "sourceSalesOrderId" TEXT,
ADD COLUMN     "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "SalesInvoiceLine" ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "itemName" TEXT,
ADD COLUMN     "lineSubtotalAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "SalesDocumentStatus";

-- CreateTable
CREATE TABLE "SalesQuotation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "quotationDate" TIMESTAMP(3) NOT NULL,
    "validityDate" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
    "description" TEXT,
    "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuotationLine" (
    "id" TEXT NOT NULL,
    "salesQuotationId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemName" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineSubtotalAmount" DECIMAL(18,2) NOT NULL,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL,
    "revenueAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesQuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL,
    "promisedDate" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
    "shippingDetails" TEXT,
    "description" TEXT,
    "sourceQuotationId" TEXT,
    "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemName" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineSubtotalAmount" DECIMAL(18,2) NOT NULL,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL,
    "revenueAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesQuotation_reference_key" ON "SalesQuotation"("reference");

-- CreateIndex
CREATE INDEX "SalesQuotation_customerId_status_quotationDate_idx" ON "SalesQuotation"("customerId", "status", "quotationDate");

-- CreateIndex
CREATE INDEX "SalesQuotationLine_revenueAccountId_idx" ON "SalesQuotationLine"("revenueAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesQuotationLine_salesQuotationId_lineNumber_key" ON "SalesQuotationLine"("salesQuotationId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_reference_key" ON "SalesOrder"("reference");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_status_orderDate_idx" ON "SalesOrder"("customerId", "status", "orderDate");

-- CreateIndex
CREATE INDEX "SalesOrder_sourceQuotationId_idx" ON "SalesOrder"("sourceQuotationId");

-- CreateIndex
CREATE INDEX "SalesOrderLine_revenueAccountId_idx" ON "SalesOrderLine"("revenueAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderLine_salesOrderId_lineNumber_key" ON "SalesOrderLine"("salesOrderId", "lineNumber");

-- CreateIndex
CREATE INDEX "BankCashTransaction_customerId_idx" ON "BankCashTransaction"("customerId");

-- CreateIndex
CREATE INDEX "CreditNote_customerId_status_noteDate_idx" ON "CreditNote"("customerId", "status", "noteDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_customerId_status_invoiceDate_idx" ON "SalesInvoice"("customerId", "status", "invoiceDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_sourceQuotationId_idx" ON "SalesInvoice"("sourceQuotationId");

-- CreateIndex
CREATE INDEX "SalesInvoice_sourceSalesOrderId_idx" ON "SalesInvoice"("sourceSalesOrderId");

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuotation" ADD CONSTRAINT "SalesQuotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_salesQuotationId_fkey" FOREIGN KEY ("salesQuotationId") REFERENCES "SalesQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "SalesQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "SalesQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_sourceSalesOrderId_fkey" FOREIGN KEY ("sourceSalesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

