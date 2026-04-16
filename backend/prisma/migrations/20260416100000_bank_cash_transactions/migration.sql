-- CreateEnum
CREATE TYPE "BankCashTransactionKind" AS ENUM ('RECEIPT', 'PAYMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "BankCashTransactionStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateTable
CREATE TABLE "BankCashTransaction" (
    "id" TEXT NOT NULL,
    "kind" "BankCashTransactionKind" NOT NULL,
    "status" "BankCashTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "reference" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "counterpartyName" TEXT,
    "bankCashAccountId" TEXT,
    "sourceBankCashAccountId" TEXT,
    "destinationBankCashAccountId" TEXT,
    "counterAccountId" TEXT,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankCashTransaction_reference_key" ON "BankCashTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "BankCashTransaction_journalEntryId_key" ON "BankCashTransaction"("journalEntryId");

-- CreateIndex
CREATE INDEX "BankCashTransaction_kind_status_transactionDate_idx" ON "BankCashTransaction"("kind", "status", "transactionDate");

-- CreateIndex
CREATE INDEX "BankCashTransaction_bankCashAccountId_idx" ON "BankCashTransaction"("bankCashAccountId");

-- CreateIndex
CREATE INDEX "BankCashTransaction_sourceBankCashAccountId_idx" ON "BankCashTransaction"("sourceBankCashAccountId");

-- CreateIndex
CREATE INDEX "BankCashTransaction_destinationBankCashAccountId_idx" ON "BankCashTransaction"("destinationBankCashAccountId");

-- CreateIndex
CREATE INDEX "BankCashTransaction_counterAccountId_idx" ON "BankCashTransaction"("counterAccountId");

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_bankCashAccountId_fkey" FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_sourceBankCashAccountId_fkey" FOREIGN KEY ("sourceBankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_destinationBankCashAccountId_fkey" FOREIGN KEY ("destinationBankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_counterAccountId_fkey" FOREIGN KEY ("counterAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
