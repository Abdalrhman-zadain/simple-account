-- CreateEnum
CREATE TYPE "BankCashAccountType" AS ENUM ('BANK', 'CASH');

-- CreateTable
CREATE TABLE "BankCashAccount" (
    "id" TEXT NOT NULL,
    "type" "BankCashAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankCashAccount_accountId_key" ON "BankCashAccount"("accountId");

-- CreateIndex
CREATE INDEX "BankCashAccount_type_isActive_idx" ON "BankCashAccount"("type", "isActive");

-- AddForeignKey
ALTER TABLE "BankCashAccount" ADD CONSTRAINT "BankCashAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
