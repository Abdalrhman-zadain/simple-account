-- CreateTable
CREATE TABLE "TaxTreatment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "arabicName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "description" TEXT,
    "defaultTaxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxTreatment_code_key" ON "TaxTreatment"("code");

-- CreateIndex
CREATE INDEX "TaxTreatment_isActive_code_idx" ON "TaxTreatment"("isActive", "code");

-- CreateIndex
CREATE INDEX "TaxTreatment_defaultTaxId_idx" ON "TaxTreatment"("defaultTaxId");

-- Seed default tax treatments
INSERT INTO "TaxTreatment" ("id", "code", "arabicName", "englishName", "description", "defaultTaxId", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'tt_taxable',
    'TAXABLE',
    'خاضع للضريبة',
    'Taxable',
    'Default taxable sales treatment.',
    (SELECT "id" FROM "Tax" WHERE "taxCode" = 'VAT16' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tt_zero_rated',
    'ZERO_RATED',
    'نسبة صفرية',
    'Zero-rated',
    'Zero-rated sales treatment.',
    (SELECT "id" FROM "Tax" WHERE "taxCode" = 'VAT0' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tt_exempt',
    'EXEMPT',
    'معفى',
    'Exempt',
    'Exempt sales treatment.',
    (SELECT "id" FROM "Tax" WHERE "taxCode" = 'EXEMPT' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tt_out_of_scope',
    'OUT_OF_SCOPE',
    'خارج نطاق الضريبة',
    'Out of Scope',
    'Out of scope sales treatment with no default tax.',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tt_reverse_charge',
    'REVERSE_CHARGE',
    'توريد عكسي',
    'Reverse Charge',
    'Reverse charge treatment. Default tax can be configured later if needed.',
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "taxTreatmentId" TEXT;

-- Backfill existing customers with TAXABLE by default
UPDATE "Customer"
SET "taxTreatmentId" = (
    SELECT "id"
    FROM "TaxTreatment"
    WHERE "code" = 'TAXABLE'
    LIMIT 1
)
WHERE "taxTreatmentId" IS NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "taxTreatmentId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Customer_taxTreatmentId_idx" ON "Customer"("taxTreatmentId");

-- AddForeignKey
ALTER TABLE "TaxTreatment"
ADD CONSTRAINT "TaxTreatment_defaultTaxId_fkey"
FOREIGN KEY ("defaultTaxId") REFERENCES "Tax"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_taxTreatmentId_fkey"
FOREIGN KEY ("taxTreatmentId") REFERENCES "TaxTreatment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
