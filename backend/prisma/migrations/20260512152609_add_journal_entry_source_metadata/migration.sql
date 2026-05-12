-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "currencyCode" VARCHAR(12),
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceNumber" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalEntry_customerId_idx" ON "JournalEntry"("customerId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
