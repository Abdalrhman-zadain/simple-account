-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BankStatementLineStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'RECONCILED');

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankCashAccountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementEndingBalance" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementLine" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "debitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "BankStatementLineStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationMatch" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "statementLineId" TEXT NOT NULL,
    "ledgerTransactionId" TEXT NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciledAt" TIMESTAMP(3),

    CONSTRAINT "BankReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankReconciliation_bankCashAccountId_status_statementDate_idx" ON "BankReconciliation"("bankCashAccountId", "status", "statementDate");

-- CreateIndex
CREATE INDEX "BankStatementLine_reconciliationId_status_transactionDate_idx" ON "BankStatementLine"("reconciliationId", "status", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliationMatch_statementLineId_ledgerTransactionId_key" ON "BankReconciliationMatch"("statementLineId", "ledgerTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_reconciliationId_idx" ON "BankReconciliationMatch"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_ledgerTransactionId_idx" ON "BankReconciliationMatch"("ledgerTransactionId");

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankCashAccountId_fkey" FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "BankStatementLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
