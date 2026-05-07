-- Phase 5 inventory master-data addendum:
-- item groups, item categories, and units of measure.

CREATE TABLE "InventoryItemGroup" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parentGroupId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "inventoryAccountId" TEXT,
  "cogsAccountId" TEXT,
  "salesAccountId" TEXT,
  "adjustmentAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryItemGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItemCategory" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "itemGroupId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryItemCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryUnitOfMeasure" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unitType" TEXT,
  "decimalPrecision" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryUnitOfMeasure_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryItem"
  ADD COLUMN "unitOfMeasureId" TEXT,
  ADD COLUMN "itemGroupId" TEXT,
  ADD COLUMN "itemCategoryId" TEXT;

CREATE UNIQUE INDEX "InventoryItemGroup_code_key" ON "InventoryItemGroup"("code");
CREATE INDEX "InventoryItemGroup_isActive_name_idx" ON "InventoryItemGroup"("isActive", "name");
CREATE INDEX "InventoryItemGroup_parentGroupId_idx" ON "InventoryItemGroup"("parentGroupId");

CREATE UNIQUE INDEX "InventoryItemCategory_code_key" ON "InventoryItemCategory"("code");
CREATE INDEX "InventoryItemCategory_itemGroupId_isActive_name_idx" ON "InventoryItemCategory"("itemGroupId", "isActive", "name");

CREATE UNIQUE INDEX "InventoryUnitOfMeasure_code_key" ON "InventoryUnitOfMeasure"("code");
CREATE INDEX "InventoryUnitOfMeasure_isActive_name_idx" ON "InventoryUnitOfMeasure"("isActive", "name");

CREATE INDEX "InventoryItem_itemGroupId_itemCategoryId_idx" ON "InventoryItem"("itemGroupId", "itemCategoryId");
CREATE INDEX "InventoryItem_unitOfMeasureId_idx" ON "InventoryItem"("unitOfMeasureId");

ALTER TABLE "InventoryItemGroup"
  ADD CONSTRAINT "InventoryItemGroup_parentGroupId_fkey"
  FOREIGN KEY ("parentGroupId") REFERENCES "InventoryItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemGroup"
  ADD CONSTRAINT "InventoryItemGroup_inventoryAccountId_fkey"
  FOREIGN KEY ("inventoryAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemGroup"
  ADD CONSTRAINT "InventoryItemGroup_cogsAccountId_fkey"
  FOREIGN KEY ("cogsAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemGroup"
  ADD CONSTRAINT "InventoryItemGroup_salesAccountId_fkey"
  FOREIGN KEY ("salesAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemGroup"
  ADD CONSTRAINT "InventoryItemGroup_adjustmentAccountId_fkey"
  FOREIGN KEY ("adjustmentAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItemCategory"
  ADD CONSTRAINT "InventoryItemCategory_itemGroupId_fkey"
  FOREIGN KEY ("itemGroupId") REFERENCES "InventoryItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_unitOfMeasureId_fkey"
  FOREIGN KEY ("unitOfMeasureId") REFERENCES "InventoryUnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_itemGroupId_fkey"
  FOREIGN KEY ("itemGroupId") REFERENCES "InventoryItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_itemCategoryId_fkey"
  FOREIGN KEY ("itemCategoryId") REFERENCES "InventoryItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
