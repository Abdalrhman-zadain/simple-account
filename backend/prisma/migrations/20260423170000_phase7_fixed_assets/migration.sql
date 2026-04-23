-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISPOSED', 'RETIRED');

-- CreateEnum
CREATE TYPE "FixedAssetDepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- CreateEnum
CREATE TYPE "FixedAssetTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FixedAssetDisposalMethod" AS ENUM ('SALE', 'WRITE_OFF', 'SCRAP', 'OTHER');

-- CreateTable
CREATE TABLE "FixedAssetCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assetAccountId" TEXT NOT NULL,
    "accumulatedDepreciationAccountId" TEXT NOT NULL,
    "depreciationExpenseAccountId" TEXT NOT NULL,
    "disposalGainAccountId" TEXT,
    "disposalLossAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "depreciationStartDate" TIMESTAMP(3) NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "depreciationMethod" "FixedAssetDepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "residualValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "acquisitionCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumulatedDepreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bookValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "department" TEXT,
    "costCenter" TEXT,
    "employee" TEXT,
    "location" TEXT,
    "branch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetAcquisition" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FixedAssetTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "assetId" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DECIMAL(18,2) NOT NULL,
    "capitalizedCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "supplierReference" TEXT,
    "purchaseInvoiceReference" TEXT,
    "paymentReference" TEXT,
    "clearingAccountId" TEXT NOT NULL,
    "description" TEXT,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAssetAcquisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetDepreciationRun" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FixedAssetTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "categoryId" TEXT,
    "assetId" TEXT,
    "description" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAssetDepreciationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetDepreciationLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "depreciationAmount" DECIMAL(18,2) NOT NULL,
    "accumulatedBefore" DECIMAL(18,2) NOT NULL,
    "accumulatedAfter" DECIMAL(18,2) NOT NULL,
    "bookValueBefore" DECIMAL(18,2) NOT NULL,
    "bookValueAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FixedAssetDepreciationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetDisposal" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FixedAssetTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "assetId" TEXT NOT NULL,
    "disposalDate" TIMESTAMP(3) NOT NULL,
    "method" "FixedAssetDisposalMethod" NOT NULL,
    "proceedsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disposalExpense" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bookValueAtDisposal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gainLossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "proceedsAccountId" TEXT,
    "description" TEXT,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAssetDisposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAssetTransfer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FixedAssetTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "assetId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "fromDepartment" TEXT,
    "toDepartment" TEXT,
    "fromCostCenter" TEXT,
    "toCostCenter" TEXT,
    "fromEmployee" TEXT,
    "toEmployee" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "fromBranch" TEXT,
    "toBranch" TEXT,
    "reason" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAssetTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedAssetCategory_code_key" ON "FixedAssetCategory"("code");
CREATE INDEX "FixedAssetCategory_isActive_name_idx" ON "FixedAssetCategory"("isActive", "name");
CREATE UNIQUE INDEX "FixedAsset_code_key" ON "FixedAsset"("code");
CREATE INDEX "FixedAsset_categoryId_status_idx" ON "FixedAsset"("categoryId", "status");
CREATE INDEX "FixedAsset_name_idx" ON "FixedAsset"("name");
CREATE UNIQUE INDEX "FixedAssetAcquisition_reference_key" ON "FixedAssetAcquisition"("reference");
CREATE UNIQUE INDEX "FixedAssetAcquisition_journalEntryId_key" ON "FixedAssetAcquisition"("journalEntryId");
CREATE INDEX "FixedAssetAcquisition_assetId_status_acquisitionDate_idx" ON "FixedAssetAcquisition"("assetId", "status", "acquisitionDate");
CREATE UNIQUE INDEX "FixedAssetDepreciationRun_reference_key" ON "FixedAssetDepreciationRun"("reference");
CREATE UNIQUE INDEX "FixedAssetDepreciationRun_journalEntryId_key" ON "FixedAssetDepreciationRun"("journalEntryId");
CREATE INDEX "FixedAssetDepreciationRun_status_periodStart_periodEnd_idx" ON "FixedAssetDepreciationRun"("status", "periodStart", "periodEnd");
CREATE INDEX "FixedAssetDepreciationRun_categoryId_idx" ON "FixedAssetDepreciationRun"("categoryId");
CREATE INDEX "FixedAssetDepreciationRun_assetId_idx" ON "FixedAssetDepreciationRun"("assetId");
CREATE UNIQUE INDEX "FixedAssetDepreciationLine_assetId_runId_key" ON "FixedAssetDepreciationLine"("assetId", "runId");
CREATE INDEX "FixedAssetDepreciationLine_assetId_idx" ON "FixedAssetDepreciationLine"("assetId");
CREATE UNIQUE INDEX "FixedAssetDisposal_reference_key" ON "FixedAssetDisposal"("reference");
CREATE UNIQUE INDEX "FixedAssetDisposal_journalEntryId_key" ON "FixedAssetDisposal"("journalEntryId");
CREATE INDEX "FixedAssetDisposal_assetId_status_disposalDate_idx" ON "FixedAssetDisposal"("assetId", "status", "disposalDate");
CREATE UNIQUE INDEX "FixedAssetTransfer_reference_key" ON "FixedAssetTransfer"("reference");
CREATE INDEX "FixedAssetTransfer_assetId_status_transferDate_idx" ON "FixedAssetTransfer"("assetId", "status", "transferDate");

-- AddForeignKey
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_assetAccountId_fkey" FOREIGN KEY ("assetAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_accumulatedDepreciationAccountId_fkey" FOREIGN KEY ("accumulatedDepreciationAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_depreciationExpenseAccountId_fkey" FOREIGN KEY ("depreciationExpenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_disposalGainAccountId_fkey" FOREIGN KEY ("disposalGainAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetCategory" ADD CONSTRAINT "FixedAssetCategory_disposalLossAccountId_fkey" FOREIGN KEY ("disposalLossAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FixedAssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetAcquisition" ADD CONSTRAINT "FixedAssetAcquisition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetAcquisition" ADD CONSTRAINT "FixedAssetAcquisition_clearingAccountId_fkey" FOREIGN KEY ("clearingAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetAcquisition" ADD CONSTRAINT "FixedAssetAcquisition_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationRun" ADD CONSTRAINT "FixedAssetDepreciationRun_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationLine" ADD CONSTRAINT "FixedAssetDepreciationLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FixedAssetDepreciationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDepreciationLine" ADD CONSTRAINT "FixedAssetDepreciationLine_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDisposal" ADD CONSTRAINT "FixedAssetDisposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDisposal" ADD CONSTRAINT "FixedAssetDisposal_proceedsAccountId_fkey" FOREIGN KEY ("proceedsAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetDisposal" ADD CONSTRAINT "FixedAssetDisposal_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedAssetTransfer" ADD CONSTRAINT "FixedAssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
