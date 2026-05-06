-- Sales representatives are operational sales/collection owners, separate from customer receivable accounts.
CREATE TYPE "SalesRepStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "SalesRepresentative" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "defaultCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "employeeReceivableAccountId" TEXT,
    "status" "SalesRepStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRepresentative_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Customer" ADD COLUMN "salesRepId" TEXT;

CREATE UNIQUE INDEX "SalesRepresentative_code_key" ON "SalesRepresentative"("code");
CREATE INDEX "SalesRepresentative_status_name_idx" ON "SalesRepresentative"("status", "name");
CREATE INDEX "SalesRepresentative_employeeReceivableAccountId_idx" ON "SalesRepresentative"("employeeReceivableAccountId");
CREATE INDEX "Customer_salesRepId_idx" ON "Customer"("salesRepId");

ALTER TABLE "SalesRepresentative"
  ADD CONSTRAINT "SalesRepresentative_employeeReceivableAccountId_fkey"
  FOREIGN KEY ("employeeReceivableAccountId") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_salesRepId_fkey"
  FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
