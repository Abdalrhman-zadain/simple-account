-- AlterTable
ALTER TABLE "Account"
ADD COLUMN "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "JournalEntry"
ADD COLUMN "reversalOfId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_key" ON "JournalEntry"("reversalOfId");

-- AddForeignKey
ALTER TABLE "JournalEntry"
ADD CONSTRAINT "JournalEntry_reversalOfId_fkey"
FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
