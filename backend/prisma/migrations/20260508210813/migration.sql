-- DropIndex
DROP INDEX "Supplier_paymentTermId_idx";

-- CreateIndex
CREATE INDEX "PaymentTerm_isActive_name_idx" ON "PaymentTerm"("isActive", "name");
