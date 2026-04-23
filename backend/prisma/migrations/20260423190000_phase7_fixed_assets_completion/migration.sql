-- AlterTable
ALTER TABLE "FixedAssetAcquisition" ADD COLUMN "reversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FixedAssetDepreciationRun" ADD COLUMN "reversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FixedAssetDisposal" ADD COLUMN "disposalExpenseAccountId" TEXT,
ADD COLUMN "reversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FixedAssetTransfer" ADD COLUMN "reversedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "FixedAssetDisposal" ADD CONSTRAINT "FixedAssetDisposal_disposalExpenseAccountId_fkey"
FOREIGN KEY ("disposalExpenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
