-- Add purchase debit-note discount account support and purchase policy defaults.

ALTER TABLE "DebitNoteLine"
ADD COLUMN "discountAccountId" TEXT;

CREATE TABLE "PurchasePolicy" (
    "id" TEXT NOT NULL,
    "purchaseDiscountAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebitNoteLine_discountAccountId_idx" ON "DebitNoteLine"("discountAccountId");
CREATE INDEX "PurchasePolicy_purchaseDiscountAccountId_idx" ON "PurchasePolicy"("purchaseDiscountAccountId");

ALTER TABLE "DebitNoteLine"
ADD CONSTRAINT "DebitNoteLine_discountAccountId_fkey"
FOREIGN KEY ("discountAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchasePolicy"
ADD CONSTRAINT "PurchasePolicy_purchaseDiscountAccountId_fkey"
FOREIGN KEY ("purchaseDiscountAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
