ALTER TABLE "PurchaseRequestStatusHistory"
ADD COLUMN "userId" TEXT;

ALTER TABLE "PurchaseInvoice"
ADD COLUMN "sourcePurchaseRequestId" TEXT;

CREATE INDEX "PurchaseRequestStatusHistory_userId_idx"
ON "PurchaseRequestStatusHistory"("userId");

CREATE INDEX "PurchaseInvoice_sourcePurchaseRequestId_idx"
ON "PurchaseInvoice"("sourcePurchaseRequestId");

ALTER TABLE "PurchaseRequestStatusHistory"
ADD CONSTRAINT "PurchaseRequestStatusHistory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
ADD CONSTRAINT "PurchaseInvoice_sourcePurchaseRequestId_fkey"
FOREIGN KEY ("sourcePurchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
