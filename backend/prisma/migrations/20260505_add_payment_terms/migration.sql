-- CreateEnum for DueDateCalculationMethod
CREATE TYPE "DueDateCalculationMethod" AS ENUM ('IMMEDIATE', 'DAYS_AFTER', 'END_OF_MONTH', 'MANUAL');

-- CreateTable PaymentTerm
CREATE TABLE "PaymentTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "calculationMethod" "DueDateCalculationMethod" NOT NULL DEFAULT 'DAYS_AFTER',
    "numberOfDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- AddColumn paymentTermId to Supplier
ALTER TABLE "Supplier" ADD COLUMN "paymentTermId" TEXT;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_name_key" ON "PaymentTerm"("name");
CREATE INDEX "Supplier_paymentTermId_idx" ON "Supplier"("paymentTermId");
