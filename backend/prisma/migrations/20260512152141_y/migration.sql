/*
  Warnings:

  - The values [INVENTORY,NON_STOCK] on the enum `InventoryItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InventoryItemType_new" AS ENUM ('RAW_MATERIAL', 'FINISHED_GOOD', 'SERVICE', 'MANUFACTURED_ITEM');
ALTER TABLE "public"."InventoryItem" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "InventoryItem" ALTER COLUMN "type" TYPE "InventoryItemType_new" USING ("type"::text::"InventoryItemType_new");
ALTER TYPE "InventoryItemType" RENAME TO "InventoryItemType_old";
ALTER TYPE "InventoryItemType_new" RENAME TO "InventoryItemType";
DROP TYPE "public"."InventoryItemType_old";
ALTER TABLE "InventoryItem" ALTER COLUMN "type" SET DEFAULT 'FINISHED_GOOD';
COMMIT;
