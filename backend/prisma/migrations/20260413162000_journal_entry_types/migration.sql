-- CreateTable
CREATE TABLE "JournalEntryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryType_name_key" ON "JournalEntryType"("name");

-- CreateIndex
CREATE INDEX "JournalEntryType_isActive_idx" ON "JournalEntryType"("isActive");

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN "journalEntryTypeId" TEXT;

-- CreateIndex
CREATE INDEX "JournalEntry_journalEntryTypeId_idx" ON "JournalEntry"("journalEntryTypeId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_journalEntryTypeId_fkey" FOREIGN KEY ("journalEntryTypeId") REFERENCES "JournalEntryType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

