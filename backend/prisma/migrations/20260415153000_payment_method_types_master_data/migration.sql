CREATE TABLE "PaymentMethodType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMethodType_name_key" ON "PaymentMethodType"("name");
CREATE INDEX "PaymentMethodType_isActive_idx" ON "PaymentMethodType"("isActive");

INSERT INTO "PaymentMethodType" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Bank', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Cash', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "PaymentMethodType" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, DISTINCT_TYPES."type", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("type") AS "type"
  FROM "BankCashAccount"
  WHERE TRIM("type") <> ''
) AS DISTINCT_TYPES
ON CONFLICT ("name") DO NOTHING;
